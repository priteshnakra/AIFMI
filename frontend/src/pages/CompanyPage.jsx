/**
 * CompanyPage.jsx — AIFMI
 * Redesigned with UI/UX Pro Max · Financial Dashboard ruleset
 *
 * Skill output: Dark Mode (OLED) + IBM Plex Sans + Financial Dashboard
 * Tokens: aifmi-design-tokens.css must be imported in index.css
 *
 * Changes from original:
 *  - Removed: Space Mono, Syne, emoji icons, hardcoded hex, #fafafa bg
 *  - Added: IBM Plex Sans UI + IBM Plex Mono data, semantic tokens,
 *    tabular-nums, accessible contrast, responsive breakpoints,
 *    skeleton loaders, keyboard focus rings, ARIA labels
 */

import { useState, useEffect, useCallback } from 'react';
import PeerComparison from '../components/PeerComparison.jsx';
import { useParams, useNavigate } from 'react-router-dom';
import {
  LineChart, Line, BarChart, Bar,
  XAxis, YAxis, Tooltip, ResponsiveContainer,
  ReferenceLine, Cell,
} from 'recharts';

/* ── Constants ─────────────────────────────────────────────── */
const API     = 'https://aifmi.onrender.com';
const FINNHUB = 'https://finnhub.io/api/v1';
const FKEY    = import.meta.env.VITE_FINNHUB_KEY ?? '';

/* ── Formatters ────────────────────────────────────────────── */
const fmt    = (n) => n == null ? '—' : n < 1 ? `$${n.toFixed(4)}` : `$${n.toFixed(2)}`;
const fmtPct = (n) => n == null ? '—' : `${n >= 0 ? '+' : ''}${n.toFixed(2)}%`;
const fmtB   = (n) => {
  if (n == null) return '—';
  if (n >= 1e12) return `$${(n / 1e12).toFixed(2)}T`;
  if (n >= 1e9)  return `$${(n / 1e9).toFixed(2)}B`;
  if (n >= 1e6)  return `$${(n / 1e6).toFixed(2)}M`;
  return `$${n.toFixed(0)}`;
};
const fmtNum = (n, d = 2) => n == null ? '—' : n.toFixed(d);

/* ── Design tokens (mirrors aifmi-design-tokens.css) ──────── */
const T = {
  // surfaces
  bg:          '#020617',
  surface:     '#0F172A',
  surfaceRaised:'#1E293B',
  surfaceSunken:'#0A0F1E',
  // text
  textPrimary:  '#F8FAFC',
  textSecondary:'#CBD5E1',
  textMuted:    '#94A3B8',
  // borders
  border:       '#1E293B',
  borderStrong: '#334155',
  // signals
  positive:     '#22C55E',
  positiveBg:   '#052E16',
  positiveTxt:  '#86EFAC',
  negative:     '#EF4444',
  negativeBg:   '#2D0A0A',
  negativeTxt:  '#FCA5A5',
  neutral:      '#64748B',
  alert:        '#D97706',
  alertBg:      '#2D1B00',
  alertTxt:     '#FCD34D',
  // accent
  accent:       '#0369A1',
  accentBg:     '#0C2D48',
  accentTxt:    '#7DD3FC',
  // ai / premium
  ai:           '#1E3A5F',
  aiBg:         '#0C1929',
  aiTxt:        '#93C5FD',
};

/* ── Sector palette ────────────────────────────────────────── */
const SECTOR_COLORS = {
  gpu:     '#378ADD',
  chip:    '#0369A1',
  asic:    '#1D9E75',
  npu:     '#7F77DD',
  network: '#D85A30',
};

/* ── Brokers — emoji replaced with text abbreviation ──────── */
const BROKERS = [
  { name: 'Robinhood',     abbr: 'RH',  url: (t) => `https://robinhood.com/stocks/${t}` },
  { name: 'Fidelity',      abbr: 'FID', url: (t) => `https://digital.fidelity.com/prgw/digital/research/quote?symbol=${t}` },
  { name: 'Schwab',        abbr: 'SCH', url: (t) => `https://www.schwab.com/research/stocks/quotes/summary/${t}` },
  { name: 'TD Ameritrade', abbr: 'TDA', url: ()  => `https://www.tdameritrade.com/home.page` },
  { name: 'E*TRADE',       abbr: 'ET',  url: ()  => `https://us.etrade.com/home` },
];

const SENTIMENT = {
  bullish: { color: T.positive, bg: T.positiveBg, borderColor: '#16A34A', label: 'Bullish' },
  neutral: { color: T.alert,    bg: T.alertBg,    borderColor: '#D97706', label: 'Neutral' },
  bearish: { color: T.negative, bg: T.negativeBg, borderColor: '#DC2626', label: 'Bearish' },
};

