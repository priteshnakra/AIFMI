import { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, ReferenceLine, Cell } from 'recharts';

const API = 'https://aifmi-production.up.railway.app';
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
    <div style={{ background: '#0a0a12', borderRadius: 8, padding: '14px 16px', border: '1px solid #0f0f1a' }}>
      <div style={{ fontFamily: 'Space Mono, monospace', fontSize: 9, color: '#444', letterSpacing: 1, marginBottom: 6, textTransform: 'uppercase' }}>{label}</div>
      <div style={{ fontFamily: 'Syne, sans-serif', fontWeight: 700, fontSize: 18, color: color ?? '#f0f0f0' }}>{value}</div>
      {sub && <div style={{ fontFamily: 'Space Mono, monospace', fontSize: 9, color: '#555', marginTop: 4 }}>{sub}</div>}
    </div>
  );
}

function SectionTitle({ title, color }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 12, margin: '28px 0 16px' }}>
      <div style={{ width: 3, height: 18, background: color, borderRadius: 2 }} />
      <span style={{ fontFamily: 'Syne, sans-serif', fontWeight: 800, fontSize: 16, color: '#fff' }}>{title}</span>
      <div style={{ flex: 1, height: 1, background: `${color}22` }} />
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
    if (!ticker || !FKEY) return;
    const now = Math.floor(Date.now() / 1000);
    const ranges = { '1D': 86400, '1W': 604800, '1M': 2592000, '1Y': 31536000 };
    const resolutions = { '1D': '5', '1W': '60', '1M': 'D', '1Y': 'W' };
    const from = now - ranges[period];
    fetch(`${FINNHUB}/stock/candle?symbol=${ticker}&resolution=${resolutions[period]}&from=${from}&to=${now}&token=${FKEY}`)
      .then(r => r.json())
      .then(d => {
        if (d?.c && d.s === 'ok') {
          setPriceHistory(d.t.map((t, i) => ({
            time: new Date(t * 1000).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
            price: d.c[i], volume: d.v[i],
          })));
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
    <div style={{ minHeight: '100vh', background: '#050508', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div style={{ fontFamily: 'Space Mono, monospace', color: '#444' }}>Loading...</div>
    </div>
  );

  if (!company) return (
    <div style={{ minHeight: '100vh', background: '#050508', display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: 16 }}>
      <div style={{ fontFamily: 'Syne, sans-serif', color: '#fff', fontSize: 24 }}>Company not found</div>
      <button onClick={() => navigate('/')} style={{ background: '#1A6FD8', border: 'none', color: '#fff', padding: '10px 24px', borderRadius: 6, cursor: 'pointer', fontFamily: 'Space Mono, monospace' }}>← Back</button>
    </div>
  );

  return (
    <div style={{ minHeight: '100vh', background: '#050508', color: '#f0f0f0' }}>
      <style>{`
        * { box-sizing: border-box; margin: 0; padding: 0; }
        body { background: #050508; }
        @keyframes fadeIn { from{opacity:0;transform:translateY(6px)} to{opacity:1;transform:none} }
        @keyframes pulse { 0%,100%{opacity:1} 50%{opacity:0.4} }
        @keyframes shimmer { 0%{transform:translateX(-200%)} 100%{transform:translateX(300%)} }
        ::-webkit-scrollbar{width:6px} ::-webkit-scrollbar-track{background:#050508} ::-webkit-scrollbar-thumb{background:#1a1a2e;border-radius:3px}
        .pbtn { background:none; border:1px solid #1a1a2e; color:#555; fontFamily:'Space Mono',monospace; fontSize:10px; padding:4px 10px; borderRadius:4px; cursor:pointer; transition:all 0.15s; }
        .pbtn:hover { border-color:#333; color:#aaa; }
        .pbtn.active { background:${sectorColor}22; border-color:${sectorColor}; color:${sectorColor}; }
      `}</style>

      {/* Header */}
      <header style={{ borderBottom: '1px solid #0f0f1a', padding: '14px 32px', background: '#070710', position: 'sticky', top: 0, zIndex: 100, display: 'flex', alignItems: 'center', gap: 16 }}>
        <button onClick={() => navigate('/')} style={{ background: 'none', border: '1px solid #1a1a2e', color: '#555', padding: '6px 14px', borderRadius: 6, cursor: 'pointer', fontFamily: 'Space Mono, monospace', fontSize: 11 }}>← Dashboard</button>
        <div style={{ height: 20, width: 1, background: '#1a1a2e' }} />
        <span style={{ fontFamily: 'Space Mono, monospace', fontSize: 10, color: sectorColor, background: `${sectorColor}18`, padding: '3px 10px', borderRadius: 4 }}>{sectorLabel}</span>
        <span style={{ fontFamily: 'Syne, sans-serif', fontWeight: 700, fontSize: 16, color: '#fff' }}>{company.name}</span>
        {company.ticker && <span style={{ fontFamily: 'Space Mono, monospace', fontSize: 12, color: '#555' }}>{company.ticker} · {company.exchange}</span>}
        <div style={{ flex: 1 }} />
        <span style={{ fontFamily: 'Syne, sans-serif', fontWeight: 800, fontSize: 18, color: '#fff' }}>AI<span style={{ color: '#1A6FD8' }}>FMI</span></span>
      </header>

      <div style={{ maxWidth: 1200, margin: '0 auto', padding: '32px 24px', animation: 'fadeIn 0.3s ease' }}>

        {/* Hero */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20, marginBottom: 8 }}>
          <div style={{ background: '#08080f', borderRadius: 12, border: `1px solid ${sectorColor}33`, padding: '24px 28px' }}>
            <div style={{ fontFamily: 'Syne, sans-serif', fontWeight: 800, fontSize: 28, color: '#fff', marginBottom: 4 }}>{company.name}</div>
            <div style={{ fontFamily: 'Space Mono, monospace', fontSize: 12, color: '#555', marginBottom: 20 }}>{company.spec} · {company.hq}</div>
            {quote ? (
              <>
                <div style={{ fontFamily: 'Space Mono, monospace', fontSize: 42, fontWeight: 700, color: '#fff', letterSpacing: -1 }}>{fmt(quote.c)}</div>
                <div style={{ fontFamily: 'Space Mono, monospace', fontSize: 14, color: isUp ? '#0FA97A' : '#DC3C3C', marginTop: 6 }}>
                  {isUp ? '+' : ''}{fmt(quote.d)} ({fmtPct(quote.dp)}) today
                </div>
                <div style={{ display: 'flex', gap: 20, marginTop: 16 }}>
                  {[['HIGH', fmt(quote.h)], ['LOW', fmt(quote.l)], ['OPEN', fmt(quote.o)], ['PREV CLOSE', fmt(quote.pc)]].map(([l, v]) => (
                    <div key={l}><div style={{ fontFamily: 'Space Mono, monospace', fontSize: 9, color: '#444', marginBottom: 4 }}>{l}</div><div style={{ fontFamily: 'Space Mono, monospace', fontSize: 12, color: '#aaa' }}>{v}</div></div>
                  ))}
                </div>
              </>
            ) : (
              <div style={{ fontFamily: 'Space Mono, monospace', color: '#333', fontStyle: 'italic' }}>
                {FKEY ? 'Loading price data...' : 'Add VITE_FINNHUB_KEY to Railway to enable live data'}
              </div>
            )}
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
            <MetricCard label="Market Cap" value={fmtB((metrics?.marketCapitalization ?? 0) * 1e6)} />
            <MetricCard label="P/E Ratio" value={fmtNum(metrics?.peBasicExclExtraTTM)} sub="Trailing 12M" />
            <MetricCard label="EPS (TTM)" value={metrics?.epsBasicExclExtraAnnual ? `$${fmtNum(metrics.epsBasicExclExtraAnnual)}` : '—'} />
            <MetricCard label="ROE" value={metrics?.roeTTM ? `${fmtNum(metrics.roeTTM)}%` : '—'} color={metrics?.roeTTM > 15 ? '#0FA97A' : undefined} />
            <MetricCard label="Debt / Equity" value={fmtNum(metrics?.totalDebt_totalEquityAnnual)} color={(metrics?.totalDebt_totalEquityAnnual ?? 0) > 2 ? '#DC3C3C' : '#0FA97A'} />
            <MetricCard label="Dividend Yield" value={metrics?.dividendYieldIndicatedAnnual ? `${fmtNum(metrics.dividendYieldIndicatedAnnual)}%` : 'N/A'} />
            <MetricCard label="52W High" value={fmt(metrics?.['52WeekHigh'])} />
            <MetricCard label="52W Low" value={fmt(metrics?.['52WeekLow'])} />
          </div>
        </div>

        {/* Price Chart */}
        <SectionTitle title="Price History" color={sectorColor} />
        <div style={{ background: '#08080f', borderRadius: 12, border: '1px solid #0f0f1a', padding: '20px 24px' }}>
          <div style={{ display: 'flex', gap: 8, marginBottom: 20 }}>
            {PERIODS.map(p => (
              <button key={p} className={`pbtn ${period === p ? 'active' : ''}`} onClick={() => setPeriod(p)}
                style={{ background: period === p ? `${sectorColor}22` : 'none', border: `1px solid ${period === p ? sectorColor : '#1a1a2e'}`, color: period === p ? sectorColor : '#555', fontFamily: 'Space Mono, monospace', fontSize: 10, padding: '4px 10px', borderRadius: 4, cursor: 'pointer' }}
              >{p}</button>
            ))}
          </div>
          {priceHistory.length > 0 ? (
            <>
              <ResponsiveContainer width="100%" height={240}>
                <LineChart data={priceHistory}>
                  <XAxis dataKey="time" tick={{ fill: '#444', fontSize: 10, fontFamily: 'Space Mono' }} tickLine={false} axisLine={false} interval="preserveStartEnd" />
                  <YAxis domain={['auto', 'auto']} tick={{ fill: '#444', fontSize: 10, fontFamily: 'Space Mono' }} tickLine={false} axisLine={false} tickFormatter={v => `$${v.toFixed(0)}`} width={60} />
                  <Tooltip contentStyle={{ background: '#0a0a12', border: `1px solid ${sectorColor}44`, borderRadius: 6, fontFamily: 'Space Mono', fontSize: 11 }} formatter={(v) => [`$${v.toFixed(2)}`, 'Price']} />
                  <Line type="monotone" dataKey="price" dot={false} strokeWidth={2} stroke={isUp ? '#0FA97A' : '#DC3C3C'} isAnimationActive={false} />
                </LineChart>
              </ResponsiveContainer>
              <div style={{ marginTop: 12 }}>
                <div style={{ fontFamily: 'Space Mono, monospace', fontSize: 9, color: '#333', letterSpacing: 1, marginBottom: 6 }}>VOLUME</div>
                <ResponsiveContainer width="100%" height={60}>
                  <BarChart data={priceHistory}>
                    <Bar dataKey="volume" fill={`${sectorColor}44`} radius={[2, 2, 0, 0]} isAnimationActive={false} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </>
          ) : (
            <div style={{ height: 240, display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'Space Mono, monospace', fontSize: 11, color: '#333' }}>
              {FKEY ? 'Loading chart...' : 'Add VITE_FINNHUB_KEY to Railway variables to enable charts'}
            </div>
          )}
        </div>

        {/* Earnings */}
        {earnings.length > 0 && (
          <>
            <SectionTitle title="Earnings per Share — Last 6 Quarters" color={sectorColor} />
            <div style={{ background: '#08080f', borderRadius: 12, border: '1px solid #0f0f1a', padding: '20px 24px' }}>
              <ResponsiveContainer width="100%" height={200}>
                <BarChart data={earnings} barGap={4}>
                  <XAxis dataKey="period" tick={{ fill: '#444', fontSize: 10, fontFamily: 'Space Mono' }} tickLine={false} axisLine={false} />
                  <YAxis tick={{ fill: '#444', fontSize: 10, fontFamily: 'Space Mono' }} tickLine={false} axisLine={false} tickFormatter={v => `$${v}`} width={40} />
                  <Tooltip contentStyle={{ background: '#0a0a12', border: `1px solid ${sectorColor}44`, borderRadius: 6, fontFamily: 'Space Mono', fontSize: 11 }} formatter={(v, n) => [`$${v?.toFixed(2)}`, n]} />
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
                    <span style={{ fontFamily: 'Space Mono, monospace', fontSize: 10, color: '#555' }}>{l}</span>
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
                <div style={{ background: '#08080f', borderRadius: 12, border: '1px solid #0f0f1a', padding: '20px 24px' }}>
                  <div style={{ fontFamily: 'Space Mono, monospace', fontSize: 10, color: '#444', letterSpacing: 1, marginBottom: 16 }}>ANALYST RATINGS — {totalRecs} analysts</div>
                  {[
                    { label: 'Strong Buy', count: recommendation.strongBuy, color: '#0FA97A' },
                    { label: 'Buy', count: recommendation.buy, color: '#6BCF8F' },
                    { label: 'Hold', count: recommendation.hold, color: '#F0A500' },
                    { label: 'Sell', count: recommendation.sell, color: '#E87070' },
                    { label: 'Strong Sell', count: recommendation.strongSell, color: '#DC3C3C' },
                  ].map(({ label, count, color }) => (
                    <div key={label} style={{ marginBottom: 10 }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                        <span style={{ fontFamily: 'Space Mono, monospace', fontSize: 10, color: '#666' }}>{label}</span>
                        <span style={{ fontFamily: 'Space Mono, monospace', fontSize: 10, color }}>{count}</span>
                      </div>
                      <div style={{ height: 6, background: '#0f0f1a', borderRadius: 3, overflow: 'hidden' }}>
                        <div style={{ height: '100%', width: `${(count / totalRecs) * 100}%`, background: color, borderRadius: 3 }} />
                      </div>
                    </div>
                  ))}
                </div>
              )}
              {priceTarget && (
                <div style={{ background: '#08080f', borderRadius: 12, border: '1px solid #0f0f1a', padding: '20px 24px' }}>
                  <div style={{ fontFamily: 'Space Mono, monospace', fontSize: 10, color: '#444', letterSpacing: 1, marginBottom: 16 }}>PRICE TARGETS</div>
                  {[['High Target', fmt(priceTarget.targetHigh), '#0FA97A'], ['Mean Target', fmt(priceTarget.targetMean), '#F0A500'], ['Low Target', fmt(priceTarget.targetLow), '#DC3C3C'], ['Current Price', fmt(quote?.c), '#888']].map(([l, v, c]) => (
                    <div key={l} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 0', borderBottom: '1px solid #0f0f1a' }}>
                      <span style={{ fontFamily: 'Space Mono, monospace', fontSize: 11, color: '#555' }}>{l}</span>
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
        <div style={{ background: '#08080f', borderRadius: 12, border: '1px solid #0f0f1a', padding: '20px 24px' }}>
          <div style={{ fontFamily: 'Space Mono, monospace', fontSize: 10, color: '#333', marginBottom: 16 }}>Opens your broker's page for {company.ticker} — log in to trade</div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 10 }}>
            {BROKERS.map(broker => (
              <a key={broker.name} href={broker.url(company.ticker)} target="_blank" rel="noopener noreferrer"
                style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '12px 16px', borderRadius: 8, border: '1px solid #1a1a2e', background: '#0a0a12', cursor: 'pointer', textDecoration: 'none', transition: 'all 0.2s' }}
                onMouseEnter={e => { e.currentTarget.style.borderColor = '#333'; e.currentTarget.style.background = '#0f0f1a'; }}
                onMouseLeave={e => { e.currentTarget.style.borderColor = '#1a1a2e'; e.currentTarget.style.background = '#0a0a12'; }}
              >
                <span style={{ fontSize: 18 }}>{broker.emoji}</span>
                <span style={{ fontFamily: 'Syne, sans-serif', fontWeight: 600, fontSize: 12, color: '#ccc' }}>{broker.name}</span>
              </a>
            ))}
          </div>
        </div>

        {/* AI Briefing */}
        <SectionTitle title="AI Intelligence Briefing" color={sectorColor} />
        <div style={{ background: '#08080f', borderRadius: 12, border: '1px solid #0f0f1a', padding: '24px' }}>
          {briefingState === 'loading' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              {['Querying financial intelligence...', 'Analyzing earnings data...', 'Synthesizing investor briefing...'].map((msg, i) => (
                <div key={i} style={{ padding: '14px 16px', background: '#0a0a12', borderRadius: 8, animation: `pulse 1.5s ease-in-out ${i * 0.2}s infinite` }}>
                  <div style={{ fontFamily: 'Space Mono, monospace', fontSize: 11, color: '#333', marginBottom: 8 }}>{msg}</div>
                  <div style={{ height: 6, background: '#111', borderRadius: 3, overflow: 'hidden' }}>
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
                <button onClick={fetchBriefing} style={{ background: 'none', border: '1px solid #1a1a2e', color: '#444', fontFamily: 'Space Mono, monospace', fontSize: 9, padding: '4px 10px', borderRadius: 4, cursor: 'pointer' }}>↻ REFRESH</button>
              </div>
              <div style={{ fontFamily: 'Syne, sans-serif', fontSize: 14, color: '#bbb', lineHeight: 1.8 }}>{briefing.summary}</div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
                {[
                  { icon: '📊', label: 'Earnings & Financials', color: '#1A6FD8', data: briefing.earnings },
                  { icon: '🤝', label: 'Investments & Partnerships', color: '#0E7A5A', data: briefing.investments },
                  { icon: '👤', label: 'Leadership & Org', color: '#7B3FBF', data: briefing.leadership },
                  { icon: '⚡', label: 'Products & Patents', color: '#C85C14', data: briefing.products },
                ].map(({ icon, label, color, data }) => data && (
                  <div key={label} style={{ background: '#0a0a12', borderRadius: 8, padding: '16px', border: `1px solid ${color}22` }}>
                    <div style={{ fontFamily: 'Space Mono, monospace', fontSize: 9, color, letterSpacing: 1, marginBottom: 8 }}>{icon} {label.toUpperCase()}</div>
                    <div style={{ fontFamily: 'Syne, sans-serif', fontWeight: 600, fontSize: 13, color: '#ddd', marginBottom: 6 }}>{data.headline}</div>
                    <div style={{ fontFamily: 'Syne, sans-serif', fontSize: 12, color: '#666', lineHeight: 1.7 }}>{data.detail}</div>
                  </div>
                ))}
              </div>
              <div style={{ padding: '14px 16px', background: '#0a0a12', borderRadius: 8, borderLeft: `3px solid ${sectorColor}` }}>
                <div style={{ fontFamily: 'Space Mono, monospace', fontSize: 9, color: sectorColor, marginBottom: 8, letterSpacing: 1 }}>ANALYST OUTLOOK</div>
                <div style={{ fontFamily: 'Syne, sans-serif', fontSize: 13, color: '#777', lineHeight: 1.7, fontStyle: 'italic' }}>{briefing.outlook}</div>
              </div>
              <div style={{ fontFamily: 'Space Mono, monospace', fontSize: 9, color: '#2a2a3a', textAlign: 'right' }}>Generated by Claude · Knowledge cutoff applies · Not financial advice</div>
            </div>
          )}
        </div>

        <div style={{ marginTop: 32, textAlign: 'center', fontFamily: 'Space Mono, monospace', fontSize: 9, color: '#1a1a2a', lineHeight: 2 }}>
          AIFMI · Data from Finnhub · Not financial advice · Past performance does not indicate future results
        </div>
      </div>
    </div>
  );
}
