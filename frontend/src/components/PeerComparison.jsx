import { useState, useEffect } from 'react';
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, ReferenceLine } from 'recharts';

const API = 'https://aifmi-production.up.railway.app';
const COLORS = ['#1A6FD8', '#0FA97A', '#F0A500', '#DC3C3C', '#7B3FBF', '#C85C14'];

const fmt = (n) => n == null ? '—' : n < 1 ? `$${n.toFixed(4)}` : `$${n.toFixed(2)}`;
const fmtB = (n) => {
  if (n == null) return '—';
  if (n >= 1e12) return `$${(n / 1e12).toFixed(2)}T`;
  if (n >= 1e9) return `$${(n / 1e9).toFixed(2)}B`;
  if (n >= 1e6) return `$${(n / 1e6).toFixed(2)}M`;
  return `$${n.toFixed(0)}`;
};
const fmtNum = (n, d = 2) => n == null ? '—' : n.toFixed(d);
const fmtPct = (n) => n == null ? '—' : `${n >= 0 ? '+' : ''}${n.toFixed(2)}%`;

const BENCHMARKS = [
  { ticker: 'FINX', label: 'FinTech Index (FINX)', color: '#3a3a5a', dash: '6 3' },
  { ticker: 'ARKF', label: 'ARK FinTech (ARKF)', color: '#2a4a3a', dash: '3 3' },
  { ticker: 'DIA', label: 'Dow Jones (DIA)', color: '#4a3a2a', dash: '4 2' },
];

function normalise(history) {
  if (!history || history.length === 0) return [];
  const base = history[0].price;
  if (!base) return [];
  return history.map(p => ({ ...p, pct: parseFloat((((p.price - base) / base) * 100).toFixed(2)) }));
}

async function fetchHistory(ticker) {
  try {
    const r = await fetch(`${API}/api/chart/${ticker}?interval=1d&range=1mo`);
    const d = await r.json();
    const result = d?.chart?.result?.[0];
    if (!result) return [];
    const ts = result.timestamp;
    const closes = result.indicators?.quote?.[0]?.close;
    if (!ts || !closes) return [];
    return ts.map((t, i) => ({ time: new Date(t * 1000).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }), price: closes[i] ?? 0 })).filter(p => p.price > 0);
  } catch { return []; }
}

async function fetchMetrics(ticker, finnhubKey) {
  try {
    const requests = [
      fetch(`${API}/api/stats/${ticker}`).then(r => r.json()).catch(() => ({})),
    ];
    if (finnhubKey) {
      requests.push(
        fetch(`https://finnhub.io/api/v1/quote?symbol=${ticker}&token=${finnhubKey}`).then(r => r.json()).catch(() => ({})),
        fetch(`https://finnhub.io/api/v1/stock/metric?symbol=${ticker}&metric=all&token=${finnhubKey}`).then(r => r.json()).catch(() => ({}))
      );
    }
    const [yahoo, qRes, mRes] = await Promise.all(requests);
    return {
      price: qRes?.c,
      changePct: qRes?.dp,
      marketCap: mRes?.metric?.marketCapitalization,
      pe: mRes?.metric?.peBasicExclExtraTTM,
      roe: yahoo?.returnOnEquity ? yahoo.returnOnEquity * 100 : mRes?.metric?.roeTTM,
      eps: yahoo?.eps ?? mRes?.metric?.epsBasicExclExtraAnnual,
      debtToEquity: yahoo?.debtToEquity,
    };
  } catch { return {}; }
}

async function getAIVerdict(currentTicker, currentName, stockPct, finxPct, arkfPct, diaPct, peers) {
  const beating = stockPct > finxPct;
  const margin = Math.abs(stockPct - finxPct).toFixed(1);
  const vsDow = stockPct != null && diaPct != null ? (stockPct - diaPct).toFixed(1) : null;
  const peerNames = peers.join(', ');
  const prompt = `You are a concise financial analyst. In 2-3 sentences max, give a punchy verdict on ${currentName} (${currentTicker})'s 1-month performance vs the fintech sector and broader market.

Data:
- ${currentTicker} 1M return: ${stockPct?.toFixed(1)}%
- FINX (FinTech ETF) 1M return: ${finxPct?.toFixed(1)}%
- ARKF (ARK FinTech) 1M return: ${arkfPct?.toFixed(1)}%
- DIA (Dow Jones) 1M return: ${diaPct?.toFixed(1)}%
- ${currentTicker} is ${beating ? 'BEATING' : 'LAGGING'} FINX by ${margin}% and ${vsDow >= 0 ? 'BEATING' : 'LAGGING'} the Dow Jones by ${Math.abs(vsDow)}%
- Peers selected: ${peerNames || 'none'}

Be direct, use the actual numbers for all three benchmarks. End with one forward-looking sentence. No disclaimers.`;

  try {
    const res = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ model: 'claude-sonnet-4-20250514', max_tokens: 1000, messages: [{ role: 'user', content: prompt }] }),
    });
    const data = await res.json();
    return data?.content?.[0]?.text ?? null;
  } catch { return null; }
}