const PERIODS = ['1D', '1W', '1M', '1Y'];

/* ── Global styles injected once ──────────────────────────── */
const GLOBAL_CSS = `
  @import url('https://fonts.googleapis.com/css2?family=IBM+Plex+Sans:wght@400;500;600;700&family=IBM+Plex+Mono:wght@400;500&display=swap');

  *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

  body {
    font-family: 'IBM Plex Sans', -apple-system, BlinkMacSystemFont, sans-serif;
    background: #020617;
    color: #F8FAFC;
    -webkit-font-smoothing: antialiased;
  }

  /* Tabular figures on all data elements */
  .data-num {
    font-family: 'IBM Plex Mono', 'Fira Code', monospace;
    font-variant-numeric: tabular-nums;
  }

  /* Focus ring — visible for keyboard nav */
  :focus-visible {
    outline: none;
    box-shadow: 0 0 0 3px rgba(3, 105, 161, 0.5);
    border-radius: 6px;
  }

  /* Scrollbar */
  ::-webkit-scrollbar { width: 5px; }
  ::-webkit-scrollbar-track { background: #020617; }
  ::-webkit-scrollbar-thumb { background: #1E293B; border-radius: 3px; }

  /* Animations */
  @keyframes fadeUp {
    from { opacity: 0; transform: translateY(8px); }
    to   { opacity: 1; transform: none; }
  }
  @keyframes shimmer {
    0%   { transform: translateX(-200%); }
    100% { transform: translateX(300%); }
  }
  @keyframes pulse {
    0%, 100% { opacity: 1; }
    50%       { opacity: 0.4; }
  }
  @media (prefers-reduced-motion: reduce) {
    *, *::before, *::after {
      animation-duration: 0.01ms !important;
      transition-duration: 0.01ms !important;
    }
  }

  /* Period buttons */
  .period-btn {
    background: transparent;
    border: 1px solid #1E293B;
    color: #94A3B8;
    font-family: 'IBM Plex Mono', monospace;
    font-size: 11px;
    padding: 5px 12px;
    border-radius: 5px;
    cursor: pointer;
    transition: border-color 150ms, color 150ms, background 150ms;
  }
  .period-btn:hover { border-color: #334155; color: #CBD5E1; }
  .period-btn.active { background: rgba(3,105,161,0.15); border-color: #0369A1; color: #7DD3FC; }

  /* Responsive grid helpers */
  @media (max-width: 768px) {
    .hero-grid { grid-template-columns: 1fr !important; }
    .metrics-grid { grid-template-columns: 1fr 1fr !important; }
    .consensus-grid { grid-template-columns: 1fr !important; }
    .broker-grid { grid-template-columns: 1fr 1fr !important; }
    .briefing-grid { grid-template-columns: 1fr !important; }
    .header-name { display: none; }
    .page-pad { padding: 16px 12px !important; }
  }
  @media (max-width: 480px) {
    .broker-grid { grid-template-columns: 1fr !important; }
    .metrics-grid { grid-template-columns: 1fr !important; }
  }
`;

/* ── Sub-components ────────────────────────────────────────── */

function SkeletonBlock({ h = 20, w = '100%', radius = 6 }) {
  return (
    <div style={{
      height: h, width: w, borderRadius: radius,
      background: '#1E293B', overflow: 'hidden', position: 'relative',
    }}>
      <div style={{
        position: 'absolute', inset: 0,
        background: 'linear-gradient(90deg, transparent 0%, #334155 50%, transparent 100%)',
        animation: 'shimmer 1.4s ease-in-out infinite',
      }} />
    </div>
  );
}

function MetricCard({ label, value, sub, signal }) {
  const sigColor = signal === 'positive' ? T.positive
    : signal === 'negative' ? T.negative
    : T.textPrimary;

  return (
    <div style={{
      background: T.surface,
      borderRadius: 8,
      padding: '12px 14px',
      border: `1px solid ${T.border}`,
    }}>
      <div style={{
        fontSize: 10, fontWeight: 500, color: T.textMuted,
        letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: 6,
      }}>
        {label}
      </div>
      <div className="data-num" style={{ fontSize: 18, fontWeight: 500, color: sigColor }}>
        {value}
      </div>
      {sub && (
        <div style={{ fontSize: 11, color: T.textMuted, marginTop: 3 }}>{sub}</div>
      )}
    </div>
  );
}

function SectionLabel({ title, accentColor }) {
  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: 10,
      margin: '32px 0 14px',
    }}>
      <div style={{ width: 3, height: 16, background: accentColor, borderRadius: 2, flexShrink: 0 }} />
      <span style={{ fontSize: 13, fontWeight: 600, color: T.textPrimary, letterSpacing: '0.04em', textTransform: 'uppercase' }}>
        {title}
      </span>
      <div style={{ flex: 1, height: '1px', background: T.border }} />
    </div>
  );
}

