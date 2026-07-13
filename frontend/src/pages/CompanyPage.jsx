import { useState, useEffect, useCallback } from 'react';
import PeerComparison from '../components/PeerComparison.jsx';
import { useParams, useNavigate } from 'react-router-dom';
import { logoUrl } from '../data/companies';
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, ReferenceLine, Cell } from 'recharts';

const API = 'https://aifmi.onrender.com';
const FINNHUB = 'https://finnhub.io/api/v1';
const FKEY = import.meta.env.VITE_FINNHUB_KEY ?? '';

const fmt = (n) => n == null ? '—' : n < 1 ? `$${n.toFixed(4)}` : `$${n.toFixed(2)}`;
const fmtPct = (n) => n == null ? '—' : `${n >= 0 ? '+' : ''}${n.toFixed(2)}%`;
const fmtB = (n) => {
  if (n == null) return '—';
  if (n >= 1e12) return `$${(n / 1e12).toFixed(2)}T`;
  if (n >= 1e9) return `$${(n / 1e9).toFixed(2)}B`;
  if (n >= 1e6) return `$${(n / 1e6).toFixed(2)}M`;
  return `$${n.toFixed(0)}`;
};
const fmtNum = (n, d = 2) => n == null ? '—' : n.toFixed(d);

const SECTOR_COLORS = { gpu: '#1A6FD8', chip: '#0A5C99', asic: '#0E7A5A', npu: '#7B3FBF', network: '#C85C14' };

const BROKERS = [
  { name: 'Robinhood',    url: (t) => `https://robinhood.com/stocks/${t}`,                                              emoji: '🟢' },
  { name: 'Fidelity',     url: (t) => `https://digital.fidelity.com/prgw/digital/research/quote?symbol=${t}`,          emoji: '🔵' },
  { name: 'Schwab',       url: (t) => `https://www.schwab.com/research/stocks/quotes/summary/${t}`,                     emoji: '🔷' },
  { name: 'TD Ameritrade',url: () =>  `https://www.tdameritrade.com/home.page`,                                         emoji: '🟩' },
  { name: "E*TRADE",      url: () =>  `https://us.etrade.com/home`,                                                     emoji: '🟣' },
];

const SENTIMENT = {
  bullish: { color: '#0FA97A', bg: '#0FA97A18', label: '▲ BULLISH' },
  neutral: { color: '#F0A500', bg: '#F0A50018', label: '◆ NEUTRAL' },
  bearish: { color: '#DC3C3C', bg: '#DC3C3C18', label: '▼ BEARISH' },
};

const PERIODS = ['1D', '1W', '1M', '1Y'];

function MetricCard({ label, value, sub, color }) {
  return (
    <div style={{ background: '#fafafa', borderRadius: 8, padding: '14px 16px', border: '1px solid #f0f0f0' }}>
      <div style={{ fontFamily: 'Space Mono, monospace', fontSize: 9, color: '#0a0a0a', letterSpacing: 1, marginBottom: 6, textTransform: 'uppercase' }}>{label}</div>
      <div style={{ fontFamily: 'Syne, sans-serif', fontWeight: 700, fontSize: 18, color: color ?? '#0a0a0a' }}>{value}</div>
      {sub && <div style={{ fontFamily: 'Space Mono, monospace', fontSize: 9, color: '#0a0a0a', marginTop: 4 }}>{sub}</div>}
    </div>
  );
}

function SectionTitle({ title, color }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 12, margin: '28px 0 16px' }}>
      <div style={{ width: 3, height: 18, background: color, borderRadius: 2 }} />
      <span style={{ fontFamily: 'Syne, sans-serif', fontWeight: 800, fontSize: 16, color: '#0a0a0a' }}>{title}</span>
      <div style={{ flex: 1, height: 1, background: `${color}22` }} />
    </div>
  );
}

// ── Fundamental analysis tabs ──────────────────────────────────────────────
const VERDICT_COLORS = {
  STRONG: '#0B9E6E', HEALTHY: '#0B9E6E', SUNRISE: '#0B9E6E', LEADER: '#0B9E6E', PROVEN: '#0B9E6E',
  MIXED: '#C77E00', MATURE: '#C77E00', CHALLENGER: '#C77E00', CAPABLE: '#C77E00', NICHE: '#C77E00', UNTESTED: '#C77E00', STAGNANT: '#C77E00',
  STRAINED: '#D4365B', SUNSET: '#D4365B', COMMODITY: '#D4365B', CONCERNS: '#D4365B',
};
const VERDICT_GAUGE = {
  STRONG: 88, HEALTHY: 72, MIXED: 50, STRAINED: 24,
  SUNRISE: 88, MATURE: 62, STAGNANT: 42, SUNSET: 20,
  LEADER: 88, CHALLENGER: 66, NICHE: 46, COMMODITY: 26,
  PROVEN: 88, CAPABLE: 66, UNTESTED: 46, CONCERNS: 24,
};

// Aurora Ledger glass primitives
const glassCard = {
  position: 'relative', padding: '20px 22px', borderRadius: 18,
  background: 'rgba(255,255,255,0.72)', backdropFilter: 'blur(16px)', WebkitBackdropFilter: 'blur(16px)',
  border: '1px solid rgba(255,255,255,0.95)',
  boxShadow: '0 6px 22px rgba(18,20,31,0.06), inset 0 1px 0 #fff',
  transition: 'transform .18s ease, box-shadow .18s ease',
};
const glassPanel = (sectorColor) => ({
  padding: '26px 28px', borderRadius: 20,
  background: 'linear-gradient(150deg, rgba(255,255,255,0.92), rgba(255,255,255,0.62))',
  backdropFilter: 'blur(18px)', WebkitBackdropFilter: 'blur(18px)', border: '1px solid #fff',
  boxShadow: `0 16px 44px ${sectorColor}24`,
});
const GLOW = {
  good: { color: '#0B9E6E', textShadow: '0 0 16px rgba(11,158,110,0.30)' },
  warn: { color: '#C77E00', textShadow: '0 0 16px rgba(199,126,0,0.28)' },
  bad:  { color: '#D4365B', textShadow: '0 0 16px rgba(212,54,91,0.28)' },
};

function GlassMetric({ label, value, tone }) {
  return (
    <div style={glassCard}
      onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-3px)'; }}
      onMouseLeave={e => { e.currentTarget.style.transform = 'none'; }}>
      <div style={{ fontFamily: 'Space Mono, monospace', fontSize: 9, letterSpacing: 2, color: '#7a7f92', marginBottom: 10, textTransform: 'uppercase' }}>{label}</div>
      <div style={{ fontFamily: 'Syne, sans-serif', fontWeight: 800, fontSize: 26, letterSpacing: -0.5, color: '#12141f', ...(tone ? GLOW[tone] : {}) }}>{value}</div>
    </div>
  );
}

