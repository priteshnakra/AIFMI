import { useState, useEffect } from 'react';
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, Legend } from 'recharts';

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
    return ts.map((t, i) => ({
      time: new Date(t * 1000).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
      price: closes[i] ?? 0,
    })).filter(p => p.price > 0);
  } catch { return []; }
}

async function fetchMetrics(ticker, finnhubKey) {
  if (!finnhubKey) return {};
  try {
    const [qRes, mRes] = await Promise.all([
      fetch(`https://finnhub.io/api/v1/quote?symbol=${ticker}&token=${finnhubKey}`).then(r => r.json()),
      fetch(`https://finnhub.io/api/v1/stock/metric?symbol=${ticker}&metric=all&token=${finnhubKey}`).then(r => r.json()),
    ]);
    return {
      price: qRes?.c,
      changePct: qRes?.dp,
      marketCap: mRes?.metric?.marketCapitalization,
      pe: mRes?.metric?.peBasicExclExtraTTM,
      roe: mRes?.metric?.roeTTM,
      eps: mRes?.metric?.epsBasicExclExtraAnnual,
      high52: mRes?.metric?.['52WeekHigh'],
      low52: mRes?.metric?.['52WeekLow'],
    };
  } catch { return {}; }
}

export default function PeerComparison({ currentTicker, currentName, sectorColor, finnhubKey }) {
  const [sectorPeers, setSectorPeers] = useState([]);
  const [selected, setSelected] = useState([]);
  const [chartData, setChartData] = useState([]);
  const [metricsMap, setMetricsMap] = useState({});
  const [loading, setLoading] = useState(false);
  const [dropdownOpen, setDropdownOpen] = useState(false);

  useEffect(() => {
    fetch(`${API}/api/sectors`).then(r => r.json()).then(data => {
      for (const sector of Object.values(data)) {
        const found = sector.companies.find(c => c.ticker === currentTicker);
        if (found) {
          const peers = sector.companies.filter(c => c.ticker && c.ticker !== currentTicker && ['NASDAQ','NYSE'].includes(c.exchange));
          setSectorPeers(peers);
          break;
        }
      }
    }).catch(() => {});
  }, [currentTicker]);

  useEffect(() => {
    if (selected.length === 0) { setChartData([]); return; }
    setLoading(true);
    const allTickers = [currentTicker, ...selected];
    Promise.all(allTickers.map(t => fetchHistory(t).then(h => ({ ticker: t, history: normalise(h) })))).then(results => {
      const maxLen = Math.max(...results.map(r => r.history.length));
      const merged = [];
      for (let i = 0; i < maxLen; i++) {
        const point = { time: results[0].history[i]?.time ?? '' };
        for (const r of results) { if (r.history[i]) point[r.ticker] = r.history[i].pct; }
        merged.push(point);
      }
      setChartData(merged);
      setLoading(false);
    });
  }, [selected, currentTicker]);

  useEffect(() => {
    if (selected.length === 0) return;
    const missing = selected.filter(t => !metricsMap[t]);
    if (missing.length === 0) return;
    Promise.all(missing.map(t => fetchMetrics(t, finnhubKey).then(m => ({ ticker: t, metrics: m })))).then(results => {
      setMetricsMap(prev => {
        const next = { ...prev };
        for (const r of results) next[r.ticker] = r.metrics;
        return next;
      });
    });
  }, [selected, finnhubKey]);

  const togglePeer = (ticker) => {
    setSelected(prev => prev.includes(ticker) ? prev.filter(t => t !== ticker) : prev.length < 5 ? [...prev, ticker] : prev);
  };

  const allTickers = [currentTicker, ...selected];

  return (
    <div style={{ background: '#08080f', borderRadius: 12, border: '1px solid #0f0f1a', padding: '24px', marginTop: 0 }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20, flexWrap: 'wrap', gap: 12 }}>
        <div>
          <div style={{ fontFamily: 'Syne, sans-serif', fontWeight: 700, fontSize: 14, color: '#fff', marginBottom: 4 }}>Select peers to compare</div>
          <div style={{ fontFamily: 'Space Mono, monospace', fontSize: 10, color: '#444' }}>Up to 5 stocks · 1M price performance (normalised to 0%)</div>
        </div>
        <div style={{ position: 'relative' }}>
          <button onClick={() => setDropdownOpen(o => !o)} style={{ background: `${sectorColor}18`, border: `1px solid ${sectorColor}44`, color: sectorColor, fontFamily: 'Space Mono, monospace', fontSize: 10, padding: '8px 16px', borderRadius: 6, cursor: 'pointer', letterSpacing: 0.5 }}>
            ADD PEERS ({selected.length}/5) {dropdownOpen ? '▲' : '▼'}
          </button>
          {dropdownOpen && (
            <div style={{ position: 'absolute', right: 0, top: '100%', marginTop: 4, background: '#07070f', border: '1px solid #1a1a2e', borderRadius: 8, zIndex: 50, minWidth: 220, maxHeight: 280, overflowY: 'auto', boxShadow: '0 8px 24px rgba(0,0,0,0.4)' }}>
              {sectorPeers.length === 0 ? (
                <div style={{ padding: '12px 16px', fontFamily: 'Space Mono, monospace', fontSize: 11, color: '#444' }}>No peers available</div>
              ) : sectorPeers.map(peer => {
                const isSelected = selected.includes(peer.ticker);
                const isDisabled = !isSelected && selected.length >= 5;
                return (
                  <div key={peer.ticker} onClick={() => !isDisabled && togglePeer(peer.ticker)} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 16px', cursor: isDisabled ? 'not-allowed' : 'pointer', opacity: isDisabled ? 0.4 : 1, borderBottom: '1px solid #0f0f1a', transition: 'background 0.15s' }}
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

      {selected.length === 0 ? (
        <div style={{ height: 200, display: 'flex', alignItems: 'center', justifyContent: 'center', border: '1px dashed #1a1a2e', borderRadius: 8 }}>
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontFamily: 'Space Mono, monospace', fontSize: 12, color: '#333', marginBottom: 8 }}>No peers selected yet</div>
            <div style={{ fontFamily: 'Space Mono, monospace', fontSize: 10, color: '#2a2a3a' }}>Click "ADD PEERS" to start comparing</div>
          </div>
        </div>
      ) : (
        <>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 16 }}>
            {allTickers.map((t, i) => (
              <div key={t} style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '4px 10px', background: `${COLORS[i]}18`, border: `1px solid ${COLORS[i]}44`, borderRadius: 6 }}>
                <div style={{ width: 8, height: 8, borderRadius: '50%', background: COLORS[i] }} />
                <span style={{ fontFamily: 'Space Mono, monospace', fontSize: 10, color: COLORS[i] }}>{t}</span>
                {t !== currentTicker && <span onClick={() => togglePeer(t)} style={{ color: '#555', cursor: 'pointer', fontSize: 12, marginLeft: 2 }}>×</span>}
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
                <Tooltip contentStyle={{ background: '#0a0a12', border: '1px solid #1a1a2e', borderRadius: 6, fontFamily: 'Space Mono', fontSize: 11 }} formatter={(v, n) => [`${v > 0 ? '+' : ''}${v?.toFixed(2)}%`, n]} />
                {allTickers.map((t, i) => (
                  <Line key={t} type="monotone" dataKey={t} dot={false} strokeWidth={t === currentTicker ? 2.5 : 1.5} stroke={COLORS[i]} isAnimationActive={false} />
                ))}
              </LineChart>
            </ResponsiveContainer>
          )}

          <div style={{ marginTop: 20, overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
              <thead>
                <tr style={{ borderBottom: '1px solid #0f0f1a' }}>
                  {['Stock', 'Price', '% Change', 'Market Cap', 'P/E', 'ROE', 'EPS'].map(h => (
                    <th key={h} style={{ padding: '8px 12px', textAlign: 'left', fontFamily: 'Space Mono, monospace', fontSize: 10, color: '#444', letterSpacing: 1, fontWeight: 700 }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {allTickers.map((t, i) => {
                  const m = metricsMap[t] ?? {};
                  const isMain = t === currentTicker;
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
                      <td style={{ padding: '10px 12px', fontFamily: 'Space Mono, monospace', color: m.changePct >= 0 ? '#0FA97A' : '#DC3C3C' }}>{m.changePct != null ? fmtPct(m.changePct) : '—'}</td>
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
        </>
      )}
    </div>
  );
}
