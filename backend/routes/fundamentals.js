import express from 'express';

const router = express.Router();

// ── CORS ───────────────────────────────────────────────────────────────────
router.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.sendStatus(200);
  next();
});

// ── Config ─────────────────────────────────────────────────────────────────
// SEC requires a User-Agent identifying you. CHANGE THE EMAIL to yours.
const SEC_UA = 'AIFMI research app (priteshnakra@gmail.com)';
const DAY = 24 * 60 * 60 * 1000;

let tickerMapCache = { ts: 0, map: null };
const fundamentalsCache = new Map();
const analysisCache = new Map();

async function getCik(ticker) {
  if (!tickerMapCache.map || Date.now() - tickerMapCache.ts > DAY) {
    const r = await fetch('https://www.sec.gov/files/company_tickers.json', {
      headers: { 'User-Agent': SEC_UA },
    });
    if (!r.ok) throw new Error(`SEC ticker map fetch failed: ${r.status}`);
    const raw = await r.json();
    const map = {};
    for (const row of Object.values(raw)) map[row.ticker.toUpperCase()] = row.cik_str;
    tickerMapCache = { ts: Date.now(), map };
  }
  return tickerMapCache.map[ticker.toUpperCase()] ?? null;
}

// ── XBRL tag fallbacks (us-gaap first, then ifrs-full) ─────────────────────
const TAGS = {
  revenue: ['Revenues', 'RevenueFromContractWithCustomerExcludingAssessedTax', 'RevenueFromContractWithCustomerIncludingAssessedTax', 'SalesRevenueNet', 'Revenue'],
  grossProfit: ['GrossProfit'],
  operatingIncome: ['OperatingIncomeLoss', 'ProfitLossFromOperatingActivities'],
  netIncome: ['NetIncomeLoss', 'ProfitLoss'],
  rd: ['ResearchAndDevelopmentExpense'],
  sga: ['SellingGeneralAndAdministrativeExpense'],
  depAmort: ['DepreciationDepletionAndAmortization', 'DepreciationAndAmortization', 'DepreciationAmortizationAndAccretionNet', 'Depreciation', 'DepreciationAmortisationAndImpairmentLossReversalOfImpairmentLossRecognisedInProfitOrLoss'],
  assets: ['Assets'],
  currentAssets: ['AssetsCurrent', 'CurrentAssets'],
  liabilities: ['Liabilities'],
  currentLiabilities: ['LiabilitiesCurrent', 'CurrentLiabilities'],
  equity: ['StockholdersEquity', 'StockholdersEquityIncludingPortionAttributableToNoncontrollingInterest', 'Equity'],
  cash: ['CashAndCashEquivalentsAtCarryingValue', 'CashAndCashEquivalents'],
  marketableSecurities: ['MarketableSecuritiesCurrent', 'ShortTermInvestments', 'AvailableForSaleSecuritiesDebtSecuritiesCurrent', 'OtherShortTermInvestments', 'CurrentInvestments'],
  longTermDebt: ['LongTermDebtNoncurrent', 'LongTermDebt', 'NoncurrentPortionOfNoncurrentBorrowings'],
  currentDebt: ['LongTermDebtCurrent', 'DebtCurrent', 'ShortTermBorrowings', 'CurrentPortionOfNoncurrentBorrowings'],
  receivables: ['AccountsReceivableNetCurrent', 'ReceivablesNetCurrent', 'AccountsAndOtherReceivablesNetCurrent', 'AccountsNotesAndLoansReceivableNetCurrent', 'TradeAndOtherCurrentReceivables'],
  payables: ['AccountsPayableCurrent', 'AccountsPayableAndAccruedLiabilitiesCurrent', 'TradeAndOtherCurrentPayables'],
  inventory: ['InventoryNet', 'Inventories'],
  goodwill: ['Goodwill'],
  operatingCashFlow: ['NetCashProvidedByUsedInOperatingActivities', 'CashFlowsFromUsedInOperatingActivities'],
  capex: ['PaymentsToAcquirePropertyPlantAndEquipment', 'PurchaseOfPropertyPlantAndEquipment'],
  investingCashFlow: ['NetCashProvidedByUsedInInvestingActivities', 'CashFlowsFromUsedInInvestingActivities'],
  financingCashFlow: ['NetCashProvidedByUsedInFinancingActivities', 'CashFlowsFromUsedInFinancingActivities'],
};

