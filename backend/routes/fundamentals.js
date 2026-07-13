import express from 'express';

const router = express.Router();

// ── CORS (same policy as intelligence.js) ──────────────────────────────────
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

// ── Caches (in-memory; resets on redeploy, which is fine) ──────────────────
let tickerMapCache = { ts: 0, map: null };          // ticker -> CIK
const fundamentalsCache = new Map();                 // ticker -> { ts, data }
const analysisCache = new Map();                     // ticker:section -> { ts, data }

// ── Ticker → CIK ───────────────────────────────────────────────────────────
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

// ── XBRL concept extraction ────────────────────────────────────────────────
// Companies tag the same idea differently (and foreign filers use IFRS tags),
// so every metric has a fallback list. First tag that exists wins.
const TAGS = {
  revenue: ['Revenues', 'RevenueFromContractWithCustomerExcludingAssessedTax', 'RevenueFromContractWithCustomerIncludingAssessedTax', 'SalesRevenueNet', 'Revenue'],
  grossProfit: ['GrossProfit'],
  operatingIncome: ['OperatingIncomeLoss', 'ProfitLossFromOperatingActivities'],
  netIncome: ['NetIncomeLoss', 'ProfitLoss'],
  rd: ['ResearchAndDevelopmentExpense'],
  sga: ['SellingGeneralAndAdministrativeExpense'],
  depAmort: ['DepreciationDepletionAndAmortization', 'DepreciationAndAmortization', 'DepreciationAmortisationAndImpairmentLossReversalOfImpairmentLossRecognisedInProfitOrLoss'],
  assets: ['Assets'],
  currentAssets: ['AssetsCurrent', 'CurrentAssets'],
  liabilities: ['Liabilities'],
  currentLiabilities: ['LiabilitiesCurrent', 'CurrentLiabilities'],
  equity: ['StockholdersEquity', 'StockholdersEquityIncludingPortionAttributableToNoncontrollingInterest', 'Equity'],
  cash: ['CashAndCashEquivalentsAtCarryingValue', 'CashAndCashEquivalents'],
  longTermDebt: ['LongTermDebtNoncurrent', 'LongTermDebt', 'NoncurrentPortionOfNoncurrentBorrowings'],
  receivables: ['AccountsReceivableNetCurrent', 'ReceivablesNetCurrent', 'TradeAndOtherCurrentReceivables'],
  payables: ['AccountsPayableCurrent', 'AccountsPayableAndAccruedLiabilitiesCurrent', 'TradeAndOtherCurrentPayables'],
  inventory: ['InventoryNet', 'Inventories'],
  goodwill: ['Goodwill'],
  operatingCashFlow: ['NetCashProvidedByUsedInOperatingActivities', 'CashFlowsFromUsedInOperatingActivities'],
  capex: ['PaymentsToAcquirePropertyPlantAndEquipment', 'PurchaseOfPropertyPlantAndEquipment'],
  investingCashFlow: ['NetCashProvidedByUsedInInvestingActivities', 'CashFlowsFromUsedInInvestingActivities'],
  financingCashFlow: ['NetCashProvidedByUsedInFinancingActivities', 'CashFlowsFromUsedInFinancingActivities'],
};

// Pull annual (FY) values for a concept: returns [{ fy, end, val }] newest first
function annualSeries(facts, tagList) {
  for (const taxonomy of ['us-gaap', 'ifrs-full']) {
    const tax = facts[taxonomy];
    if (!tax) continue;
    for (const tag of tagList) {
      const concept = tax[tag];
      if (!concept?.units) continue;
      // take the first monetary unit available (USD, TWD, EUR, ...)
      const unitKey = Object.keys(concept.units)[0];
      const rows = concept.units[unitKey]
        .filter(r => r.fp === 'FY' && (r.form?.includes('10-K') || r.form?.includes('20-F') || r.form?.includes('40-F')))
        // annual flow values span ~a year; balance values are instants (no start)
        .filter(r => !r.start || (new Date(r.end) - new Date(r.start)) > 300 * DAY);
      if (!rows.length) continue;
      const byYear = new Map();
      for (const r of rows) {
        const prev = byYear.get(r.fy);
        if (!prev || new Date(r.end) > new Date(prev.end)) byYear.set(r.fy, r);
      }
      return [...byYear.values()]
        .sort((a, b) => b.fy - a.fy)
        .map(r => ({ fy: r.fy, end: r.end, val: r.val, unit: unitKey }));
    }
  }
  return [];
}