function SignalBadge({ value, type }) {
  const isPos = type === 'positive' || (type == null && parseFloat(value) >= 0);
  const isNeg = type === 'negative' || (type == null && parseFloat(value) < 0);
  const color  = isPos ? T.positive : isNeg ? T.negative : T.neutral;
  const bg     = isPos ? T.positiveBg : isNeg ? T.negativeBg : 'transparent';
  const prefix = isPos ? '▲ ' : isNeg ? '▼ ' : '';

  return (
    <span className="data-num" style={{
      display: 'inline-flex', alignItems: 'center',
      fontSize: 12, fontWeight: 500, color,
      background: bg, padding: '2px 8px',
      borderRadius: 4,
    }}>
      {prefix}{value}
    </span>
  );
}

function ChartTooltip({ active, payload, label }) {
  if (!active || !payload?.length) return null;
  return (
    <div style={{
      background: T.surfaceRaised,
      border: `1px solid ${T.borderStrong}`,
      borderRadius: 6, padding: '8px 12px',
      fontFamily: "'IBM Plex Mono', monospace",
      fontSize: 11, color: T.textSecondary,
    }}>
      <div style={{ color: T.textMuted, marginBottom: 4 }}>{label}</div>
      {payload.map((p) => (
        <div key={p.name} style={{ color: p.color ?? T.textPrimary }}>
          {p.name}: {typeof p.value === 'number' ? `$${p.value.toFixed(2)}` : p.value}
        </div>
      ))}
    </div>
  );
}