function annualSeries(facts, tagList) {
  for (const taxonomy of ['us-gaap', 'ifrs-full']) {
    const tax = facts[taxonomy];
    if (!tax) continue;
    for (const tag of tagList) {
      const concept = tax[tag];
      if (!concept?.units) continue;
      const unitKey = Object.keys(concept.units)[0];
      const rows = concept.units[unitKey]
        .filter(r => r.fp === 'FY' && (r.form?.includes('10-K') || r.form?.includes('20-F') || r.form?.includes('40-F')))
        .filter(r => !r.start || (new Date(r.end) - new Date(r.start)) > 300 * DAY);
      if (!rows.length) continue;
      const byYear = new Map();
      for (const r of rows) {
        const prev = byYear.get(r.fy);
        // prefer the most recently FILED value for a fiscal year (catches amendments/restatements)
        if (!prev || (r.filed ?? '') > (prev.filed ?? '')) byYear.set(r.fy, r);
      }
      return [...byYear.values()]
        .sort((a, b) => b.fy - a.fy)
        .map(r => ({ fy: r.fy, end: r.end, val: r.val, unit: unitKey, form: r.form, filed: r.filed, accn: r.accn }));
    }
  }
  return [];
}

const latest = (s) => s[0]?.val ?? null;
const prior = (s) => s[1]?.val ?? null;
const round2 = (n) => n == null ? null : Math.round(n * 100) / 100;
const pct = (n) => n == null ? null : Math.round(n * 10000) / 100;

// average of latest & prior year balance; falls back to year-end with basis label
function avgBalance(s) {
  const a = latest(s), b = prior(s);
  if (a != null && b != null) return { val: (a + b) / 2, basis: 'average of beginning and ending balances' };
  if (a != null) return { val: a, basis: 'year-end balance (prior-year value unavailable)' };
  return { val: null, basis: null };
}