function VerdictBeam({ verdict, note }) {
  const color = VERDICT_COLORS[verdict] ?? '#C77E00';
  const width = VERDICT_GAUGE[verdict] ?? 50;
  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: 20, marginBottom: 22, padding: '18px 24px', borderRadius: 18,
      background: `linear-gradient(90deg, ${color}1A, rgba(255,255,255,0.75) 60%)`,
      border: `1px solid ${color}59`, backdropFilter: 'blur(14px)', WebkitBackdropFilter: 'blur(14px)',
      boxShadow: `0 10px 32px ${color}1F, inset 0 1px 0 #fff`,
    }}>
      <div style={{ fontFamily: 'Syne, sans-serif', fontWeight: 800, fontSize: 22, letterSpacing: 1, color, textShadow: `0 0 20px ${color}59` }}>{verdict}</div>
      <div style={{ flex: 1, height: 8, borderRadius: 99, background: 'rgba(18,20,31,0.07)', overflow: 'hidden' }}>
        <div style={{ height: '100%', width: `${width}%`, borderRadius: 99, background: 'linear-gradient(90deg, #D4365B, #C77E00, #0B9E6E)', transition: 'width .6s ease' }} />
      </div>
      {note && <div style={{ fontFamily: 'Space Mono, monospace', fontSize: 10, color: '#6a7086', maxWidth: 300, lineHeight: 1.6 }}>{note}</div>}
    </div>
  );
}

function GlassSection({ title, sectorColor }) {
  return (
    <div style={{ fontFamily: 'Space Mono, monospace', fontSize: 10, letterSpacing: 3, color: sectorColor, margin: '26px 0 12px', display: 'flex', alignItems: 'center', gap: 12 }}>
      {title.toUpperCase()}
      <div style={{ flex: 1, height: 1, background: `linear-gradient(90deg, ${sectorColor}59, transparent)` }} />
    </div>
  );
}

const PILLARS = {
  industry: {
    title: 'Industry',
    fields: [['sizeAndGrowth', 'Size, Growth & Scalability'], ['cyclicality', 'Cyclicality'], ['regulation', 'Regulatory Impact']],
    list: ['threats', 'Structural Threats'],
  },
  product: {
    title: 'Product & Moat',
    fields: [['moat', 'The Moat'], ['competition', 'Competitive Intensity'], ['commoditization', 'Differentiation & Loyalty'], ['shapingTheFuture', 'Shaping the Future?']],
    list: null,
  },
  management: {
    title: 'Management',
    fields: [['leadership', 'Leadership Caliber'], ['structure', 'Structure & Stability'], ['customerFocus', 'Customer Focus'], ['governanceNotes', 'Governance Notes']],
    list: null,
  },
};

function AnalysisShimmer({ sectorColor }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      {['Pulling the data...', 'Running the analysis...', 'Writing it up...'].map((msg, i) => (
        <div key={i} style={{ padding: '14px 16px', background: '#fafafa', borderRadius: 8, animation: `pulse 1.5s ease-in-out ${i * 0.2}s infinite` }}>
          <div style={{ fontFamily: 'Space Mono, monospace', fontSize: 11, color: '#0a0a0a', marginBottom: 8 }}>{msg}</div>
          <div style={{ height: 6, background: '#f0f0f0', borderRadius: 3, overflow: 'hidden' }}>
            <div style={{ height: '100%', borderRadius: 3, width: '40%', background: `linear-gradient(90deg, transparent, ${sectorColor}, transparent)`, animation: 'shimmer 1.4s ease-in-out infinite' }} />
          </div>
        </div>
      ))}
    </div>
  );
}

function AnalysisFooter() {
  return (
    <div style={{ fontFamily: 'Space Mono, monospace', fontSize: 9, color: '#0a0a0a', textAlign: 'right', marginTop: 14 }}>
      AI Analysis · Generated by Claude · Not financial advice
    </div>
  );
}

function useSectionAnalysis(ticker, section, company) {
  const [state, setState] = useState('loading');
  const [data, setData] = useState(null);
  useEffect(() => {
    if (!ticker || !company) return;
    setState('loading');
    const q = new URLSearchParams({ name: company.name, spec: company.spec ?? '', sector: company.sector ?? '', hq: company.hq ?? '' });
    fetch(`${API}/api/fundamentals/${ticker}/analysis/${section}?${q}`)
      .then(r => r.json())
      .then(d => { setData(d); setState(d.error ? 'error' : 'done'); })
      .catch(() => setState('error'));
  }, [ticker, section, company]);
  return { state, data };
}

function PillarTab({ section, ticker, company, sectorColor }) {
  const cfg = PILLARS[section];
  const { state, data } = useSectionAnalysis(ticker, section, company);
  const a = data?.analysis;
  return (
    <div style={{ animation: 'fadeIn 0.3s ease' }}>
      {state === 'loading' && <div style={glassPanel(sectorColor)}><AnalysisShimmer sectorColor={sectorColor} /></div>}
      {state === 'error' && <div style={{ ...glassPanel(sectorColor), fontFamily: 'Space Mono, monospace', fontSize: 11, color: '#D4365B' }}>⚠ Failed to load analysis — try reloading the page.</div>}
      {state === 'done' && a && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
          <VerdictBeam verdict={a.verdict} note={`AI analysis · ${cfg.title}`} />
          <div style={glassPanel(sectorColor)}>
            <div style={{ fontFamily: 'Syne, sans-serif', fontSize: 15, color: '#12141f', lineHeight: 1.85, marginBottom: 18 }}>{a.summary}</div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
              {cfg.fields.map(([key, label]) => a[key] && (
                <div key={key} style={{ ...glassCard, padding: 16 }}>
                  <div style={{ fontFamily: 'Space Mono, monospace', fontSize: 9, color: sectorColor, letterSpacing: 1, marginBottom: 8 }}>{label.toUpperCase()}</div>
                  <div style={{ fontFamily: 'Syne, sans-serif', fontSize: 12, color: '#2a2d3d', lineHeight: 1.7 }}>{a[key]}</div>
                </div>
              ))}
            </div>
            {cfg.list && Array.isArray(a[cfg.list[0]]) && (
              <div style={{ marginTop: 14, padding: '14px 16px', background: 'rgba(255,255,255,0.6)', borderRadius: 12, borderLeft: `3px solid ${sectorColor}` }}>
                <div style={{ fontFamily: 'Space Mono, monospace', fontSize: 9, color: sectorColor, marginBottom: 8, letterSpacing: 1 }}>{cfg.list[1].toUpperCase()}</div>
                {a[cfg.list[0]].map((t, i) => (
                  <div key={i} style={{ fontFamily: 'Syne, sans-serif', fontSize: 12, color: '#2a2d3d', lineHeight: 1.9 }}>· {t}</div>
                ))}
              </div>
            )}
            <AnalysisFooter />
          </div>
        </div>
      )}
    </div>
  );
}