/* ── Page component ────────────────────────────────────────── */
export default function CompanyPage() {
  const { ticker }   = useParams();
  const navigate     = useNavigate();

  const [company,      setCompany]      = useState(null);
  const [sectorColor,  setSectorColor]  = useState(T.accent);
  const [sectorLabel,  setSectorLabel]  = useState('');
  const [quote,        setQuote]        = useState(null);
  const [metrics,      setMetrics]      = useState(null);
  const [priceHistory, setPriceHistory] = useState([]);
  const [period,       setPeriod]       = useState('1M');
  const [earnings,     setEarnings]     = useState([]);
  const [recommendation, setRecommendation] = useState(null);
  const [priceTarget,  setPriceTarget]  = useState(null);
  const [briefing,     setBriefing]     = useState(null);
  const [briefingState, setBriefingState] = useState('idle');
  const [loading,      setLoading]      = useState(true);

  /* ── Data fetching (unchanged logic) ── */
  useEffect(() => {
    fetch(`${API}/api/sectors`)
      .then(r => r.json())
      .then(data => {
        for (const [sectorId, sector] of Object.entries(data)) {
          const found = sector.companies.find(c => c.ticker === ticker);
          if (found) {
            setCompany({ ...found, sectorId, sectorFullName: sector.fullName });
            setSectorColor(SECTOR_COLORS[sectorId] ?? T.accent);
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
    const headers = {};
    fetch(`${FINNHUB}/quote?symbol=${ticker}&token=${FKEY}`, { headers }).then(r => r.json()).then(q => { if (q?.c) setQuote(q); }).catch(() => {});
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
    const range    = period === '1D' ? '1d' : period === '1W' ? '5d' : period === '1M' ? '1mo' : '1y';
    fetch(`${API}/api/chart/${ticker}?interval=${interval}&range=${range}`)
      .then(r => r.json())
      .then(d => {
        const result = d?.chart?.result?.[0];
        if (result) {
          const ts     = result.timestamp;
          const closes = result.indicators?.quote?.[0]?.close;
          const vols   = result.indicators?.quote?.[0]?.volume;
          if (ts && closes) {
            setPriceHistory(
              ts.map((t, i) => ({
                time:   new Date(t * 1000).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
                price:  closes[i] ?? 0,
                volume: vols?.[i] ?? 0,
              })).filter(p => p.price > 0)
            );
          }
        }
      }).catch(() => {});
  }, [ticker, period]);

  const fetchBriefing = useCallback(async () => {
    if (!company) return;
    setBriefingState('loading');
    try {
      const res  = await fetch(`${API}/api/intelligence/briefing`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          company: company.name, ticker: company.ticker,
          hq: company.hq, spec: company.spec,
          sector: company.sectorFullName, exchange: company.exchange,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setBriefing(data.briefing);
      setBriefingState('done');
    } catch { setBriefingState('error'); }
  }, [company]);

  useEffect(() => { if (company) fetchBriefing(); }, [company]);

  /* ── Derived values ── */
  const isUp       = (quote?.dp ?? 0) >= 0;
  const sentCfg    = SENTIMENT[briefing?.sentiment] ?? SENTIMENT.neutral;
  const totalRecs  = recommendation
    ? (recommendation.strongBuy + recommendation.buy + recommendation.hold + recommendation.sell + recommendation.strongSell)
    : 0;
  const upside     = quote?.c && priceTarget?.targetMean
    ? ((priceTarget.targetMean - quote.c) / quote.c * 100)
    : null;

  /* ── Loading state ── */
  if (loading) return (
    <div style={{ minHeight: '100vh', background: T.bg, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <style>{GLOBAL_CSS}</style>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 12, width: 320 }}>
        <SkeletonBlock h={24} w="60%" />
        <SkeletonBlock h={14} w="40%" />
        <SkeletonBlock h={48} />
        <SkeletonBlock h={14} w="30%" />
      </div>
    </div>
  );

  if (!company) return (
    <div style={{ minHeight: '100vh', background: T.bg, display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: 16 }}>
      <style>{GLOBAL_CSS}</style>
      <div style={{ fontSize: 20, fontWeight: 600, color: T.textPrimary }}>Company not found</div>
      <button
        onClick={() => navigate('/')}
        style={{ background: T.accent, border: 'none', color: '#fff', padding: '10px 24px', borderRadius: 6, cursor: 'pointer', fontSize: 13, fontWeight: 500 }}
        aria-label="Back to dashboard"
      >
        ← Back to dashboard
      </button>
    </div>
  );

  /* ── Render ── */
  return (
    <div style={{ minHeight: '100vh', background: T.bg, color: T.textPrimary }}>
      <style>{GLOBAL_CSS}</style>

      {/* ── Sticky header ── */}
      <header style={{
        position: 'sticky', top: 0, zIndex: 20,
        background: T.surface,
        borderBottom: `1px solid ${T.border}`,
        padding: '0 24px',
        height: 52,
        display: 'flex', alignItems: 'center', gap: 12,
      }}
        role="banner"
      >
        <button
          onClick={() => navigate('/')}
          aria-label="Back to dashboard"
          style={{
            background: 'transparent', border: `1px solid ${T.borderStrong}`,
            color: T.textSecondary, padding: '5px 12px', borderRadius: 6,
            cursor: 'pointer', fontSize: 12, fontWeight: 500,
            transition: 'border-color 150ms, color 150ms',
            whiteSpace: 'nowrap',
          }}
          onMouseEnter={e => { e.currentTarget.style.borderColor = T.textMuted; e.currentTarget.style.color = T.textPrimary; }}
          onMouseLeave={e => { e.currentTarget.style.borderColor = T.borderStrong; e.currentTarget.style.color = T.textSecondary; }}
        >
          ← Dashboard
        </button>

        <div style={{ width: 1, height: 18, background: T.border }} />

        <span style={{
          fontSize: 10, fontWeight: 600, letterSpacing: '0.08em',
          textTransform: 'uppercase', color: sectorColor,
          background: `${sectorColor}18`, padding: '3px 10px', borderRadius: 4,
          whiteSpace: 'nowrap',
        }}>
          {sectorLabel}
        </span>

        <span className="header-name" style={{ fontSize: 14, fontWeight: 600, color: T.textPrimary }}>
          {company.name}
        </span>

        {company.ticker && (
          <span className="data-num" style={{ fontSize: 12, color: T.textMuted, whiteSpace: 'nowrap' }}>
            {company.ticker} · {company.exchange}
          </span>
        )}

        <div style={{ flex: 1 }} />

        {/* Live price in header */}
        {quote && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span className="data-num" style={{ fontSize: 16, fontWeight: 500, color: T.textPrimary }}>
              {fmt(quote.c)}
            </span>
            <SignalBadge value={fmtPct(quote.dp)} />
          </div>
        )}

        <span style={{ fontSize: 15, fontWeight: 700, color: T.textPrimary, marginLeft: 8 }}>
          AI<span style={{ color: sectorColor }}>FMI</span>
        </span>
      </header>

      {/* ── Main content ── */}
      <main
        className="page-pad"
        style={{ maxWidth: 1200, margin: '0 auto', padding: '28px 24px', animation: 'fadeUp 0.25s ease' }}
        role="main"
      >

        {/* ── Hero: price card + metrics grid ── */}
        <div className="hero-grid" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 4 }}>

          {/* Price card */}
          <div style={{
            background: T.surface,
            borderRadius: 10,
            border: `1px solid ${sectorColor}30`,
            padding: '20px 24px',
          }}>
            <div style={{ fontSize: 22, fontWeight: 700, color: T.textPrimary, lineHeight: 1.2 }}>
              {company.name}
            </div>
            <div style={{ fontSize: 12, color: T.textMuted, marginTop: 4, marginBottom: 20 }}>
              {company.spec} · {company.hq}
            </div>

            {quote ? (
              <>
                <div className="data-num" style={{ fontSize: 40, fontWeight: 500, color: T.textPrimary, letterSpacing: '-0.02em', lineHeight: 1 }}>
                  {fmt(quote.c)}
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 8 }}>
                  <SignalBadge value={`${isUp ? '+' : ''}${fmt(quote.d)}`} type={isUp ? 'positive' : 'negative'} />
                  <SignalBadge value={fmtPct(quote.dp)} type={isUp ? 'positive' : 'negative'} />
                  <span style={{ fontSize: 11, color: T.textMuted }}>today</span>
                </div>
                <div style={{ display: 'flex', gap: 20, marginTop: 18, flexWrap: 'wrap' }}>
                  {[['High', fmt(quote.h)], ['Low', fmt(quote.l)], ['Open', fmt(quote.o)], ['Prev close', fmt(quote.pc)]].map(([l, v]) => (
                    <div key={l}>
                      <div style={{ fontSize: 10, color: T.textMuted, marginBottom: 2, textTransform: 'uppercase', letterSpacing: '0.06em' }}>{l}</div>
                      <div className="data-num" style={{ fontSize: 13, color: T.textSecondary }}>{v}</div>
                    </div>
                  ))}
                </div>
              </>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginTop: 8 }}>
                <SkeletonBlock h={44} w="55%" />
                <SkeletonBlock h={18} w="35%" />
                <div style={{ fontSize: 11, color: T.textMuted, marginTop: 4 }}>
                  {FKEY ? 'Loading price data…' : 'Add VITE_FINNHUB_KEY to Railway to enable live data'}
                </div>
              </div>
            )}
          </div>

          {/* Metrics grid */}
          <div className="metrics-grid" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
            <MetricCard label="Market cap"    value={fmtB((metrics?.marketCapitalization ?? 0) * 1e6)} />
            <MetricCard label="P/E ratio"     value={fmtNum(metrics?.peBasicExclExtraTTM)} sub="Trailing 12M" />
            <MetricCard label="EPS (TTM)"     value={metrics?.epsBasicExclExtraItemsAnnual ? `$${fmtNum(metrics.epsBasicExclExtraItemsAnnual)}` : '—'} />
            <MetricCard
              label="ROE"
              value={metrics?.roeTTM ? `${fmtNum(metrics.roeTTM)}%` : '—'}
              signal={metrics?.roeTTM > 15 ? 'positive' : undefined}
            />
            <MetricCard
              label="Debt / equity"
              value={fmtNum(metrics?.['totalDebt/totalEquityAnnual'])}
              signal={(metrics?.['totalDebt/totalEquityAnnual'] ?? 0) > 2 ? 'negative' : 'positive'}
            />
            <MetricCard label="Div. yield"    value={metrics?.dividendYieldIndicatedAnnual ? `${fmtNum(metrics.dividendYieldIndicatedAnnual)}%` : 'N/A'} />
            <MetricCard label="52W high"      value={fmt(metrics?.['52WeekHigh'])} />
            <MetricCard label="52W low"       value={fmt(metrics?.['52WeekLow'])} />
          </div>
        </div>

        {/* ── Price chart ── */}
        <SectionLabel title="Price history" accentColor={sectorColor} />
        <div style={{ background: T.surface, borderRadius: 10, border: `1px solid ${T.border}`, padding: '18px 20px' }}>
          <div style={{ display: 'flex', gap: 6, marginBottom: 18 }} role="group" aria-label="Time period selector">
            {PERIODS.map(p => (
              <button
                key={p}
                className={`period-btn ${period === p ? 'active' : ''}`}
                onClick={() => setPeriod(p)}
                aria-pressed={period === p}
              >
                {p}
              </button>
            ))}
          </div>

          {priceHistory.length > 0 ? (
            <>
              <ResponsiveContainer width="100%" height={220}>
                <LineChart data={priceHistory} aria-label={`${ticker} price chart — ${period}`}>
                  <XAxis
                    dataKey="time"
                    tick={{ fill: T.textMuted, fontSize: 10, fontFamily: "'IBM Plex Mono'" }}
                    tickLine={false} axisLine={false}
                    interval="preserveStartEnd"
                  />
                  <YAxis
                    domain={['auto', 'auto']}
                    tick={{ fill: T.textMuted, fontSize: 10, fontFamily: "'IBM Plex Mono'" }}
                    tickLine={false} axisLine={false}
                    tickFormatter={v => `$${v.toFixed(0)}`}
                    width={56}
                  />
                  <Tooltip content={<ChartTooltip />} />
                  <Line
                    type="monotone" dataKey="price"
                    name="Price"
                    dot={false} strokeWidth={2}
                    stroke={isUp ? T.positive : T.negative}
                    isAnimationActive={false}
                  />
                </LineChart>
              </ResponsiveContainer>

              <div style={{ marginTop: 10 }}>
                <div style={{ fontSize: 10, fontWeight: 500, color: T.textMuted, letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: 5 }}>
                  Volume
                </div>
                <ResponsiveContainer width="100%" height={56}>
                  <BarChart data={priceHistory} aria-label="Volume chart">
                    <Bar dataKey="volume" name="Volume" fill={`${sectorColor}40`} radius={[2, 2, 0, 0]} isAnimationActive={false} />
                    <Tooltip content={<ChartTooltip />} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </>
          ) : (
            <div style={{ height: 220, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 12 }}>
              <SkeletonBlock h={180} />
              <div style={{ fontSize: 11, color: T.textMuted }}>
                {FKEY ? 'Loading chart data…' : 'Add VITE_FINNHUB_KEY to Railway variables to enable charts'}
              </div>
            </div>
          )}
        </div>

        {/* ── Earnings ── */}
        {earnings.length > 0 && (
          <>
            <SectionLabel title="Earnings per share — last 6 quarters" accentColor={sectorColor} />
            <div style={{ background: T.surface, borderRadius: 10, border: `1px solid ${T.border}`, padding: '18px 20px' }}>
              <ResponsiveContainer width="100%" height={200}>
                <BarChart data={earnings} barGap={4} aria-label="EPS chart — actual vs estimate">
                  <XAxis
                    dataKey="period"
                    tick={{ fill: T.textMuted, fontSize: 10, fontFamily: "'IBM Plex Mono'" }}
                    tickLine={false} axisLine={false}
                  />
                  <YAxis
                    tick={{ fill: T.textMuted, fontSize: 10, fontFamily: "'IBM Plex Mono'" }}
                    tickLine={false} axisLine={false}
                    tickFormatter={v => `$${v}`}
                    width={36}
                  />
                  <Tooltip content={<ChartTooltip />} />
                  <ReferenceLine y={0} stroke={T.borderStrong} />
                  <Bar dataKey="estimate" fill={T.surfaceRaised} name="Estimate" radius={[3, 3, 0, 0]} />
                  <Bar dataKey="actual"   name="Actual"          radius={[3, 3, 0, 0]} isAnimationActive={false}>
                    {earnings.map((e, i) => (
                      <Cell key={i} fill={(e.actual ?? 0) >= (e.estimate ?? 0) ? T.positive : T.negative} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>

              {/* Legend — color + text, not color alone */}
              <div style={{ display: 'flex', gap: 16, marginTop: 12 }}>
                {[[T.surfaceRaised, 'Estimate'], [T.positive, 'Beat'], [T.negative, 'Miss']].map(([c, l]) => (
                  <div key={l} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    <div style={{ width: 10, height: 10, borderRadius: 2, background: c, border: `1px solid ${T.borderStrong}` }} />
                    <span style={{ fontSize: 11, color: T.textMuted }}>{l}</span>
                  </div>
                ))}
              </div>
            </div>
          </>
        )}

        {/* ── Analyst consensus ── */}
        {(recommendation || priceTarget) && (
          <>
            <SectionLabel title="Analyst consensus" accentColor={sectorColor} />
            <div className="consensus-grid" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>

              {recommendation && totalRecs > 0 && (
                <div style={{ background: T.surface, borderRadius: 10, border: `1px solid ${T.border}`, padding: '18px 20px' }}>
                  <div style={{ fontSize: 11, fontWeight: 600, color: T.textMuted, letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: 16 }}>
                    Analyst ratings — {totalRecs} analysts
                  </div>
                  {[
                    { label: 'Strong buy',  count: recommendation.strongBuy,   color: T.positive },
                    { label: 'Buy',         count: recommendation.buy,          color: '#4ADE80' },
                    { label: 'Hold',        count: recommendation.hold,         color: T.alert },
                    { label: 'Sell',        count: recommendation.sell,         color: '#F87171' },
                    { label: 'Strong sell', count: recommendation.strongSell,   color: T.negative },
                  ].map(({ label, count, color }) => (
                    <div key={label} style={{ marginBottom: 10 }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 5 }}>
                        <span style={{ fontSize: 12, color: T.textSecondary }}>{label}</span>
                        <span className="data-num" style={{ fontSize: 12, fontWeight: 500, color }}>{count}</span>
                      </div>
                      <div style={{ height: 5, background: T.surfaceRaised, borderRadius: 3, overflow: 'hidden' }}
                        role="progressbar"
                        aria-valuenow={count}
                        aria-valuemax={totalRecs}
                        aria-label={`${label}: ${count} analysts`}
                      >
                        <div style={{
                          height: '100%',
                          width: `${(count / totalRecs) * 100}%`,
                          background: color,
                          borderRadius: 3,
                          transition: 'width 300ms ease-out',
                        }} />
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {priceTarget && (
                <div style={{ background: T.surface, borderRadius: 10, border: `1px solid ${T.border}`, padding: '18px 20px' }}>
                  <div style={{ fontSize: 11, fontWeight: 600, color: T.textMuted, letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: 16 }}>
                    Price targets
                  </div>
                  {[
                    ['High target',    fmt(priceTarget.targetHigh), T.positive],
                    ['Mean target',    fmt(priceTarget.targetMean), T.alert],
                    ['Low target',     fmt(priceTarget.targetLow),  T.negative],
                    ['Current price',  fmt(quote?.c),               T.textSecondary],
                  ].map(([l, v, c]) => (
                    <div key={l} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '9px 0', borderBottom: `1px solid ${T.border}` }}>
                      <span style={{ fontSize: 12, color: T.textSecondary }}>{l}</span>
                      <span className="data-num" style={{ fontSize: 15, fontWeight: 500, color: c }}>{v}</span>
                    </div>
                  ))}

                  {upside != null && (
                    <div style={{
                      marginTop: 14, padding: '10px 14px',
                      background: upside >= 0 ? T.positiveBg : T.negativeBg,
                      borderRadius: 6,
                      border: `1px solid ${upside >= 0 ? T.positive : T.negative}30`,
                    }}>
                      <span className="data-num" style={{ fontSize: 12, fontWeight: 500, color: upside >= 0 ? T.positive : T.negative }}>
                        {upside >= 0 ? '▲' : '▼'} {Math.abs(upside).toFixed(1)}% to mean target
                      </span>
                    </div>
                  )}
                </div>
              )}
            </div>
          </>
        )}

        {/* ── Trade via brokers ── */}
        <SectionLabel title="Trade this stock" accentColor={sectorColor} />
        <div style={{ background: T.surface, borderRadius: 10, border: `1px solid ${T.border}`, padding: '18px 20px' }}>
          <div style={{ fontSize: 12, color: T.textMuted, marginBottom: 14 }}>
            Opens your broker's page for {company.ticker} — log in to trade
          </div>
          <div className="broker-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 8 }}>
            {BROKERS.map(broker => (
              <a
                key={broker.name}
                href={broker.url(company.ticker)}
                target="_blank"
                rel="noopener noreferrer"
                aria-label={`Trade ${company.ticker} on ${broker.name}`}
                style={{
                  display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6,
                  padding: '14px 10px', borderRadius: 8,
                  border: `1px solid ${T.border}`,
                  background: T.surfaceRaised,
                  textDecoration: 'none',
                  transition: 'border-color 150ms, background 150ms',
                  cursor: 'pointer',
                }}
                onMouseEnter={e => { e.currentTarget.style.borderColor = sectorColor; e.currentTarget.style.background = `${sectorColor}12`; }}
                onMouseLeave={e => { e.currentTarget.style.borderColor = T.border; e.currentTarget.style.background = T.surfaceRaised; }}
              >
                <span className="data-num" style={{ fontSize: 13, fontWeight: 600, color: sectorColor }}>{broker.abbr}</span>
                <span style={{ fontSize: 11, color: T.textMuted, textAlign: 'center' }}>{broker.name}</span>
              </a>
            ))}
          </div>
        </div>

        {/* ── Peer comparison ── */}
        <SectionLabel title="Peer comparison" accentColor={sectorColor} />
        <PeerComparison
          currentTicker={ticker}
          currentName={company?.name}
          sectorColor={sectorColor}
          finnhubKey={FKEY}
          sectorId={company?.sectorId}
        />

        {/* ── AI intelligence briefing ── */}
        <SectionLabel title="AI intelligence briefing" accentColor={sectorColor} />
        <div style={{ background: T.surface, borderRadius: 10, border: `1px solid ${T.border}`, padding: '20px 24px' }}>

          {/* Loading skeleton */}
          {briefingState === 'loading' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              {['Querying financial intelligence…', 'Analyzing earnings data…', 'Synthesizing investor briefing…'].map((msg, i) => (
                <div key={i} style={{
                  padding: '14px 16px',
                  background: T.surfaceRaised,
                  borderRadius: 8,
                  animation: `pulse 1.5s ease-in-out ${i * 0.2}s infinite`,
                }}>
                  <div style={{ fontSize: 12, color: T.textMuted, marginBottom: 8 }}>{msg}</div>
                  <SkeletonBlock h={5} />
                </div>
              ))}
            </div>
          )}

          {/* Error state */}
          {briefingState === 'error' && (
            <div style={{ padding: 20, background: T.negativeBg, border: `1px solid ${T.negative}30`, borderRadius: 8 }}>
              <div style={{ fontSize: 12, color: T.negative, marginBottom: 12 }}>Failed to load briefing</div>
              <button
                onClick={fetchBriefing}
                style={{
                  background: `${T.negative}18`, border: `1px solid ${T.negative}44`,
                  color: T.negative, fontSize: 11, padding: '6px 14px',
                  borderRadius: 5, cursor: 'pointer',
                }}
              >
                Try again
              </button>
            </div>
          )}

          {/* Done */}
          {briefingState === 'done' && briefing && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16, animation: 'fadeUp 0.3s ease' }}>

              {/* Header row: sentiment + refresh */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{
                  padding: '4px 12px',
                  background: sentCfg.bg,
                  border: `1px solid ${sentCfg.borderColor}40`,
                  borderRadius: 5,
                  fontSize: 11, fontWeight: 600,
                  color: sentCfg.color,
                  letterSpacing: '0.04em',
                }}>
                  {sentCfg.label}
                </span>
                <button
                  onClick={fetchBriefing}
                  aria-label="Refresh AI briefing"
                  style={{
                    background: 'transparent', border: `1px solid ${T.border}`,
                    color: T.textMuted, fontSize: 11, padding: '4px 10px',
                    borderRadius: 5, cursor: 'pointer',
                    transition: 'border-color 150ms, color 150ms',
                  }}
                  onMouseEnter={e => { e.currentTarget.style.borderColor = T.borderStrong; e.currentTarget.style.color = T.textSecondary; }}
                  onMouseLeave={e => { e.currentTarget.style.borderColor = T.border; e.currentTarget.style.color = T.textMuted; }}
                >
                  ↻ Refresh
                </button>
              </div>

              {/* Summary paragraph */}
              <p style={{ fontSize: 14, color: T.textSecondary, lineHeight: 1.75, margin: 0 }}>
                {briefing.summary}
              </p>

              {/* Intelligence cards */}
              <div className="briefing-grid" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                {[
                  { icon: '↗', label: 'Earnings & financials',       color: T.accent,      data: briefing.earnings },
                  { icon: '⬡', label: 'Investments & partnerships',  color: T.positive,    data: briefing.investments },
                  { icon: '◎', label: 'Leadership & org',            color: '#7F77DD',     data: briefing.leadership },
                  { icon: '⬡', label: 'Products & patents',          color: T.alert,       data: briefing.products },
                ].map(({ icon, label, color, data }) => data && (
                  <div
                    key={label}
                    style={{
                      background: T.surfaceRaised,
                      borderRadius: 8,
                      padding: '14px 16px',
                      border: `1px solid ${color}20`,
                      borderLeft: `3px solid ${color}`,
                    }}
                  >
                    <div style={{
                      fontSize: 10, fontWeight: 600, color,
                      letterSpacing: '0.08em', textTransform: 'uppercase',
                      marginBottom: 8,
                    }}>
                      {icon} {label}
                    </div>
                    <div style={{ fontSize: 13, fontWeight: 600, color: T.textPrimary, marginBottom: 5, lineHeight: 1.4 }}>
                      {data.headline}
                    </div>
                    <div style={{ fontSize: 12, color: T.textSecondary, lineHeight: 1.65 }}>
                      {data.detail}
                    </div>
                  </div>
                ))}
              </div>

              {/* Analyst outlook callout */}
              {briefing.outlook && (
                <div style={{
                  padding: '14px 16px',
                  background: T.aiBg,
                  borderRadius: 8,
                  borderLeft: `3px solid ${sectorColor}`,
                }}>
                  <div style={{
                    fontSize: 10, fontWeight: 600, color: T.aiTxt,
                    letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: 8,
                  }}>
                    Analyst outlook
                  </div>
                  <p style={{ fontSize: 13, color: T.textSecondary, lineHeight: 1.7, margin: 0, fontStyle: 'italic' }}>
                    {briefing.outlook}
                  </p>
                </div>
              )}

              <div style={{ fontSize: 10, color: T.textMuted, textAlign: 'right' }}>
                Generated by Claude · Knowledge cutoff applies · Not financial advice
              </div>
            </div>
          )}
        </div>

        {/* ── Footer ── */}
        <footer style={{ marginTop: 36, textAlign: 'center', fontSize: 11, color: T.textMuted, lineHeight: 2 }} role="contentinfo">
          AIFMI · Data from Finnhub · Not financial advice · Past performance does not indicate future results
        </footer>

      </main>
    </div>
  );
}