async function getFundamentals(ticker) {
  const hit = fundamentalsCache.get(ticker);
  if (hit && Date.now() - hit.ts < DAY) return hit.data;

  const cik = await getCik(ticker);
  if (!cik) return { available: false, reason: 'not_sec_filer', ticker };

  const url = `https://data.sec.gov/api/xbrl/companyfacts/CIK${String(cik).padStart(10, '0')}.json`;
  const r = await fetch(url, { headers: { 'User-Agent': SEC_UA } });
  if (!r.ok) return { available: false, reason: `edgar_${r.status}`, ticker };
  const body = await r.json();
  const facts = body.facts ?? {};

  const s = {};
  for (const [k, tags] of Object.entries(TAGS)) s[k] = annualSeries(facts, tags);

  const rev = latest(s.revenue), revPrior = prior(s.revenue);
  const ni = latest(s.netIncome), op = latest(s.operatingIncome);
  const gp = latest(s.grossProfit), da = latest(s.depAmort);
  const assets = latest(s.assets), curA = latest(s.currentAssets), curL = latest(s.currentLiabilities);
  const eq = latest(s.equity), debt = latest(s.longTermDebt);
  const cash = latest(s.cash), mktSec = latest(s.marketableSecurities);
  const ar = latest(s.receivables), arPrior = prior(s.receivables);
  const ap = latest(s.payables);
  const ocf = latest(s.operatingCashFlow), capex = latest(s.capex);
  const cogs = (rev != null && gp != null) ? rev - gp : null;

  // filing provenance (from the primary revenue/assets fact row)
  const primary = s.revenue[0] ?? s.assets[0] ?? null;
  const filing = primary ? {
    form: primary.form,
    filedDate: primary.filed,
    accession: primary.accn,
    amended: (primary.form ?? '').includes('/A'),
    url: primary.accn ? `https://www.sec.gov/Archives/edgar/data/${cik}/${primary.accn.replace(/-/g, '')}` : null,
  } : null;

  // returns on average balances with NM guards → flat values + basis strings
  function flatReturn(numerator, denomSeries) {
    const { val: denom, basis } = avgBalance(denomSeries);
    const beginning = prior(denomSeries);
    if (numerator == null || denom == null) return { v: null, basis: null };
    if (denom <= 0 || (beginning != null && beginning <= 0)) {
      return { v: 'NM', basis: 'not meaningful: capital base was negative or changed drastically during the year' };
    }
    return { v: pct(numerator / denom), basis };
  }
  const roe = flatReturn(ni, s.equity);
  const roa = flatReturn(ni, s.assets);
  const ceSeries = s.assets.map(row => {
    const cl = s.currentLiabilities.find(x => x.fy === row.fy);
    return cl ? { ...row, val: row.val - cl.val } : null;
  }).filter(Boolean);
  const roce = flatReturn(op, ceSeries);

  // liquidity
  const stInvestments = latest(s.marketableSecurities);
  const currentDebtVal = latest(s.currentDebt);
  const totalLiquid = (cash != null || stInvestments != null) ? (cash ?? 0) + (stInvestments ?? 0) : null;
  const totalDebt = (debt != null || currentDebtVal != null) ? (debt ?? 0) + (currentDebtVal ?? 0) : null;
  const netCash = (totalLiquid != null && totalDebt != null) ? totalLiquid - totalDebt : null;

  // EBITDA (derived) — never silently blank
  const ebitdaVal = (op != null && da != null) ? op + da : null;
  const ebitdaNote = ebitdaVal != null
    ? 'operating income + D&A'
    : (op == null ? 'operating income not in structured data' : 'D&A not in structured filing data (some filers disclose it only in footnotes)');

  // revenue growth + low-base flag
  const revenueGrowthPct = (rev != null && revPrior != null && Math.abs(revPrior) > 0)
    ? pct((rev - revPrior) / Math.abs(revPrior)) : null;
  const revenueGrowthLowBase = revenueGrowthPct != null && Math.abs(revPrior) < 10e6;

  // receivable days on average balances
  let receivableDays = null, receivableBasis = null;
  if (ar != null && rev) {
    const arAvg = arPrior != null ? (ar + arPrior) / 2 : ar;
    receivableDays = Math.round((arAvg / rev) * 365);
    receivableBasis = arPrior != null ? 'avg receivables; distorted if sales are Q4-heavy' : 'year-end receivables';
  }
  const payableDays = (ap != null && (cogs || rev)) ? Math.round((ap / (cogs || rev)) * 365) : null;

  const debtToEquity = (totalDebt != null && eq != null)
    ? (eq <= 0 ? 'NM' : round2(totalDebt / eq)) : null;

  const data = {
    available: true,
    schema: 2,
    ticker,
    company: body.entityName,
    fiscalYear: primary?.fy ?? null,
    periodEnd: primary?.end ?? null,
    currency: primary?.unit ?? 'USD',
    filing,
    source: 'SEC EDGAR company filings',

    statements: {
      revenue: rev, grossProfit: gp, operatingIncome: op, netIncome: ni,
      rdExpense: latest(s.rd), sgaExpense: latest(s.sga), depAmort: da,
      totalAssets: assets, currentAssets: curA, totalLiabilities: latest(s.liabilities),
      currentLiabilities: curL, equity: eq,
      cash, stInvestments, totalLiquid,
      longTermDebt: debt, currentDebt: currentDebtVal, totalDebt, netCash,
      ebitda: ebitdaVal, ebitdaNote,
      receivables: ar, payables: ap, inventory: latest(s.inventory), goodwill: latest(s.goodwill),
      operatingCashFlow: ocf, capex,
      freeCashFlow: (ocf != null && capex != null) ? ocf - capex : null,
      investingCashFlow: latest(s.investingCashFlow), financingCashFlow: latest(s.financingCashFlow),
    },

    ratios: {
      grossMarginPct: pct(gp != null && rev ? gp / rev : null),
      operatingMarginPct: pct(op != null && rev ? op / rev : null),
      netMarginPct: pct(ni != null && rev ? ni / rev : null),
      roePct: roe.v, roeBasis: roe.basis,
      roaPct: roa.v, roaBasis: roa.basis,
      rocePct: roce.v, roceBasis: roce.basis,
      debtToEquity,
      currentRatio: (curA != null && curL) ? round2(curA / curL) : null,
      workingCapital: (curA != null && curL != null) ? curA - curL : null,
      receivableDays, receivableBasis,
      payableDays, payableBasis: payableDays != null ? (cogs ? 'vs cost of goods sold' : 'vs revenue (COGS unavailable)') : null,
      rdPctOfRevenue: pct(latest(s.rd) != null && rev ? latest(s.rd) / rev : null),
      goodwillPctOfAssets: pct(latest(s.goodwill) != null && assets ? latest(s.goodwill) / assets : null),
      revenueGrowthPct, revenueGrowthLowBase, revenuePrior: revPrior,
      fcfToRevenuePct: (ocf != null && capex != null && rev) ? pct((ocf - capex) / rev) : null,
      netIncomeGrowthPct: (ni != null && prior(s.netIncome)) ? pct((ni - prior(s.netIncome)) / Math.abs(prior(s.netIncome))) : null,
    },

    formulas: {
      ebitda: 'Operating income + depreciation & amortization (derived; not company-reported adjusted EBITDA)',
      revenueGrowth: '(Current FY revenue − prior FY revenue) ÷ prior FY revenue',
      roe: 'Net income ÷ average shareholders\u2019 equity (beginning + ending ÷ 2)',
      roa: 'Net income ÷ average total assets',
      roce: 'Operating income ÷ average capital employed (total assets − current liabilities)',
      netCash: 'Cash + short-term investments − total interest-bearing debt',
      debtToEquity: 'Total interest-bearing debt ÷ shareholders\u2019 equity (year-end); excludes leases, warrants, earnouts',
      currentRatio: 'Current assets ÷ current liabilities (year-end)',
      workingCapital: 'Current assets − current liabilities',
      freeCashFlow: 'Operating cash flow − purchases of property, plant & equipment',
      receivableDays: 'Average receivables ÷ revenue × 365',
      payableDays: 'Accounts payable ÷ COGS (or revenue if COGS unavailable) × 365',
    },

    trend: {
      revenue: s.revenue.slice(0, 4).map(({ fy, end, val }) => ({ fy, end, val })),
      netIncome: s.netIncome.slice(0, 4).map(({ fy, end, val }) => ({ fy, end, val })),
      operatingCashFlow: s.operatingCashFlow.slice(0, 4).map(({ fy, end, val }) => ({ fy, end, val })),
    },
  };

  fundamentalsCache.set(ticker, { ts: Date.now(), data });
  return data;
}