const latest = (s) => s[0]?.val ?? null;
const prior = (s) => s[1]?.val ?? null;
const pct = (n) => n == null ? null : Math.round(n * 10000) / 100;   // 0.0834 -> 8.34
const ratio = (n) => n == null ? null : Math.round(n * 100) / 100;
const div = (a, b) => (a == null || !b) ? null : a / b;
const growth = (s) => (latest(s) != null && prior(s)) ? pct((latest(s) - prior(s)) / Math.abs(prior(s))) : null;

// ── Build the fundamentals payload from EDGAR ──────────────────────────────
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

  const rev = latest(s.revenue), ni = latest(s.netIncome), op = latest(s.operatingIncome);
  const gp = latest(s.grossProfit), da = latest(s.depAmort);
  const assets = latest(s.assets), curA = latest(s.currentAssets), curL = latest(s.currentLiabilities);
  const eq = latest(s.equity), debt = latest(s.longTermDebt);
  const ar = latest(s.receivables), ap = latest(s.payables);
  const ocf = latest(s.operatingCashFlow), capex = latest(s.capex);
  const cogs = (rev != null && gp != null) ? rev - gp : null;

  const data = {
    available: true,
    ticker,
    company: body.entityName,
    fiscalYear: s.revenue[0]?.fy ?? s.assets[0]?.fy ?? null,
    periodEnd: s.revenue[0]?.end ?? s.assets[0]?.end ?? null,
    currency: s.revenue[0]?.unit ?? s.assets[0]?.unit ?? 'USD',
    source: 'SEC EDGAR company filings (10-K / 20-F)',

    statements: {
      revenue: rev, grossProfit: gp, operatingIncome: op, netIncome: ni,
      rdExpense: latest(s.rd), sgaExpense: latest(s.sga),
      totalAssets: assets, currentAssets: curA, totalLiabilities: latest(s.liabilities),
      currentLiabilities: curL, equity: eq, cash: latest(s.cash), longTermDebt: debt,
      receivables: ar, payables: ap, inventory: latest(s.inventory), goodwill: latest(s.goodwill),
      operatingCashFlow: ocf, capex, freeCashFlow: (ocf != null && capex != null) ? ocf - capex : ocf,
      investingCashFlow: latest(s.investingCashFlow), financingCashFlow: latest(s.financingCashFlow),
      ebitda: (op != null && da != null) ? op + da : null,
    },

    ratios: {
      grossMarginPct: pct(div(gp, rev)),
      operatingMarginPct: pct(div(op, rev)),
      netMarginPct: pct(div(ni, rev)),
      roePct: pct(div(ni, eq)),
      roaPct: pct(div(ni, assets)),
      rocePct: (op != null && assets != null && curL != null) ? pct(op / (assets - curL)) : null,
      debtToEquity: ratio(div(debt, eq)),
      currentRatio: ratio(div(curA, curL)),
      workingCapital: (curA != null && curL != null) ? curA - curL : null,
      receivableDays: (ar != null && rev) ? Math.round((ar / rev) * 365) : null,
      payableDays: (ap != null && (cogs || rev)) ? Math.round((ap / (cogs || rev)) * 365) : null,
      rdPctOfRevenue: pct(div(latest(s.rd), rev)),
      goodwillPctOfAssets: pct(div(latest(s.goodwill), assets)),
      revenueGrowthPct: growth(s.revenue),
      netIncomeGrowthPct: growth(s.netIncome),
    },

    trend: {
      revenue: s.revenue.slice(0, 4),
      netIncome: s.netIncome.slice(0, 4),
      operatingCashFlow: s.operatingCashFlow.slice(0, 4),
    },
  };

  fundamentalsCache.set(ticker, { ts: Date.now(), data });
  return data;
}

// GET /api/fundamentals/:ticker
router.get('/:ticker', async (req, res) => {
  try {
    res.json(await getFundamentals(req.params.ticker));
  } catch (err) {
    console.error('Fundamentals error:', err);
    res.status(500).json({ error: err.message });
  }
});