function TrendCharts({ fin, sectorColor }) {
  const years = [...(fin.trend?.revenue ?? [])].reverse();
  if (years.length < 2) return null;
  const niByYear = Object.fromEntries((fin.trend?.netIncome ?? []).map(r => [r.fy, r.val]));
  const ocfByYear = Object.fromEntries((fin.trend?.operatingCashFlow ?? []).map(r => [r.fy, r.val]));
  const data = years.map(r => ({
    fy: `FY${String(r.fy).slice(-2)}`,
    Revenue: r.val / 1e9,
    'Net Income': (niByYear[r.fy] ?? 0) / 1e9,
    'Op. Cash Flow': (ocfByYear[r.fy] ?? 0) / 1e9,
  }));
  const tt = { background: 'rgba(255,255,255,0.95)', border: `1px solid ${sectorColor}44`, borderRadius: 8, fontFamily: 'Space Mono', fontSize: 11 };
  return (
    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14, marginTop: 4 }}>
      <div style={{ ...glassCard, padding: '18px 20px' }}>
        <div style={{ fontFamily: 'Space Mono, monospace', fontSize: 9, letterSpacing: 2, color: '#7a7f92', marginBottom: 12 }}>REVENUE VS NET INCOME · $B</div>
        <ResponsiveContainer width="100%" height={180}>
          <BarChart data={data} barGap={3}>
            <XAxis dataKey="fy" tick={{ fill: '#7a7f92', fontSize: 10, fontFamily: 'Space Mono' }} tickLine={false} axisLine={false} />
            <YAxis tick={{ fill: '#7a7f92', fontSize: 10, fontFamily: 'Space Mono' }} tickLine={false} axisLine={false} width={44} tickFormatter={v => `$${v.toFixed(0)}`} />
            <Tooltip contentStyle={tt} formatter={(v, n) => [`$${v.toFixed(1)}B`, n]} />
            <Bar dataKey="Revenue" fill={sectorColor} radius={[4, 4, 0, 0]} />
            <Bar dataKey="Net Income" fill="#0B9E6E" radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>
      <div style={{ ...glassCard, padding: '18px 20px' }}>
        <div style={{ fontFamily: 'Space Mono, monospace', fontSize: 9, letterSpacing: 2, color: '#7a7f92', marginBottom: 12 }}>OPERATING CASH FLOW · $B</div>
        <ResponsiveContainer width="100%" height={180}>
          <LineChart data={data}>
            <XAxis dataKey="fy" tick={{ fill: '#7a7f92', fontSize: 10, fontFamily: 'Space Mono' }} tickLine={false} axisLine={false} />
            <YAxis tick={{ fill: '#7a7f92', fontSize: 10, fontFamily: 'Space Mono' }} tickLine={false} axisLine={false} width={44} tickFormatter={v => `$${v.toFixed(0)}`} />
            <Tooltip contentStyle={tt} formatter={(v) => [`$${v.toFixed(1)}B`, 'OCF']} />
            <Line type="monotone" dataKey="Op. Cash Flow" stroke="#0B9E6E" strokeWidth={2.5} dot={{ r: 3, fill: '#0B9E6E' }} />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