router.get('/:ticker', async (req, res) => {
  try {
    res.json(await getFundamentals(req.params.ticker));
  } catch (err) {
    console.error('Fundamentals error:', err);
    res.status(500).json({ error: err.message });
  }
});

// ── AI analysis with grounding rules ───────────────────────────────────────
const GROUNDING_RULES = `HARD RULES — violating any of these makes the output unusable:
1. Use ONLY the figures provided. Never invent numbers, peer benchmarks, industry averages, or historical comparisons that are not in the provided data.
2. Never claim information is "missing from the filing" or "not disclosed" — you only see an extract, not the filing. If a field is null, say it is "not available in the structured data provided."
3. Never use the words: insolvent, insolvency, bankrupt, bankruptcy, fraud, guaranteed, certain, "almost certain", inevitable. Never state that financing, dilution, or failure WILL happen — frame these as conditional risks ("appears likely unless...", "may be required if...").
4. Separate fact from interpretation from prediction. State the number first, then the interpretation, then any forward risk as an explicit conditional.
5. If a ratio is marked nm=true, do not use its value; explain in plain language why it is not meaningful (e.g., equity base was negative or changed drastically).
6. If revenue growth is marked lowBase=true, always state the absolute base ("from $X to $Y") and note the percentage reflects a small starting base.
7. Runway estimates must be phrased as static estimates: "year-end cash equalled approximately N months of FY operating cash burn at an unchanged burn rate" — never as a prediction of when cash runs out.
8. If revenue is positive and material, do not describe the company as "pre-commercial" or "pre-revenue."
9. Do not editorialize with words like extraordinary, fortress, existential, staggering. State magnitudes plainly and let the numbers carry the weight.`;