export default function PeerComparison({ currentTicker, currentName, sectorColor, finnhubKey, sectorId }) {
  const [sectorPeers, setSectorPeers] = useState([]);
  const [selected, setSelected] = useState([]);
  const [chartData, setChartData] = useState([]);
  const [metricsMap, setMetricsMap] = useState({});
  const [benchmarkData, setBenchmarkData] = useState({});
  const [showBenchmarks, setShowBenchmarks] = useState(true);
  const [loading, setLoading] = useState(false);
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [verdict, setVerdict] = useState(null);
  const [verdictLoading, setVerdictLoading] = useState(false);
  const [finalPcts, setFinalPcts] = useState({});

  useEffect(() => {
    fetch(`${API}/api/sectors`).then(r => r.json()).then(data => {
      const sector = sectorId ? data[sectorId] : Object.values(data).find(s => s.companies.find(c => c.ticker === currentTicker));
      if (sector) {
        const peers = sector.companies.filter(c => c.ticker && c.ticker !== currentTicker && ['NASDAQ', 'NYSE'].includes(c.exchange));
        setSectorPeers(peers);
      }
    }).catch(() => {});
  }, [currentTicker]);

  useEffect(() => {
    if (!metricsMap[currentTicker]) {
      fetchMetrics(currentTicker, finnhubKey).then(m => setMetricsMap(prev => ({ ...prev, [currentTicker]: m })));
    }
  }, [currentTicker, finnhubKey]);

  useEffect(() => {
    BENCHMARKS.forEach(b => {
      fetchHistory(b.ticker).then(h => {
        setBenchmarkData(prev => ({ ...prev, [b.ticker]: normalise(h) }));
      });
    });
  }, []);

  useEffect(() => {
    const allTickers = [currentTicker, ...selected];
    setLoading(true);
    Promise.all(allTickers.map(t => fetchHistory(t).then(h => ({ ticker: t, history: normalise(h) })))).then(results => {
      const allSeries = [...results, ...BENCHMARKS.map(b => ({ ticker: b.ticker, history: benchmarkData[b.ticker] ?? [] }))];
      const maxLen = Math.max(...results.map(r => r.history.length));
      const merged = [];
      for (let i = 0; i < maxLen; i++) {
        const point = { time: results[0].history[i]?.time ?? '' };
        for (const r of allSeries) { if (r.history[i]) point[r.ticker] = r.history[i].pct; }
        merged.push(point);
      }
      setChartData(merged);

      const pcts = {};
      for (const r of allSeries) {
        const last = r.history[r.history.length - 1];
        if (last) pcts[r.ticker] = last.pct;
      }
      setFinalPcts(pcts);
      setLoading(false);
    });
  }, [selected, currentTicker, benchmarkData]);

  useEffect(() => {
    if (selected.length === 0) return;
    const missing = selected.filter(t => !metricsMap[t]);
    if (missing.length === 0) return;
    Promise.all(missing.map(t => fetchMetrics(t, finnhubKey).then(m => ({ ticker: t, metrics: m })))).then(results => {
      setMetricsMap(prev => { const next = { ...prev }; for (const r of results) next[r.ticker] = r.metrics; return next; });
    });
  }, [selected, finnhubKey]);

  const generateVerdict = async () => {
    setVerdictLoading(true);
    setVerdict(null);
    const stockPct = finalPcts[currentTicker];
    const finxPct = finalPcts['FINX'];
    const arkfPct = finalPcts['ARKF'];
    const diaPct = finalPcts['DIA'];
    const text = await getAIVerdict(currentTicker, currentName, stockPct, finxPct, arkfPct, diaPct, selected);
    setVerdict(text);
    setVerdictLoading(false);
  };

  const togglePeer = (ticker) => {
    setSelected(prev => prev.includes(ticker) ? prev.filter(t => t !== ticker) : prev.length < 5 ? [...prev, ticker] : prev);
    setVerdict(null);
  };

  const allTickers = [currentTicker, ...selected];
  const stockPct = finalPcts[currentTicker];
  const finxPct = finalPcts['FINX'];
  const beating = stockPct != null && finxPct != null ? stockPct > finxPct : null;

  return (
    <div style={{ background: '#08080f', borderRadius: 12, border: '1px solid #0f0f1a', padding: '24px' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20, flexWrap: 'wrap', gap: 12 }}>
        <div>
          <div style={{ fontFamily: 'Syne, sans-serif', fontWeight: 700, fontSize: 14, color: '#fff', marginBottom: 4 }}>Select peers to compare</div>
          <div style={{ fontFamily: 'Space Mono, monospace', fontSize: 10, color: '#444' }}>Up to 5 stocks · 1M normalised performance vs FinTech benchmarks</div>
        </div>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          <button onClick={() => setShowBenchmarks(b => !b)} style={{ background: showBenchmarks ? '#1a1a2e' : 'none', border: '1px solid #1a1a2e', color: showBenchmarks ? '#888' : '#444', fontFamily: 'Space Mono, monospace', fontSize: 9, padding: '6px 12px', borderRadius: 6, cursor: 'pointer', letterSpacing: 0.5 }}>
            {showBenchmarks ? '◉ BENCHMARKS ON' : '○ BENCHMARKS OFF'}
          </button>
          <div style={{ position: 'relative' }}>
            <button onClick={() => setDropdownOpen(o => !o)} style={{ background: `${sectorColor}18`, border: `1px solid ${sectorColor}44`, color: sectorColor, fontFamily: 'Space Mono, monospace', fontSize: 10, padding: '8px 16px', borderRadius: 6, cursor: 'pointer', letterSpacing: 0.5 }}>
              ADD PEERS ({selected.length}/5) {dropdownOpen ? '▲' : '▼'}
            </button>
            {dropdownOpen && (
              <div style={{ position: 'absolute', right: 0, top: '100%', marginTop: 4, background: '#07070f', border: '1px solid #1a1a2e', borderRadius: 8, zIndex: 50, minWidth: 220, maxHeight: 280, overflowY: 'auto', boxShadow: '0 8px 24px rgba(0,0,0,0.4)' }}>
                {sectorPeers.map(peer => {
                  const isSelected = selected.includes(peer.ticker);
                  const isDisabled = !isSelected && selected.length >= 5;
                  return (
                    <div key={peer.ticker} onClick={() => !isDisabled && togglePeer(peer.ticker)} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 16px', cursor: isDisabled ? 'not-allowed' : 'pointer', opacity: isDisabled ? 0.4 : 1, borderBottom: '1px solid #0f0f1a' }}
                      onMouseEnter={e => { if (!isDisabled) e.currentTarget.style.background = '#0d0d1a'; }}
                      onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
                      <div style={{ width: 14, height: 14, borderRadius: 3, border: `1px solid ${isSelected ? sectorColor : '#333'}`, background: isSelected ? sectorColor : 'transparent', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                        {isSelected && <span style={{ color: '#fff', fontSize: 10 }}>✓</span>}
                      </div>
                      <div>
                        <div style={{ fontFamily: 'Syne, sans-serif', fontWeight: 600, fontSize: 13, color: '#f0f0f0' }}>{peer.name}</div>
                        <div style={{ fontFamily: 'Space Mono, monospace', fontSize: 10, color: '#555' }}>{peer.ticker}</div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>

      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 16 }}>
        {allTickers.map((t, i) => (
          <div key={t} style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '4px 10px', background: `${COLORS[i]}18`, border: `1px solid ${COLORS[i]}44`, borderRadius: 6 }}>
            <div style={{ width: 8, height: 8, borderRadius: '50%', background: COLORS[i] }} />
            <span style={{ fontFamily: 'Space Mono, monospace', fontSize: 10, color: COLORS[i] }}>{t}</span>
            {finalPcts[t] != null && <span style={{ fontFamily: 'Space Mono, monospace', fontSize: 9, color: (finalPcts[t] >= 0) ? '#0FA97A' : '#DC3C3C' }}>{finalPcts[t] >= 0 ? '+' : ''}{finalPcts[t]?.toFixed(1)}%</span>}
            {t !== currentTicker && <span onClick={() => togglePeer(t)} style={{ color: '#555', cursor: 'pointer', fontSize: 12, marginLeft: 2 }}>×</span>}
          </div>
        ))}
        {showBenchmarks && BENCHMARKS.map(b => (
          <div key={b.ticker} style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '4px 10px', background: '#0f0f1a', border: '1px solid #1a1a2e', borderRadius: 6 }}>
            <div style={{ width: 16, height: 2, background: b.color, borderRadius: 1 }} />
            <span style={{ fontFamily: 'Space Mono, monospace', fontSize: 10, color: '#555' }}>{b.ticker}</span>
            {finalPcts[b.ticker] != null && <span style={{ fontFamily: 'Space Mono, monospace', fontSize: 9, color: '#555' }}>{finalPcts[b.ticker] >= 0 ? '+' : ''}{finalPcts[b.ticker]?.toFixed(1)}%</span>}
          </div>
        ))}
      </div>

      {loading ? (
        <div style={{ height: 240, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div style={{ fontFamily: 'Space Mono, monospace', fontSize: 11, color: '#333' }}>Loading chart data...</div>
        </div>
      ) : (
        <ResponsiveContainer width="100%" height={240}>
          <LineChart data={chartData}>
            <XAxis dataKey="time" tick={{ fill: '#444', fontSize: 10, fontFamily: 'Space Mono' }} tickLine={false} axisLine={false} interval="preserveStartEnd" />
            <YAxis tick={{ fill: '#444', fontSize: 10, fontFamily: 'Space Mono' }} tickLine={false} axisLine={false} tickFormatter={v => `${v > 0 ? '+' : ''}${v.toFixed(1)}%`} width={55} />
            <ReferenceLine y={0} stroke="#1a1a2e" strokeDasharray="4 4" />
            <Tooltip contentStyle={{ background: '#0a0a12', border: '1px solid #1a1a2e', borderRadius: 6, fontFamily: 'Space Mono', fontSize: 11 }} formatter={(v, n) => [`${v > 0 ? '+' : ''}${v?.toFixed(2)}%`, n]} />
            {allTickers.map((t, i) => (
              <Line key={t} type="monotone" dataKey={t} dot={false} strokeWidth={t === currentTicker ? 2.5 : 1.5} stroke={COLORS[i]} isAnimationActive={false} />
            ))}
            {showBenchmarks && BENCHMARKS.map(b => (
              <Line key={b.ticker} type="monotone" dataKey={b.ticker} dot={false} strokeWidth={1} stroke={b.color} strokeDasharray={b.dash} isAnimationActive={false} />
            ))}
          </LineChart>
        </ResponsiveContainer>
      )}

      {/* Benchmark status bar */}
      {beating !== null && (
        <div style={{ margin: '16px 0', padding: '10px 16px', background: beating ? '#0FA97A18' : '#DC3C3C18', border: `1px solid ${beating ? '#0FA97A33' : '#DC3C3C33'}`, borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 8 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <span style={{ fontFamily: 'Space Mono, monospace', fontSize: 11, color: beating ? '#0FA97A' : '#DC3C3C', fontWeight: 700 }}>
              {beating ? '▲ BEATING' : '▼ LAGGING'} FINX by {Math.abs(stockPct - finxPct).toFixed(1)}%
            </span>
            <span style={{ fontFamily: 'Space Mono, monospace', fontSize: 10, color: '#555' }}>
              {currentTicker}: {stockPct >= 0 ? '+' : ''}{stockPct?.toFixed(1)}% · FINX: {finxPct >= 0 ? '+' : ''}{finxPct?.toFixed(1)}% · ARKF: {finalPcts['ARKF'] >= 0 ? '+' : ''}{finalPcts['ARKF']?.toFixed(1)}% · DIA: {finalPcts['DIA'] >= 0 ? '+' : ''}{finalPcts['DIA']?.toFixed(1)}%
            </span>
          </div>
          <button onClick={generateVerdict} style={{ background: 'none', border: `1px solid ${beating ? '#0FA97A44' : '#DC3C3C44'}`, color: beating ? '#0FA97A' : '#DC3C3C', fontFamily: 'Space Mono, monospace', fontSize: 9, padding: '5px 12px', borderRadius: 4, cursor: 'pointer', letterSpacing: 0.5, whiteSpace: 'nowrap' }}>
            {verdictLoading ? '⟳ ANALYSING...' : '✦ AI ANALYST →'}
          </button>
        </div>
      )}

      {/* AI Analyst Verdict */}
      {(verdict || verdictLoading) && (
        <div style={{ marginBottom: 16, padding: '16px 20px', background: '#0a0a12', border: '1px solid #1a1a2e', borderRadius: 8, borderLeft: `3px solid ${beating ? '#0FA97A' : '#DC3C3C'}` }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
            <span style={{ fontFamily: 'Space Mono, monospace', fontSize: 9, color: '#555', letterSpacing: 1 }}>✦ AI ANALYST VERDICT</span>
            <div style={{ flex: 1, height: 1, background: '#1a1a2e' }} />
            <span style={{ fontFamily: 'Space Mono, monospace', fontSize: 9, color: '#2a2a3a' }}>powered by Claude</span>
          </div>
          {verdictLoading ? (
            <div style={{ fontFamily: 'Space Mono, monospace', fontSize: 11, color: '#333' }}>Analysing performance data...</div>
          ) : (
            <div style={{ fontFamily: 'Syne, sans-serif', fontSize: 13, color: '#bbb', lineHeight: 1.8 }}>{verdict}</div>
          )}
        </div>
      )}

      {/* Metrics table */}
      <div style={{ overflowX: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
          <thead>
            <tr style={{ borderBottom: '1px solid #0f0f1a' }}>
              {['Stock', 'Price', '1M Return', 'vs FINX', 'Market Cap', 'P/E', 'ROE', 'EPS'].map(h => (
                <th key={h} style={{ padding: '8px 12px', textAlign: 'left', fontFamily: 'Space Mono, monospace', fontSize: 10, color: '#444', letterSpacing: 1, fontWeight: 700 }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {allTickers.map((t, i) => {
              const m = metricsMap[t] ?? {};
              const isMain = t === currentTicker;
              const tPct = finalPcts[t];
              const vsFinx = tPct != null && finxPct != null ? tPct - finxPct : null;
              return (
                <tr key={t} style={{ borderBottom: '1px solid #0a0a12', background: isMain ? `${COLORS[i]}08` : 'transparent' }}>
                  <td style={{ padding: '10px 12px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <div style={{ width: 8, height: 8, borderRadius: '50%', background: COLORS[i], flexShrink: 0 }} />
                      <div>
                        <div style={{ fontFamily: 'Syne, sans-serif', fontWeight: isMain ? 700 : 500, fontSize: 13, color: '#f0f0f0' }}>{t}</div>
                        {isMain && <div style={{ fontFamily: 'Space Mono, monospace', fontSize: 9, color: '#555' }}>current</div>}
                      </div>
                    </div>
                  </td>
                  <td style={{ padding: '10px 12px', fontFamily: 'Space Mono, monospace', color: '#eee' }}>{m.price ? fmt(m.price) : '—'}</td>
                  <td style={{ padding: '10px 12px', fontFamily: 'Space Mono, monospace', color: tPct >= 0 ? '#0FA97A' : '#DC3C3C' }}>{tPct != null ? `${tPct >= 0 ? '+' : ''}${tPct.toFixed(1)}%` : '—'}</td>
                  <td style={{ padding: '10px 12px', fontFamily: 'Space Mono, monospace', color: vsFinx >= 0 ? '#0FA97A' : '#DC3C3C', fontSize: 11 }}>{vsFinx != null ? `${vsFinx >= 0 ? '+' : ''}${vsFinx.toFixed(1)}%` : '—'}</td>
                  <td style={{ padding: '10px 12px', fontFamily: 'Space Mono, monospace', color: '#aaa' }}>{fmtB((m.marketCap ?? 0) * 1e6)}</td>
                  <td style={{ padding: '10px 12px', fontFamily: 'Space Mono, monospace', color: '#aaa' }}>{fmtNum(m.pe)}</td>
                  <td style={{ padding: '10px 12px', fontFamily: 'Space Mono, monospace', color: (m.roe ?? 0) > 15 ? '#0FA97A' : '#aaa' }}>{m.roe != null ? `${fmtNum(m.roe)}%` : '—'}</td>
                  <td style={{ padding: '10px 12px', fontFamily: 'Space Mono, monospace', color: '#aaa' }}>{m.eps != null ? `$${fmtNum(m.eps)}` : '—'}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