// ── Four-pillar AI analysis ────────────────────────────────────────────────
const SECTION_PROMPTS = {
  financials: (ctx, fin) => `You are a senior equity analyst. Using ONLY the audited figures below (from SEC filings, FY${fin.fiscalYear}), assess the financial health of ${ctx.name} (${ctx.ticker}).

FILED FIGURES (${fin.currency}):
${JSON.stringify({ statements: fin.statements, ratios: fin.ratios, revenueTrend: fin.trend.revenue }, null, 1)}

Return ONLY valid JSON:
{
  "verdict": "STRONG|HEALTHY|MIXED|STRAINED",
  "summary": "3-4 sentences: are they doing well financially overall?",
  "profitability": "2-3 sentences on margins (gross/operating/net), how well fixed costs are managed, and whether net margin clears a healthy bar (~8-10%+ is solid for most industries; note if this industry norms differ)",
  "balanceSheet": "2-3 sentences on leverage (debt/equity), liquidity (current ratio, working capital), and any cash concerns",
  "cashConversion": "2-3 sentences on receivable/payable days — do they collect cash in time? — and free cash flow quality",
  "capitalAllocation": "2-3 sentences on where the money goes: capex, R&D intensity, goodwill (acquisition-heavy?), investing cash flow",
  "returns": "1-2 sentences interpreting ROE, ROA, and ROCE",
  "watchItems": ["specific concern 1", "specific concern 2"]
}`,

  industry: (ctx) => `You are an industry strategist. Analyze the industry that ${ctx.name} (${ctx.ticker ?? 'private'}) operates in: ${ctx.sector} — specifically ${ctx.spec}.

Return ONLY valid JSON:
{
  "verdict": "SUNRISE|MATURE|STAGNANT|SUNSET",
  "summary": "3-4 sentences on the state and trajectory of this industry",
  "sizeAndGrowth": "2-3 sentences: rough market size, expected growth, and scalability of the opportunity",
  "cyclicality": "2-3 sentences: how cyclical is this industry, how sharp and fast are the downturns, where are we in the cycle",
  "regulation": "2-3 sentences: how government regulation (export controls, subsidies, antitrust, trade policy) affects companies like this",
  "threats": ["structural threat 1", "structural threat 2", "structural threat 3"]
}`,

  product: (ctx) => `You are a competitive-strategy analyst. Assess the product position and competitive advantage ("right to win") of ${ctx.name} (${ctx.ticker ?? 'private'}), which builds: ${ctx.spec} (${ctx.sector} sector).

Return ONLY valid JSON:
{
  "verdict": "LEADER|CHALLENGER|NICHE|COMMODITY",
  "summary": "3-4 sentences on whether this company has a durable right to win",
  "moat": "2-3 sentences: what protects them — technology, ecosystem, switching costs, scale — and how durable it is",
  "competition": "2-3 sentences: how intense is competition, how many credible players, what it does to margins",
  "commoditization": "2-3 sentences: is the product differentiated or a commodity, and is customer loyalty real or price-driven",
  "shapingTheFuture": "2-3 sentences: are they shaping where the industry goes (roadmap, standards, R&D) or following others"
}`,

  management: (ctx) => `You are a governance analyst. Assess the leadership of ${ctx.name} (${ctx.ticker ?? 'private'}) using only publicly documented information. Do NOT speculate about character or make unverifiable claims about individuals; where information is not publicly established, say so.

Return ONLY valid JSON:
{
  "verdict": "PROVEN|CAPABLE|UNTESTED|CONCERNS",
  "summary": "3-4 sentences on the overall caliber of the team running this company",
  "leadership": "2-3 sentences on the CEO and key executives: backgrounds, qualifications, track record",
  "structure": "2-3 sentences: founder-led vs professional management, leadership stability and tenure",
  "customerFocus": "2-3 sentences: does the strategy show they solve a real problem and prioritize customers (as evidenced by public strategy and product decisions)",
  "governanceNotes": "1-2 sentences on publicly documented governance strengths or red flags; state 'no notable public red flags' if none are documented"
}`,
};

// GET /api/fundamentals/:ticker/analysis/:section?name=&spec=&sector=&hq=
router.get('/:ticker/analysis/:section', async (req, res) => {
  const { ticker, section } = req.params;
  if (!SECTION_PROMPTS[section]) return res.status(400).json({ error: 'unknown section' });

  const key = `${ticker}:${section}`;
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