const SECTION_PROMPTS = {
  financials: (ctx, fin) => `You are a senior equity analyst. Assess the financial health of ${ctx.name} (${ctx.ticker}) using ONLY the audited figures below, extracted from SEC filings (FY${fin.fiscalYear}${fin.filing?.amended ? ', amended filing' : ''}).

${GROUNDING_RULES}

FILED FIGURES (${fin.currency}):
${JSON.stringify({ statements: fin.statements, ratios: fin.ratios, formulas: fin.formulas, revenueTrend: fin.trend.revenue }, null, 1)}

Return ONLY valid JSON:
{
  "verdict": "STRONG|HEALTHY|MIXED|STRAINED",
  "summary": "3-4 sentences: overall financial condition. Facts first, interpretation second.",
  "profitability": "2-3 sentences on margins and cost control. If net margin is negative, quantify the loss relative to revenue rather than using dramatic adjectives.",
  "balanceSheet": "2-3 sentences on liquidity and leverage. Use totalCashAndInvestments (not just cash) when discussing liquidity.",
  "cashConversion": "2-3 sentences on cash generation and receivable/payable timing. Respect the receivableDaysMeta caution if present.",
  "capitalAllocation": "2-3 sentences on where money goes: capex, R&D intensity, goodwill. Note: absence of goodwill does NOT by itself establish that growth was organic.",
  "returns": "1-2 sentences interpreting ROE/ROA/ROCE, respecting any nm flags and stating the balance basis used.",
  "watchItems": ["specific, evidence-tied concern 1", "concern 2", "concern 3"]
}`,

  industry: (ctx) => `You are an industry strategist. Analyze the industry that ${ctx.name} (${ctx.ticker ?? 'private'}) operates in: ${ctx.sector} — specifically ${ctx.spec}.

Rules: distinguish established facts from your assessments; avoid absolute predictions; no invented statistics — describe magnitudes qualitatively unless you are confident of a figure.

Return ONLY valid JSON:
{
  "verdict": "SUNRISE|MATURE|STAGNANT|SUNSET",
  "summary": "3-4 sentences on the state and trajectory of this industry",
  "sizeAndGrowth": "2-3 sentences: rough market size, expected growth, scalability",
  "cyclicality": "2-3 sentences: how cyclical, how sharp the downturns, where we are in the cycle",
  "regulation": "2-3 sentences: how government regulation (export controls, subsidies, antitrust, trade policy) affects companies like this",
  "threats": ["structural threat 1", "structural threat 2", "structural threat 3"]
}`,

  product: (ctx) => `You are a competitive-strategy analyst. Assess the product position and competitive advantage ("right to win") of ${ctx.name} (${ctx.ticker ?? 'private'}), which builds: ${ctx.spec} (${ctx.sector} sector).

Rules: distinguish facts from assessment; avoid absolutes; no invented market-share figures.

Return ONLY valid JSON:
{
  "verdict": "LEADER|CHALLENGER|NICHE|COMMODITY",
  "summary": "3-4 sentences on whether this company has a durable right to win",
  "moat": "2-3 sentences: what protects them and how durable it is",
  "competition": "2-3 sentences: intensity, number of credible players, effect on margins",
  "commoditization": "2-3 sentences: differentiated or commodity; is loyalty real or price-driven",
  "shapingTheFuture": "2-3 sentences: shaping the industry or following"
}`,

  management: (ctx) => `You are a governance analyst. Assess the leadership of ${ctx.name} (${ctx.ticker ?? 'private'}) using only publicly documented information. Do NOT speculate about character or make unverifiable claims about individuals; where information is not publicly established, say so plainly.

Return ONLY valid JSON:
{
  "verdict": "PROVEN|CAPABLE|UNTESTED|CONCERNS",
  "summary": "3-4 sentences on the overall caliber of the team",
  "leadership": "2-3 sentences on the CEO and key executives: backgrounds, track record",
  "structure": "2-3 sentences: founder-led vs professional, stability, tenure",
  "customerFocus": "2-3 sentences: evidence from public strategy that they solve a real problem",
  "governanceNotes": "1-2 sentences on publicly documented governance strengths or red flags; say 'no notable public red flags' if none are documented"
}`,
};

router.get('/:ticker/analysis/:section', async (req, res) => {
  const { ticker, section } = req.params;
  if (!SECTION_PROMPTS[section]) return res.status(400).json({ error: 'unknown section' });

  const key = `${ticker}:${section}:v2`;
  const hit = analysisCache.get(key);
  if (hit && Date.now() - hit.ts < DAY) return res.json(hit.data);

  const ctx = {
    ticker,
    name: req.query.name ?? ticker,
    spec: req.query.spec ?? '',
    sector: req.query.sector ?? '',
    hq: req.query.hq ?? '',
  };

  try {
    let fin = null;
    if (section === 'financials') {
      fin = await getFundamentals(ticker);
      if (!fin.available) {
        return res.json({ available: false, reason: fin.reason,
          note: 'This company does not file with the SEC, so audited filing data is unavailable. Metrics shown elsewhere come from market data providers.' });
      }
    }

    const prompt = SECTION_PROMPTS[section](ctx, fin);
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': process.env.ANTHROPIC_API_KEY ?? '',
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-6',
        max_tokens: 1200,
        messages: [{ role: 'user', content: prompt }],
      }),
    });

    const data = await response.json();
    if (!response.ok) {
      console.error('Claude API error:', response.status, JSON.stringify(data));
      return res.status(502).json({ error: data?.error?.message ?? 'AI service error' });
    }

    const raw = data.content?.[0]?.text ?? '';
    let parsed;
    try {
      parsed = JSON.parse(raw.replace(/```json|```/g, '').trim());
    } catch {
      return res.status(502).json({ error: 'Failed to parse AI response' });
    }

    const result = { available: true, section, ticker, analysis: parsed, generatedAt: new Date().toISOString() };
    analysisCache.set(key, { ts: Date.now(), data: result });
    res.json(result);
  } catch (err) {
    console.error(`Analysis error (${section}):`, err);
    res.status(500).json({ error: err.message });
  }
});

export default router;