function FinancialsTab({ ticker, company, sectorColor }) {
  const [fin, setFin] = useState(null);
  const [finState, setFinState] = useState('loading');
  const { state: aState, data: aData } = useSectionAnalysis(ticker, 'financials', company);
  const a = aData?.analysis;

  useEffect(() => {
    if (!ticker) { setFinState('none'); return; }
    setFinState('loading');
    fetch(`${API}/api/fundamentals/${ticker}`)
      .then(r => r.json())
      .then(d => { setFin(d); setFinState(d.available ? 'done' : 'unavailable'); })
      .catch(() => setFinState('error'));
  }, [ticker]);

  if (!ticker) return (
    <div style={{ ...glassPanel(sectorColor), fontFamily: 'Space Mono, monospace', fontSize: 12, color: '#2a2d3d' }}>
      Privately held — no public filings available.
    </div>
  );

  const st = fin?.statements ?? {};
  const rt = fin?.ratios ?? {};
  const money = (n) => fmtB(n);
  const pc = (n) => n == null ? '—' : `${n.toFixed(1)}%`;

  const groups = [
    ['P&L', [
      ['Revenue', money(st.revenue)], ['Gross Profit', money(st.grossProfit)],
      ['Operating Income', money(st.operatingIncome)], ['Net Income', money(st.netIncome)],
      ['EBITDA (approx)', money(st.ebitda)], ['Revenue Growth', pc(rt.revenueGrowthPct), (rt.revenueGrowthPct ?? 0) >= 0 ? 'good' : 'bad'],
    ]],
    ['Margins & Returns', [
      ['Gross Margin', pc(rt.grossMarginPct)], ['Operating Margin', pc(rt.operatingMarginPct)],
      ['Net Margin', pc(rt.netMarginPct), (rt.netMarginPct ?? 0) >= 8 ? 'good' : 'warn'],
      ['ROE', pc(rt.roePct)], ['ROA', pc(rt.roaPct)], ['ROCE', pc(rt.rocePct)],
    ]],
    ['Balance Sheet', [
      ['Cash', money(st.cash)], ['Long-Term Debt', money(st.longTermDebt)],
      ['Debt / Equity', rt.debtToEquity ?? '—', (rt.debtToEquity ?? 0) > 2 ? 'bad' : 'good'],
      ['Current Ratio', rt.currentRatio ?? '—', (rt.currentRatio ?? 0) >= 1.5 ? 'good' : 'warn'],
      ['Working Capital', money(rt.workingCapital)], ['Goodwill', money(st.goodwill)],
    ]],
    ['Cash Conversion', [
      ['Operating Cash Flow', money(st.operatingCashFlow)], ['Capex', money(st.capex)],
      ['Free Cash Flow', money(st.freeCashFlow), (st.freeCashFlow ?? 0) >= 0 ? 'good' : 'bad'],
      ['Receivable Days', rt.receivableDays ?? '—'], ['Payable Days', rt.payableDays ?? '—'],
      ['R&D % of Revenue', pc(rt.rdPctOfRevenue)],
    ]],
  ];

  const beamNote = fin?.fiscalYear
    ? `FY${fin.fiscalYear} filing · SEC EDGAR · net margin ${pc(rt.netMarginPct)}${(rt.netMarginPct ?? 0) >= 8 ? ' clears the healthy bar' : ''}`
    : null;

  return (
    <div style={{ animation: 'fadeIn 0.3s ease' }}>
      {finState === 'loading' && <div style={glassPanel(sectorColor)}><AnalysisShimmer sectorColor={sectorColor} /></div>}
      {finState === 'error' && <div style={{ ...glassPanel(sectorColor), fontFamily: 'Space Mono, monospace', fontSize: 11, color: '#D4365B' }}>⚠ Failed to load filing data.</div>}
      {finState === 'unavailable' && (
        <div style={{ ...glassPanel(sectorColor), fontFamily: 'Space Mono, monospace', fontSize: 12, color: '#2a2d3d', lineHeight: 1.8 }}>
          {company?.name} does not file with the US SEC (listed on {company?.exchange}), so audited filing data isn't available here. Market-data metrics are shown on the Overview tab.
        </div>
      )}
      {finState === 'done' && fin && (
        <>
          {aState === 'done' && a?.verdict && <VerdictBeam verdict={a.verdict} note={beamNote} />}
          <TrendCharts fin={fin} sectorColor={sectorColor} />
          {groups.map(([title, rows]) => (
            <div key={title}>
              <GlassSection title={title} sectorColor={sectorColor} />
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 14 }}>
                {rows.map(([label, value, tone]) => (
                  <GlassMetric key={label} label={label} value={value} tone={tone} />
                ))}
              </div>
            </div>
          ))}
          <div style={{ fontFamily: 'Space Mono, monospace', fontSize: 9, color: '#8a8fa3', marginTop: 16 }}>
            Source: SEC EDGAR — FY{fin.fiscalYear} filing, period ended {fin.periodEnd} · Figures in {fin.currency}
          </div>

          <div style={{ ...glassPanel(sectorColor), marginTop: 24 }}>
            <div style={{ fontFamily: 'Space Mono, monospace', fontSize: 10, color: sectorColor, letterSpacing: 3, marginBottom: 14 }}>AI READ ON THE NUMBERS</div>
            {aState === 'loading' && <AnalysisShimmer sectorColor={sectorColor} />}
            {aState === 'error' && <div style={{ fontFamily: 'Space Mono, monospace', fontSize: 11, color: '#D4365B' }}>⚠ Analysis unavailable.</div>}
            {aState === 'done' && a && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                <div style={{ fontFamily: 'Syne, sans-serif', fontSize: 15, color: '#12141f', lineHeight: 1.85 }}>{a.summary}</div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
                  {[['profitability', 'Profitability & Cost Control'], ['balanceSheet', 'Balance Sheet'], ['cashConversion', 'Cash Conversion'], ['capitalAllocation', 'Capital Allocation'], ['returns', 'Returns (ROE / ROA / ROCE)']].map(([key, label]) => a[key] && (
                    <div key={key} style={{ ...glassCard, padding: 16 }}>
                      <div style={{ fontFamily: 'Space Mono, monospace', fontSize: 9, color: sectorColor, letterSpacing: 1, marginBottom: 8 }}>{label.toUpperCase()}</div>
                      <div style={{ fontFamily: 'Syne, sans-serif', fontSize: 12, color: '#2a2d3d', lineHeight: 1.7 }}>{a[key]}</div>
                    </div>
                  ))}
                </div>
                {Array.isArray(a.watchItems) && a.watchItems.length > 0 && (
                  <div style={{ padding: '14px 16px', background: 'rgba(255,255,255,0.6)', borderRadius: 12, borderLeft: '3px solid #C77E00' }}>
                    <div style={{ fontFamily: 'Space Mono, monospace', fontSize: 9, color: '#C77E00', marginBottom: 8, letterSpacing: 1 }}>WATCH ITEMS</div>
                    {a.watchItems.map((w, i) => (
                      <div key={i} style={{ fontFamily: 'Syne, sans-serif', fontSize: 12, color: '#2a2d3d', lineHeight: 1.9 }}>· {w}</div>
                    ))}
                  </div>
                )}
                <AnalysisFooter />
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}

export default function CompanyPage() {
  const { ticker } = useParams();
  const navigate = useNavigate();

  const [company, setCompany] = useState(null);
  const [sectorColor, setSectorColor] = useState('#1A6FD8');
  const [sectorLabel, setSectorLabel] = useState('');
  const [quote, setQuote] = useState(null);
  const [metrics, setMetrics] = useState(null);
  const [priceHistory, setPriceHistory] = useState([]);
  const [period, setPeriod] = useState('1M');
  const [earnings, setEarnings] = useState([]);
  const [recommendation, setRecommendation] = useState(null);
  const [priceTarget, setPriceTarget] = useState(null);
  const [briefing, setBriefing] = useState(null);
  const [briefingState, setBriefingState] = useState('idle');
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('overview');

  useEffect(() => {
    fetch(`${API}/api/sectors`)
      .then(r => r.json())
      .then(data => {
        for (const [sectorId, sector] of Object.entries(data)) {
          const found = sector.companies.find(c => c.ticker === ticker);
          if (found) {
            setCompany({ ...found, sectorId, sectorFullName: sector.fullName });
            setSectorColor(SECTOR_COLORS[sectorId] ?? '#1A6FD8');
            setSectorLabel(sector.label ?? sectorId);
            break;
          }
        }
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, [ticker]);

  useEffect(() => {
    if (!ticker || !FKEY) return;
    fetch(`${FINNHUB}/quote?symbol=${ticker}&token=${FKEY}`).then(r => r.json()).then(q => { if (q?.c) setQuote(q); }).catch(() => {});
    fetch(`${FINNHUB}/stock/metric?symbol=${ticker}&metric=all&token=${FKEY}`).then(r => r.json()).then(d => { if (d?.metric) setMetrics(d.metric); }).catch(() => {});
    fetch(`${FINNHUB}/stock/recommendation?symbol=${ticker}&token=${FKEY}`).then(r => r.json()).then(d => { if (d?.length) setRecommendation(d[0]); }).catch(() => {});
    fetch(`${FINNHUB}/stock/price-target?symbol=${ticker}&token=${FKEY}`).then(r => r.json()).then(d => { if (d?.targetMean) setPriceTarget(d); }).catch(() => {});
    fetch(`${FINNHUB}/stock/earnings?symbol=${ticker}&token=${FKEY}`).then(r => r.json()).then(d => {
      if (Array.isArray(d)) setEarnings(d.slice(0, 6).reverse().map(e => ({ period: e.period, actual: e.actual, estimate: e.estimate })));
    }).catch(() => {});
  }, [ticker]);

  useEffect(() => {
    if (!ticker) return;
    const interval = period === '1D' ? '5m' : period === '1W' ? '60m' : period === '1M' ? '1d' : '1wk';
    const range = period === '1D' ? '1d' : period === '1W' ? '5d' : period === '1M' ? '1mo' : '1y';
    fetch(`https://aifmi.onrender.com/api/chart/${ticker}?interval=${interval}&range=${range}`)
      .then(r => r.json())
      .then(d => {
        const result = d?.chart?.result?.[0];
        if (result) {
          const ts = result.timestamp;
          const closes = result.indicators?.quote?.[0]?.close;
          const volumes = result.indicators?.quote?.[0]?.volume;
          if (ts && closes) {
            setPriceHistory(ts.map((t, i) => ({
              time: new Date(t * 1000).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
              price: closes[i] ?? 0,
              volume: volumes?.[i] ?? 0,
            })).filter(p => p.price > 0));
          }
        }
      }).catch(() => {});
  }, [ticker, period]);

  const fetchBriefing = useCallback(async () => {
    if (!company) return;
    setBriefingState('loading');
    try {
      const res = await fetch(`${API}/api/intelligence/briefing`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ company: company.name, ticker: company.ticker, hq: company.hq, spec: company.spec, sector: company.sectorFullName, exchange: company.exchange }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setBriefing(data.briefing);
      setBriefingState('done');
    } catch { setBriefingState('error'); }
  }, [company]);

  useEffect(() => { if (company) fetchBriefing(); }, [company]);

  const isUp = (quote?.dp ?? 0) >= 0;
  const sentCfg = SENTIMENT[briefing?.sentiment] ?? SENTIMENT.neutral;
  const totalRecs = recommendation ? (recommendation.strongBuy + recommendation.buy + recommendation.hold + recommendation.sell + recommendation.strongSell) : 0;

  if (loading) return (
    <div style={{ minHeight: '100vh', background: '#fafafa', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div style={{ fontFamily: 'Space Mono, monospace', color: '#0a0a0a' }}>Loading...</div>
    </div>
  );

  if (!company) return (
    <div style={{ minHeight: '100vh', background: '#fafafa', display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: 16 }}>
      <div style={{ fontFamily: 'Syne, sans-serif', color: '#0a0a0a', fontSize: 24 }}>Company not found</div>
      <button onClick={() => navigate('/')} style={{ background: '#1A6FD8', border: 'none', color: '#0a0a0a', padding: '10px 24px', borderRadius: 6, cursor: 'pointer', fontFamily: 'Space Mono, monospace' }}>← Back</button>
    </div>
  );

  return (
    <div style={{ minHeight: '100vh', background: '#F3F5FB', color: '#0a0a0a', position: 'relative', overflow: 'hidden' }}>
      <div className="aurora" style={{ width: 760, height: 760, background: sectorColor, opacity: 0.16, top: -300, left: -180 }} />
      <div className="aurora" style={{ width: 560, height: 560, background: '#7B3FBF', opacity: 0.10, bottom: -260, right: -140, animationDelay: '-10s' }} />
      <style>{`
        * { box-sizing: border-box; margin: 0; padding: 0; }
        body { background: #050508; }
        @keyframes fadeIn { from{opacity:0;transform:translateY(6px)} to{opacity:1;transform:none} }
        @keyframes pulse { 0%,100%{opacity:1} 50%{opacity:0.4} }
        @keyframes shimmer { 0%{transform:translateX(-200%)} 100%{transform:translateX(300%)} }
        @keyframes drift { from{transform:translate(0,0) scale(1)} to{transform:translate(70px,50px) scale(1.1)} }
        .aurora { position:fixed; border-radius:50%; filter:blur(120px); pointer-events:none; z-index:0; animation:drift 20s ease-in-out infinite alternate; }
        @media (prefers-reduced-motion: reduce) { .aurora { animation:none; } }
        ::-webkit-scrollbar{width:6px} ::-webkit-scrollbar-track{background:#050508} ::-webkit-scrollbar-thumb{background:#1a1a2e;border-radius:3px}
        .pbtn { background:none; border:1px solid #1a1a2e; color:#555; fontFamily:'Space Mono',monospace; fontSize:10px; padding:4px 10px; borderRadius:4px; cursor:pointer; transition:all 0.15s; }
        .pbtn:hover { border-color:#333; color:#aaa; }
        .pbtn.active { background:${sectorColor}22; border-color:${sectorColor}; color:${sectorColor}; }
      `}</style>

      {/* Header */}
      <header style={{ borderBottom: '1px solid #f0f0f0', padding: '14px 32px', background: 'rgba(255,255,255,0.75)', backdropFilter: 'blur(14px)', WebkitBackdropFilter: 'blur(14px)', position: 'sticky', top: 0, zIndex: 100, display: 'flex', alignItems: 'center', gap: 16 }}>
        <button onClick={() => navigate('/')} style={{ background: 'none', border: '1px solid #e8e8e8', color: '#0a0a0a', padding: '6px 14px', borderRadius: 6, cursor: 'pointer', fontFamily: 'Space Mono, monospace', fontSize: 11 }}>← Dashboard</button>
        <div style={{ height: 20, width: 1, background: '#e0e0e0' }} />
        <span style={{ fontFamily: 'Space Mono, monospace', fontSize: 10, color: sectorColor, background: `${sectorColor}18`, padding: '3px 10px', borderRadius: 4 }}>{sectorLabel}</span>
        {company.domain && (
          <img src={logoUrl(company.domain, 64)} alt="" width={26} height={26}
            style={{ borderRadius: 7, background: '#fff', padding: 2, border: '1px solid #e8e8e8' }}
            onError={e => { e.currentTarget.style.display = 'none'; }} />
        )}
        <span style={{ fontFamily: 'Syne, sans-serif', fontWeight: 700, fontSize: 16, color: '#0a0a0a' }}>{company.name}</span>
        {company.ticker && <span style={{ fontFamily: 'Space Mono, monospace', fontSize: 12, color: '#0a0a0a' }}>{company.ticker} · {company.exchange}</span>}
        <div style={{ flex: 1 }} />
        <span style={{ fontFamily: 'Syne, sans-serif', fontWeight: 800, fontSize: 18, color: '#0a0a0a' }}>AI<span style={{ color: '#1A6FD8' }}>FMI</span></span>
      </header>

      <div style={{ maxWidth: 1200, margin: '0 auto', padding: '32px 24px', animation: 'fadeIn 0.3s ease', position: 'relative', zIndex: 1 }}>

        {/* Analysis tabs — Aurora pill bar */}
        <div style={{
          display: 'flex', gap: 6, marginBottom: 26, padding: 6, width: 'max-content', maxWidth: '100%', overflowX: 'auto',
          background: 'rgba(255,255,255,0.6)', border: '1px solid rgba(255,255,255,0.95)', borderRadius: 16,
          backdropFilter: 'blur(16px)', WebkitBackdropFilter: 'blur(16px)',
          boxShadow: '0 8px 26px rgba(18,20,31,0.07), inset 0 1px 0 #fff',
        }}>
          {[['overview', 'Overview'], ['financials', 'Financials'], ['industry', 'Industry'], ['product', 'Product & Moat'], ['management', 'Management']].map(([id, label]) => (
            <button key={id} onClick={() => setActiveTab(id)} style={{
              fontFamily: 'Syne, sans-serif', fontWeight: 700, fontSize: 13, whiteSpace: 'nowrap',
              padding: '9px 20px', borderRadius: 11, cursor: 'pointer', border: '1px solid transparent', transition: 'all 0.15s',
              color: activeTab === id ? '#fff' : '#5d6273',
              background: activeTab === id ? `linear-gradient(135deg, ${sectorColor}, ${sectorColor}CC)` : 'none',
              boxShadow: activeTab === id ? `0 6px 20px ${sectorColor}66` : 'none',
            }}>{label}</button>
          ))}
        </div>

        {activeTab === 'financials' && <FinancialsTab ticker={company.ticker} company={{ ...company, sector: sectorLabel }} sectorColor={sectorColor} />}
        {activeTab === 'industry' && <PillarTab section="industry" ticker={company.ticker ?? company.name} company={{ ...company, sector: sectorLabel }} sectorColor={sectorColor} />}
        {activeTab === 'product' && <PillarTab section="product" ticker={company.ticker ?? company.name} company={{ ...company, sector: sectorLabel }} sectorColor={sectorColor} />}
        {activeTab === 'management' && <PillarTab section="management" ticker={company.ticker ?? company.name} company={{ ...company, sector: sectorLabel }} sectorColor={sectorColor} />}

        {activeTab === 'overview' && <>
        {/* Hero */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20, marginBottom: 8 }}>
          <div style={{ background: '#ffffff', borderRadius: 12, border: `1px solid ${sectorColor}33`, padding: '24px 28px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 4 }}>
              {company.domain && (
                <img src={logoUrl(company.domain, 128)} alt="" width={44} height={44}
                  style={{ borderRadius: 10, background: '#fff', padding: 4, border: '1px solid #e8e8e8', boxShadow: '0 4px 14px rgba(18,20,31,0.08)' }}
                  onError={e => { e.currentTarget.style.display = 'none'; }} />
              )}
              <div style={{ fontFamily: 'Syne, sans-serif', fontWeight: 800, fontSize: 28, color: '#0a0a0a' }}>{company.name}</div>
            </div>
            <div style={{ fontFamily: 'Space Mono, monospace', fontSize: 12, color: '#0a0a0a', marginBottom: 20 }}>{company.spec} · {company.hq}</div>
            {quote ? (
              <>
                <div style={{ fontFamily: 'Space Mono, monospace', fontSize: 42, fontWeight: 700, color: '#0a0a0a', letterSpacing: -1 }}>{fmt(quote.c)}</div>
                <div style={{ fontFamily: 'Space Mono, monospace', fontSize: 14, color: isUp ? '#0FA97A' : '#DC3C3C', marginTop: 6 }}>
                  {isUp ? '+' : ''}{fmt(quote.d)} ({fmtPct(quote.dp)}) today
                </div>
                <div style={{ display: 'flex', gap: 20, marginTop: 16 }}>
                  {[['HIGH', fmt(quote.h)], ['LOW', fmt(quote.l)], ['OPEN', fmt(quote.o)], ['PREV CLOSE', fmt(quote.pc)]].map(([l, v]) => (
                    <div key={l}><div style={{ fontFamily: 'Space Mono, monospace', fontSize: 9, color: '#0a0a0a', marginBottom: 4 }}>{l}</div><div style={{ fontFamily: 'Space Mono, monospace', fontSize: 12, color: '#0a0a0a' }}>{v}</div></div>
                  ))}
                </div>
              </>
            ) : (
              <div style={{ fontFamily: 'Space Mono, monospace', color: '#0a0a0a', fontStyle: 'italic' }}>
                {FKEY ? 'Loading price data...' : 'Add VITE_FINNHUB_KEY to Railway to enable live data'}
              </div>
            )}
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
            <MetricCard label="Market Cap" value={fmtB((metrics?.marketCapitalization ?? 0) * 1e6)} />
            <MetricCard label="P/E Ratio" value={fmtNum(metrics?.peBasicExclExtraTTM)} sub="Trailing 12M" />
            <MetricCard label="EPS (TTM)" value={metrics?.epsBasicExclExtraItemsAnnual ? `$${fmtNum(metrics.epsBasicExclExtraItemsAnnual)}` : '—'} />
            <MetricCard label="ROE" value={metrics?.roeTTM ? `${fmtNum(metrics.roeTTM)}%` : '—'} color={metrics?.roeTTM > 15 ? '#0FA97A' : undefined} />
            <MetricCard label="Debt / Equity" value={fmtNum(metrics?.["totalDebt/totalEquityAnnual"])} color={(metrics?.["totalDebt/totalEquityAnnual"] ?? 0) > 2 ? '#DC3C3C' : '#0FA97A'} />
            <MetricCard label="Dividend Yield" value={metrics?.dividendYieldIndicatedAnnual ? `${fmtNum(metrics.dividendYieldIndicatedAnnual)}%` : 'N/A'} />
            <MetricCard label="52W High" value={fmt(metrics?.['52WeekHigh'])} />
            <MetricCard label="52W Low" value={fmt(metrics?.['52WeekLow'])} />
          </div>
        </div>

        {/* Price Chart */}
        <SectionTitle title="Price History" color={sectorColor} />
        <div style={{ background: '#ffffff', borderRadius: 12, border: '1px solid #f0f0f0', padding: '20px 24px' }}>
          <div style={{ display: 'flex', gap: 8, marginBottom: 20 }}>
            {PERIODS.map(p => (
              <button key={p} className={`pbtn ${period === p ? 'active' : ''}`} onClick={() => setPeriod(p)}
                style={{ background: period === p ? `${sectorColor}22` : 'none', border: `1px solid ${period === p ? sectorColor : '#1a1a2e'}`, color: period === p ? sectorColor : '#fafafa', fontFamily: 'Space Mono, monospace', fontSize: 10, padding: '4px 10px', borderRadius: 4, cursor: 'pointer' }}
              >{p}</button>
            ))}
          </div>
          {priceHistory.length > 0 ? (
            <>
              <ResponsiveContainer width="100%" height={240}>
                <LineChart data={priceHistory}>
                  <XAxis dataKey="time" tick={{ fill: '#0a0a0a', fontSize: 10, fontFamily: 'Space Mono' }} tickLine={false} axisLine={false} interval="preserveStartEnd" />
                  <YAxis domain={['auto', 'auto']} tick={{ fill: '#0a0a0a', fontSize: 10, fontFamily: 'Space Mono' }} tickLine={false} axisLine={false} tickFormatter={v => `$${v.toFixed(0)}`} width={60} />
                  <Tooltip contentStyle={{ background: '#fafafa', border: `1px solid ${sectorColor}44`, borderRadius: 6, fontFamily: 'Space Mono', fontSize: 11 }} formatter={(v) => [`$${v.toFixed(2)}`, 'Price']} />
                  <Line type="monotone" dataKey="price" dot={false} strokeWidth={2} stroke={isUp ? '#0FA97A' : '#DC3C3C'} isAnimationActive={false} />
                </LineChart>
              </ResponsiveContainer>
              <div style={{ marginTop: 12 }}>
                <div style={{ fontFamily: 'Space Mono, monospace', fontSize: 9, color: '#0a0a0a', letterSpacing: 1, marginBottom: 6 }}>VOLUME</div>
                <ResponsiveContainer width="100%" height={60}>
                  <BarChart data={priceHistory}>
                    <Bar dataKey="volume" fill={`${sectorColor}44`} radius={[2, 2, 0, 0]} isAnimationActive={false} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </>
          ) : (
            <div style={{ height: 240, display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'Space Mono, monospace', fontSize: 11, color: '#0a0a0a' }}>
              {FKEY ? 'Loading chart...' : 'Add VITE_FINNHUB_KEY to Railway variables to enable charts'}
            </div>
          )}
        </div>

        {/* Earnings */}
        {earnings.length > 0 && (
          <>
            <SectionTitle title="Earnings per Share — Last 6 Quarters" color={sectorColor} />
            <div style={{ background: '#ffffff', borderRadius: 12, border: '1px solid #f0f0f0', padding: '20px 24px' }}>
              <ResponsiveContainer width="100%" height={200}>
                <BarChart data={earnings} barGap={4}>
                  <XAxis dataKey="period" tick={{ fill: '#0a0a0a', fontSize: 10, fontFamily: 'Space Mono' }} tickLine={false} axisLine={false} />
                  <YAxis tick={{ fill: '#0a0a0a', fontSize: 10, fontFamily: 'Space Mono' }} tickLine={false} axisLine={false} tickFormatter={v => `$${v}`} width={40} />
                  <Tooltip contentStyle={{ background: '#fafafa', border: `1px solid ${sectorColor}44`, borderRadius: 6, fontFamily: 'Space Mono', fontSize: 11 }} formatter={(v, n) => [`$${v?.toFixed(2)}`, n]} />
                  <ReferenceLine y={0} stroke="#1a1a2e" />
                  <Bar dataKey="estimate" fill="#1a1a2e" name="Estimate" radius={[3, 3, 0, 0]} />
                  <Bar dataKey="actual" name="Actual" radius={[3, 3, 0, 0]} isAnimationActive={false}>
                    {earnings.map((e, i) => <Cell key={i} fill={(e.actual ?? 0) >= (e.estimate ?? 0) ? '#0FA97A' : '#DC3C3C'} />)}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
              <div style={{ display: 'flex', gap: 16, marginTop: 12 }}>
                {[['#1a1a2e', 'Estimate'], ['#0FA97A', 'Beat'], ['#DC3C3C', 'Miss']].map(([c, l]) => (
                  <div key={l} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    <div style={{ width: 10, height: 10, borderRadius: 2, background: c }} />
                    <span style={{ fontFamily: 'Space Mono, monospace', fontSize: 10, color: '#0a0a0a' }}>{l}</span>
                  </div>
                ))}
              </div>
            </div>
          </>
        )}

        {/* Analyst Consensus */}
        {(recommendation || priceTarget) && (
          <>
            <SectionTitle title="Analyst Consensus" color={sectorColor} />
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>
              {recommendation && totalRecs > 0 && (
                <div style={{ background: '#ffffff', borderRadius: 12, border: '1px solid #f0f0f0', padding: '20px 24px' }}>
                  <div style={{ fontFamily: 'Space Mono, monospace', fontSize: 10, color: '#0a0a0a', letterSpacing: 1, marginBottom: 16 }}>ANALYST RATINGS — {totalRecs} analysts</div>
                  {[
                    { label: 'Strong Buy', count: recommendation.strongBuy, color: '#0FA97A' },
                    { label: 'Buy', count: recommendation.buy, color: '#6BCF8F' },
                    { label: 'Hold', count: recommendation.hold, color: '#F0A500' },
                    { label: 'Sell', count: recommendation.sell, color: '#E87070' },
                    { label: 'Strong Sell', count: recommendation.strongSell, color: '#DC3C3C' },
                  ].map(({ label, count, color }) => (
                    <div key={label} style={{ marginBottom: 10 }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                        <span style={{ fontFamily: 'Space Mono, monospace', fontSize: 10, color: '#0a0a0a' }}>{label}</span>
                        <span style={{ fontFamily: 'Space Mono, monospace', fontSize: 10, color }}>{count}</span>
                      </div>
                      <div style={{ height: 6, background: '#ffffff', borderRadius: 3, overflow: 'hidden' }}>
                        <div style={{ height: '100%', width: `${(count / totalRecs) * 100}%`, background: color, borderRadius: 3 }} />
                      </div>
                    </div>
                  ))}
                </div>
              )}
              {priceTarget && (
                <div style={{ background: '#ffffff', borderRadius: 12, border: '1px solid #f0f0f0', padding: '20px 24px' }}>
                  <div style={{ fontFamily: 'Space Mono, monospace', fontSize: 10, color: '#0a0a0a', letterSpacing: 1, marginBottom: 16 }}>PRICE TARGETS</div>
                  {[['High Target', fmt(priceTarget.targetHigh), '#0FA97A'], ['Mean Target', fmt(priceTarget.targetMean), '#F0A500'], ['Low Target', fmt(priceTarget.targetLow), '#DC3C3C'], ['Current Price', fmt(quote?.c), '#fafafa']].map(([l, v, c]) => (
                    <div key={l} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 0', borderBottom: '1px solid #f0f0f0' }}>
                      <span style={{ fontFamily: 'Space Mono, monospace', fontSize: 11, color: '#0a0a0a' }}>{l}</span>
                      <span style={{ fontFamily: 'Space Mono, monospace', fontSize: 14, fontWeight: 700, color: c }}>{v}</span>
                    </div>
                  ))}
                  {quote?.c && priceTarget?.targetMean && (
                    <div style={{ marginTop: 14, padding: '10px 14px', background: priceTarget.targetMean > quote.c ? '#0FA97A18' : '#DC3C3C18', borderRadius: 6 }}>
                      <span style={{ fontFamily: 'Space Mono, monospace', fontSize: 10, color: priceTarget.targetMean > quote.c ? '#0FA97A' : '#DC3C3C' }}>
                        {priceTarget.targetMean > quote.c ? '▲' : '▼'} {Math.abs(((priceTarget.targetMean - quote.c) / quote.c) * 100).toFixed(1)}% to mean target
                      </span>
                    </div>
                  )}
                </div>
              )}
            </div>
          </>
        )}

        {/* Trade via Brokers */}
        <SectionTitle title="Trade This Stock" color={sectorColor} />
        <div style={{ background: '#ffffff', borderRadius: 12, border: '1px solid #f0f0f0', padding: '20px 24px' }}>
          <div style={{ fontFamily: 'Space Mono, monospace', fontSize: 10, color: '#0a0a0a', marginBottom: 16 }}>Opens your broker's page for {company.ticker} — log in to trade</div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 10 }}>
            {BROKERS.map(broker => (
              <a key={broker.name} href={broker.url(company.ticker)} target="_blank" rel="noopener noreferrer"
                style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '12px 16px', borderRadius: 8, border: '1px solid #e8e8e8', background: '#fafafa', cursor: 'pointer', textDecoration: 'none', transition: 'all 0.2s' }}
                onMouseEnter={e => { e.currentTarget.style.borderColor = '#fafafa'; e.currentTarget.style.background = '#0f0f1a'; }}
                onMouseLeave={e => { e.currentTarget.style.borderColor = '#1a1a2e'; e.currentTarget.style.background = '#fafafa'; }}
              >
                <span style={{ fontSize: 18 }}>{broker.emoji}</span>
                <span style={{ fontFamily: 'Syne, sans-serif', fontWeight: 600, fontSize: 12, color: '#0a0a0a' }}>{broker.name}</span>
              </a>
            ))}
          </div>
        </div>

        {/* AI Briefing */}

        {/* Peer Comparison */}
        <SectionTitle title="Peer Comparison" color={sectorColor} />
        <PeerComparison
          currentTicker={ticker}
          currentName={company?.name}
          sectorColor={sectorColor}
          finnhubKey={FKEY}
          sectorId={company?.sectorId}
        />

        <SectionTitle title="AI Intelligence Briefing" color={sectorColor} />
        <div style={{ background: '#ffffff', borderRadius: 12, border: '1px solid #f0f0f0', padding: '24px' }}>
          {briefingState === 'loading' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              {['Querying financial intelligence...', 'Analyzing earnings data...', 'Synthesizing investor briefing...'].map((msg, i) => (
                <div key={i} style={{ padding: '14px 16px', background: '#fafafa', borderRadius: 8, animation: `pulse 1.5s ease-in-out ${i * 0.2}s infinite` }}>
                  <div style={{ fontFamily: 'Space Mono, monospace', fontSize: 11, color: '#0a0a0a', marginBottom: 8 }}>{msg}</div>
                  <div style={{ height: 6, background: '#f0f0f0', borderRadius: 3, overflow: 'hidden' }}>
                    <div style={{ height: '100%', borderRadius: 3, width: '40%', background: `linear-gradient(90deg, transparent, ${sectorColor}, transparent)`, animation: 'shimmer 1.4s ease-in-out infinite' }} />
                  </div>
                </div>
              ))}
            </div>
          )}
          {briefingState === 'error' && (
            <div style={{ padding: 20, background: '#1a0808', border: '1px solid #DC3C3C33', borderRadius: 8 }}>
              <div style={{ fontFamily: 'Space Mono, monospace', fontSize: 11, color: '#DC3C3C', marginBottom: 12 }}>⚠ Failed to load briefing</div>
              <button onClick={fetchBriefing} style={{ background: '#DC3C3C18', border: '1px solid #DC3C3C44', color: '#DC3C3C', fontFamily: 'Space Mono, monospace', fontSize: 10, padding: '6px 14px', borderRadius: 4, cursor: 'pointer' }}>Try again</button>
            </div>
          )}
          {briefingState === 'done' && briefing && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16, animation: 'fadeIn 0.4s ease' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <div style={{ padding: '4px 12px', background: sentCfg.bg, border: `1px solid ${sentCfg.color}44`, borderRadius: 6, fontFamily: 'Space Mono, monospace', fontSize: 10, color: sentCfg.color }}>{sentCfg.label}</div>
                <button onClick={fetchBriefing} style={{ background: 'none', border: '1px solid #e8e8e8', color: '#0a0a0a', fontFamily: 'Space Mono, monospace', fontSize: 9, padding: '4px 10px', borderRadius: 4, cursor: 'pointer' }}>↻ REFRESH</button>
              </div>
              <div style={{ fontFamily: 'Syne, sans-serif', fontSize: 14, color: '#0a0a0a', lineHeight: 1.8 }}>{briefing.summary}</div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
                {[
                  { icon: '📊', label: 'Earnings & Financials', color: '#1A6FD8', data: briefing.earnings },
                  { icon: '🤝', label: 'Investments & Partnerships', color: '#0E7A5A', data: briefing.investments },
                  { icon: '👤', label: 'Leadership & Org', color: '#7B3FBF', data: briefing.leadership },
                  { icon: '⚡', label: 'Products & Patents', color: '#C85C14', data: briefing.products },
                ].map(({ icon, label, color, data }) => data && (
                  <div key={label} style={{ background: '#fafafa', borderRadius: 8, padding: '16px', border: `1px solid ${color}22` }}>
                    <div style={{ fontFamily: 'Space Mono, monospace', fontSize: 9, color, letterSpacing: 1, marginBottom: 8 }}>{icon} {label.toUpperCase()}</div>
                    <div style={{ fontFamily: 'Syne, sans-serif', fontWeight: 600, fontSize: 13, color: '#0a0a0a', marginBottom: 6 }}>{data.headline}</div>
                    <div style={{ fontFamily: 'Syne, sans-serif', fontSize: 12, color: '#0a0a0a', lineHeight: 1.7 }}>{data.detail}</div>
                  </div>
                ))}
              </div>
              <div style={{ padding: '14px 16px', background: '#fafafa', borderRadius: 8, borderLeft: `3px solid ${sectorColor}` }}>
                <div style={{ fontFamily: 'Space Mono, monospace', fontSize: 9, color: sectorColor, marginBottom: 8, letterSpacing: 1 }}>ANALYST OUTLOOK</div>
                <div style={{ fontFamily: 'Syne, sans-serif', fontSize: 13, color: '#0a0a0a', lineHeight: 1.7, fontStyle: 'italic' }}>{briefing.outlook}</div>
              </div>
              <div style={{ fontFamily: 'Space Mono, monospace', fontSize: 9, color: '#0a0a0a', textAlign: 'right' }}>Generated by Claude · Knowledge cutoff applies · Not financial advice</div>
            </div>
          )}
        </div>

        </>}

        <div style={{ marginTop: 32, textAlign: 'center', fontFamily: 'Space Mono, monospace', fontSize: 9, color: '#0a0a0a', lineHeight: 2 }}>
          AIFMI · Market data from Finnhub · Filing data from SEC EDGAR · Not financial advice · Past performance does not indicate future results
        </div>
      </div>
    </div>
  );
}