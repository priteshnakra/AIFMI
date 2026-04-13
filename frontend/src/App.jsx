import { useState, useEffect, useCallback } from 'react';
import { useLivePrices } from './hooks/useLivePrices';
import { LineChart, Line, ResponsiveContainer } from 'recharts';

// ── Helpers ────────────────────────────────────────────────────────────────
const fmt = (n) => n == null ? '—' : n < 1 ? `$${n.toFixed(4)}` : n < 10 ? `$${n.toFixed(3)}` : `$${n.toFixed(2)}`;
const fmtPct = (n) => n == null ? '—' : `${n >= 0 ? '+' : ''}${n.toFixed(2)}%`;

const SECTORS = [
  { id: 'gpu',     label: 'GPU',        color: '#1A6FD8' },
  { id: 'chip',    label: 'Microchip',  color: '#0A5C99' },
  { id: 'asic',    label: 'ASIC',       color: '#0E7A5A' },
  { id: 'npu',     label: 'NPU',        color: '#7B3FBF' },
  { id: 'network', label: 'Networking', color: '#C85C14' },
];

const SENTIMENT_CONFIG = {
  bullish: { color: '#0FA97A', bg: '#0FA97A18', label: '▲ BULLISH' },
  neutral: { color: '#F0A500', bg: '#F0A50018', label: '◆ NEUTRAL' },
  bearish: { color: '#DC3C3C', bg: '#DC3C3C18', label: '▼ BEARISH' },
};

const sparkHistory = {};
function updateSpark(ticker, price) {
  if (!sparkHistory[ticker]) sparkHistory[ticker] = [];
  sparkHistory[ticker].push({ v: price });
  if (sparkHistory[ticker].length > 30) sparkHistory[ticker].shift();
}

// ── Watchlist persistence ──────────────────────────────────────────────────
function loadWatchlist() {
  try { return JSON.parse(localStorage.getItem('aifmi_watchlist') ?? '[]'); } catch { return []; }
}
function saveWatchlist(list) {
  localStorage.setItem('aifmi_watchlist', JSON.stringify(list));
}

// ── IntelCard ──────────────────────────────────────────────────────────────
function IntelCard({ icon, label, color, data }) {
  const [open, setOpen] = useState(true);
  if (!data) return null;
  return (
    <div style={{ background: '#0a0a12', borderRadius: 8, border: '1px solid #0f0f1a', overflow: 'hidden' }}>
      <button onClick={() => setOpen(o => !o)} style={{
        width: '100%', background: 'none', border: 'none', cursor: 'pointer',
        padding: '12px 16px', display: 'flex', alignItems: 'center', gap: 10, textAlign: 'left',
      }}>
        <span style={{ fontSize: 14 }}>{icon}</span>
        <span style={{ fontFamily: 'Space Mono, monospace', fontSize: 10, color, letterSpacing: 1, textTransform: 'uppercase', flex: 1 }}>{label}</span>
        <span style={{ fontFamily: 'Space Mono, monospace', fontSize: 10, color: '#333' }}>{open ? '▲' : '▼'}</span>
      </button>
      {open && (
        <div style={{ padding: '0 16px 14px', borderTop: `1px solid ${color}22` }}>
          <div style={{ fontFamily: 'Syne, sans-serif', fontWeight: 600, fontSize: 13, color: '#ddd', margin: '10px 0 6px' }}>{data.headline}</div>
          <div style={{ fontFamily: 'Syne, sans-serif', fontSize: 12, color: '#666', lineHeight: 1.7 }}>{data.detail}</div>
        </div>
      )}
    </div>
  );
}

// ── Intelligence Panel ─────────────────────────────────────────────────────
function IntelPanel({ company, sector, prices, onClose }) {
  const [state, setState] = useState('idle');
  const [briefing, setBriefing] = useState(null);
  const [error, setError] = useState(null);
  const priceData = company?.ticker ? prices[company.ticker] : null;
  const sentCfg = SENTIMENT_CONFIG[briefing?.sentiment] ?? SENTIMENT_CONFIG.neutral;

  const fetchBriefing = useCallback(async () => {
    if (!company) return;
    setState('loading'); setBriefing(null); setError(null);
    try {
      const res = await fetch('https://aifmi-production.up.railway.app/api/intelligence/briefing', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ company: company.name, ticker: company.ticker, hq: company.hq, spec: company.spec, sector: sector?.fullName ?? sector?.label, exchange: company.exchange }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? 'API error');
      setBriefing(data.briefing);
      setState('done');
    } catch (e) { setError(e.message); setState('error'); }
  }, [company, sector]);

  useEffect(() => { if (company) fetchBriefing(); }, [company]);

  if (!company) return null;
  const isPrivate = company.exchange === 'Private';

  return (
    <>
      <div onClick={onClose} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', zIndex: 200, backdropFilter: 'blur(2px)', animation: 'fadeIn 0.2s ease' }} />
      <div style={{ position: 'fixed', top: 0, right: 0, bottom: 0, width: 'min(520px, 95vw)', background: '#07070f', borderLeft: `1px solid ${sector?.color ?? '#1a1a2e'}`, zIndex: 201, display: 'flex', flexDirection: 'column', animation: 'slideIn 0.25s cubic-bezier(0.16,1,0.3,1)', overflowY: 'auto' }}>
        <div style={{ padding: '20px 24px 16px', borderBottom: '1px solid #0f0f1a', background: '#050508', position: 'sticky', top: 0, zIndex: 10 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <div>
              <div style={{ fontFamily: 'Syne, sans-serif', fontWeight: 800, fontSize: 20, color: '#fff', marginBottom: 4 }}>{company.name}</div>
              <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
                {company.ticker && <span style={{ fontFamily: 'Space Mono, monospace', fontSize: 11, color: sector?.color, background: `${sector?.color}18`, padding: '2px 8px', borderRadius: 4 }}>{company.ticker}</span>}
                <span style={{ fontFamily: 'Space Mono, monospace', fontSize: 11, color: '#555' }}>{company.exchange} · {company.hq}</span>
                {isPrivate && <span style={{ fontFamily: 'Space Mono, monospace', fontSize: 10, color: '#444', background: '#111', padding: '2px 7px', borderRadius: 4 }}>PRIVATE</span>}
              </div>
            </div>
            <button onClick={onClose} style={{ background: '#0f0f1a', border: '1px solid #1a1a2e', color: '#666', width: 32, height: 32, borderRadius: 6, cursor: 'pointer', fontFamily: 'Space Mono, monospace', fontSize: 16, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>✕</button>
          </div>
          {priceData && (
            <div style={{ marginTop: 14, padding: '12px 16px', background: '#0a0a12', borderRadius: 8, display: 'flex', gap: 24, alignItems: 'center' }}>
              <div>
                <div style={{ fontFamily: 'Space Mono, monospace', fontSize: 22, fontWeight: 700, color: '#f0f0f0' }}>{fmt(priceData.price)}</div>
                <div style={{ fontFamily: 'Space Mono, monospace', fontSize: 11, color: priceData.changePct >= 0 ? '#0FA97A' : '#DC3C3C', marginTop: 2 }}>{fmtPct(priceData.changePct)} today</div>
              </div>
              <div style={{ flex: 1, height: 40 }}>
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={sparkHistory[company.ticker] ?? []}>
                    <Line type="monotone" dataKey="v" dot={false} strokeWidth={2} stroke={priceData.changePct >= 0 ? '#0FA97A' : '#DC3C3C'} isAnimationActive={false} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>
          )}
        </div>
        <div style={{ padding: '20px 24px', flex: 1 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 18 }}>
            <div style={{ fontFamily: 'Space Mono, monospace', fontSize: 10, color: sector?.color, letterSpacing: 2, textTransform: 'uppercase' }}>AI Intelligence Briefing</div>
            <div style={{ flex: 1, height: 1, background: `${sector?.color}33` }} />
            {state === 'done' && <button onClick={fetchBriefing} style={{ background: 'none', border: '1px solid #1a1a2e', color: '#555', fontFamily: 'Space Mono, monospace', fontSize: 9, padding: '3px 8px', borderRadius: 4, cursor: 'pointer', letterSpacing: 1 }}>↻ REFRESH</button>}
          </div>
          {state === 'loading' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              {['Querying financial intelligence...', 'Analyzing earnings data...', 'Synthesizing investor briefing...'].map((msg, i) => (
                <div key={i} style={{ padding: '14px 16px', background: '#0a0a12', borderRadius: 8, animation: `pulse 1.5s ease-in-out ${i * 0.2}s infinite` }}>
                  <div style={{ fontFamily: 'Space Mono, monospace', fontSize: 11, color: '#333', marginBottom: 8 }}>{msg}</div>
                  <div style={{ height: 6, background: '#111', borderRadius: 3, overflow: 'hidden' }}>
                    <div style={{ height: '100%', borderRadius: 3, width: '40%', background: `linear-gradient(90deg, transparent, ${sector?.color ?? '#1A6FD8'}, transparent)`, animation: 'shimmer 1.4s ease-in-out infinite' }} />
                  </div>
                </div>
              ))}
            </div>
          )}
          {state === 'error' && (
            <div style={{ padding: 20, background: '#1a0808', border: '1px solid #DC3C3C33', borderRadius: 8 }}>
              <div style={{ fontFamily: 'Space Mono, monospace', fontSize: 11, color: '#DC3C3C', marginBottom: 8 }}>⚠ Failed to load briefing</div>
              <div style={{ fontFamily: 'Space Mono, monospace', fontSize: 10, color: '#666', marginBottom: 14 }}>{error}</div>
              <button onClick={fetchBriefing} style={{ background: '#DC3C3C18', border: '1px solid #DC3C3C44', color: '#DC3C3C', fontFamily: 'Space Mono, monospace', fontSize: 10, padding: '6px 14px', borderRadius: 4, cursor: 'pointer' }}>Try again</button>
            </div>
          )}
          {state === 'done' && briefing && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 14, animation: 'fadeIn 0.4s ease' }}>
              <div style={{ padding: 16, background: sentCfg.bg, border: `1px solid ${sentCfg.color}33`, borderRadius: 8 }}>
                <div style={{ fontFamily: 'Space Mono, monospace', fontSize: 10, color: sentCfg.color, marginBottom: 10, letterSpacing: 1 }}>{sentCfg.label}</div>
                <div style={{ fontFamily: 'Syne, sans-serif', fontSize: 13, color: '#ccc', lineHeight: 1.7 }}>{briefing.summary}</div>
              </div>
              {[
                { icon: '📊', label: 'Earnings & Financials', color: '#1A6FD8', data: briefing.earnings },
                { icon: '🤝', label: 'Investments & Partnerships', color: '#0E7A5A', data: briefing.investments },
                { icon: '👤', label: 'Leadership & Org', color: '#7B3FBF', data: briefing.leadership },
                { icon: '⚡', label: 'Products & Patents', color: '#C85C14', data: briefing.products },
              ].map(({ icon, label, color, data }) => (
                <IntelCard key={label} icon={icon} label={label} color={color} data={data} />
              ))}
              <div style={{ padding: '14px 16px', background: '#0a0a12', borderRadius: 8, borderLeft: `3px solid ${sector?.color}` }}>
                <div style={{ fontFamily: 'Space Mono, monospace', fontSize: 10, color: sector?.color, marginBottom: 8, letterSpacing: 1 }}>ANALYST OUTLOOK</div>
                <div style={{ fontFamily: 'Syne, sans-serif', fontSize: 13, color: '#777', lineHeight: 1.7, fontStyle: 'italic' }}>{briefing.outlook}</div>
              </div>
              <div style={{ fontFamily: 'Space Mono, monospace', fontSize: 9, color: '#2a2a3a', textAlign: 'right' }}>Generated by Claude · Knowledge cutoff applies · Not financial advice</div>
            </div>
          )}
        </div>
      </div>
    </>
  );
}

// ── Watchlist View ─────────────────────────────────────────────────────────
function WatchlistView({ watchlist, sectorData, prices, flashMap, onRemove, onSelectCompany, onSelectSector }) {
  if (watchlist.length === 0) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '80px 20px', gap: 16 }}>
        <div style={{ fontSize: 48 }}>⭐</div>
        <div style={{ fontFamily: 'Syne, sans-serif', fontWeight: 800, fontSize: 20, color: '#444' }}>Your watchlist is empty</div>
        <div style={{ fontFamily: 'Space Mono, monospace', fontSize: 11, color: '#333', textAlign: 'center', lineHeight: 1.8 }}>
          Click the ☆ icon next to any company<br />in a sector tab to add it here
        </div>
        <button onClick={() => onSelectSector('gpu')} style={{
          marginTop: 8, background: '#1A6FD818', border: '1px solid #1A6FD8', color: '#1A6FD8',
          fontFamily: 'Space Mono, monospace', fontSize: 11, padding: '10px 20px',
          borderRadius: 6, cursor: 'pointer', letterSpacing: 1,
        }}>BROWSE SECTORS →</button>
      </div>
    );
  }

  // Group watchlist by sector
  const grouped = {};
  for (const item of watchlist) {
    if (!grouped[item.sectorId]) grouped[item.sectorId] = [];
    grouped[item.sectorId].push(item);
  }

  const gainers = watchlist.filter(w => w.ticker && (prices[w.ticker]?.changePct ?? 0) > 0).length;
  const losers = watchlist.filter(w => w.ticker && (prices[w.ticker]?.changePct ?? 0) < 0).length;
  const totalValue = watchlist.filter(w => w.ticker && prices[w.ticker]).length;

  return (
    <div style={{ animation: 'fadeIn 0.3s ease' }}>
      {/* Summary bar */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 10, marginBottom: 24 }}>
        {[
          { label: 'Watching', value: watchlist.length, color: '#888' },
          { label: 'Advancing', value: gainers, color: '#0FA97A' },
          { label: 'Declining', value: losers, color: '#DC3C3C' },
        ].map(({ label, value, color }) => (
          <div key={label} style={{ background: '#0a0a12', borderRadius: 8, padding: '14px 18px', border: '1px solid #0f0f1a' }}>
            <div style={{ fontFamily: 'Space Mono, monospace', fontSize: 10, color: '#444', marginBottom: 6, letterSpacing: 1 }}>{label.toUpperCase()}</div>
            <div style={{ fontFamily: 'Syne, sans-serif', fontWeight: 800, fontSize: 28, color }}>{value}</div>
          </div>
        ))}
      </div>

      {/* Grouped by sector */}
      {Object.entries(grouped).map(([sectorId, companies]) => {
        const sector = SECTORS.find(s => s.id === sectorId);
        const sectorInfo = sectorData[sectorId];
        return (
          <div key={sectorId} style={{ marginBottom: 24 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
              <div style={{ width: 10, height: 10, borderRadius: '50%', background: sector?.color }} />
              <span style={{ fontFamily: 'Space Mono, monospace', fontSize: 10, color: sector?.color, letterSpacing: 2, textTransform: 'uppercase' }}>
                {sectorInfo?.fullName ?? sector?.label}
              </span>
              <div style={{ flex: 1, height: 1, background: `${sector?.color}22` }} />
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
              {companies.map((company) => {
                const priceData = company.ticker ? prices[company.ticker] : null;
                const flash = company.ticker ? flashMap[company.ticker] : null;
                const up = (priceData?.changePct ?? 0) >= 0;
                const flashColor = flash === 'up' ? 'rgba(15,169,122,0.15)' : flash === 'down' ? 'rgba(220,60,60,0.15)' : 'transparent';
                if (priceData) updateSpark(company.ticker, priceData.price);
                const spark = company.ticker ? (sparkHistory[company.ticker] ?? []) : [];

                return (
                  <div key={company.name} style={{
                    display: 'flex', alignItems: 'center', gap: 12,
                    padding: '12px 16px', background: flashColor || '#08080f',
                    borderRadius: 8, border: '1px solid #0f0f1a',
                    transition: 'background 0.4s', cursor: 'pointer',
                  }}
                    onMouseEnter={e => e.currentTarget.style.background = '#0d0d1a'}
                    onMouseLeave={e => e.currentTarget.style.background = flashColor || '#08080f'}
                    onClick={() => onSelectCompany(company, sectorId)}
                  >
                    {/* Company info */}
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontFamily: 'Syne, sans-serif', fontWeight: 600, fontSize: 14, color: '#f0f0f0' }}>{company.name}</div>
                      <div style={{ fontFamily: 'Space Mono, monospace', fontSize: 10, color: '#444', marginTop: 2 }}>{company.spec}</div>
                    </div>

                    {/* Ticker */}
                    <div style={{ fontFamily: 'Space Mono, monospace', fontSize: 11, color: sector?.color, background: `${sector?.color}18`, padding: '2px 8px', borderRadius: 4, flexShrink: 0 }}>
                      {company.ticker ?? 'PRIVATE'}
                    </div>

                    {/* Sparkline */}
                    {spark.length > 3 && (
                      <div style={{ width: 60, height: 28, flexShrink: 0 }}>
                        <ResponsiveContainer width="100%" height="100%">
                          <LineChart data={spark}>
                            <Line type="monotone" dataKey="v" dot={false} strokeWidth={1.5} stroke={up ? '#0FA97A' : '#DC3C3C'} isAnimationActive={false} />
                          </LineChart>
                        </ResponsiveContainer>
                      </div>
                    )}

                    {/* Price */}
                    <div style={{ textAlign: 'right', flexShrink: 0, minWidth: 80 }}>
                      {priceData ? (
                        <>
                          <div style={{ fontFamily: 'Space Mono, monospace', fontSize: 14, fontWeight: 700, color: '#eee' }}>{fmt(priceData.price)}</div>
                          <div style={{ fontFamily: 'Space Mono, monospace', fontSize: 10, color: up ? '#0FA97A' : '#DC3C3C' }}>{fmtPct(priceData.changePct)}</div>
                        </>
                      ) : (
                        <div style={{ fontFamily: 'Space Mono, monospace', fontSize: 11, color: '#333', fontStyle: 'italic' }}>Private</div>
                      )}
                    </div>

                    {/* Remove button */}
                    <button onClick={(e) => { e.stopPropagation(); onRemove(company.name); }} style={{
                      background: 'none', border: '1px solid #1a1a2e', color: '#333',
                      width: 26, height: 26, borderRadius: 4, cursor: 'pointer',
                      fontFamily: 'Space Mono, monospace', fontSize: 12,
                      display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
                    }}
                      onMouseEnter={e => { e.currentTarget.style.color = '#DC3C3C'; e.currentTarget.style.borderColor = '#DC3C3C44'; }}
                      onMouseLeave={e => { e.currentTarget.style.color = '#333'; e.currentTarget.style.borderColor = '#1a1a2e'; }}
                    >✕</button>
                  </div>
                );
              })}
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ── StatusDot ──────────────────────────────────────────────────────────────
function StatusDot({ connected }) {
  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
      <span style={{ width: 8, height: 8, borderRadius: '50%', background: connected ? '#0FA97A' : '#888', boxShadow: connected ? '0 0 6px #0FA97A' : 'none', display: 'inline-block', animation: connected ? 'pulse 2s ease-in-out infinite' : 'none' }} />
      <span style={{ color: connected ? '#0FA97A' : '#666', fontSize: 11, fontFamily: 'Space Mono, monospace' }}>{connected ? 'LIVE' : 'CONNECTING'}</span>
    </span>
  );
}

// ── PriceCell ──────────────────────────────────────────────────────────────
function PriceCell({ ticker, priceData, flashMap }) {
  if (!ticker || !priceData) return <div style={{ textAlign: 'right' }}><span style={{ color: '#333', fontSize: 12, fontFamily: 'Space Mono, monospace', fontStyle: 'italic' }}>Private</span></div>;
  const flash = flashMap[ticker];
  const up = priceData.changePct >= 0;
  const flashColor = flash === 'up' ? 'rgba(15,169,122,0.25)' : flash === 'down' ? 'rgba(220,60,60,0.25)' : 'transparent';
  updateSpark(ticker, priceData.price);
  const spark = sparkHistory[ticker] ?? [];
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8, justifyContent: 'flex-end', background: flashColor, transition: 'background 0.4s', borderRadius: 4, padding: '2px 4px' }}>
      {spark.length > 3 && (
        <div style={{ width: 50, height: 24 }}>
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={spark}>
              <Line type="monotone" dataKey="v" dot={false} strokeWidth={1.5} stroke={up ? '#0FA97A' : '#DC3C3C'} isAnimationActive={false} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      )}
      <div style={{ textAlign: 'right' }}>
        <div style={{ fontFamily: 'Space Mono, monospace', fontSize: 13, fontWeight: 700, color: '#eee' }}>{fmt(priceData.price)}</div>
        <div style={{ fontFamily: 'Space Mono, monospace', fontSize: 10, color: up ? '#0FA97A' : '#DC3C3C' }}>{fmtPct(priceData.changePct)}</div>
      </div>
    </div>
  );
}

// ── CompanyRow ─────────────────────────────────────────────────────────────
function CompanyRow({ company, rank, sectorColor, sectorId, prices, flashMap, onSelect, watchlist, onToggleWatch }) {
  const priceData = company.ticker && prices[company.ticker] ? prices[company.ticker] : null;
  const isPrivate = company.exchange === 'Private';
  const isWatched = watchlist.some(w => w.name === company.name);

  return (
    <tr style={{ borderBottom: '1px solid #1a1a2e', cursor: 'pointer' }}
      onMouseEnter={e => e.currentTarget.style.background = '#0d0d1a'}
      onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
    >
      <td style={{ padding: '10px 12px', color: sectorColor, fontFamily: 'Space Mono, monospace', fontSize: 13, fontWeight: 700, width: 40 }}>{rank}</td>
      <td style={{ padding: '10px 12px' }} onClick={() => onSelect(company)}>
        <div style={{ fontFamily: 'Syne, sans-serif', fontWeight: 600, fontSize: 14, color: '#f0f0f0' }}>
          {company.name}
          {isPrivate && <span style={{ marginLeft: 6, fontSize: 9, color: '#555', fontFamily: 'Space Mono, monospace', background: '#111', padding: '1px 5px', borderRadius: 3 }}>PRIVATE</span>}
        </div>
        <div style={{ fontFamily: 'Space Mono, monospace', fontSize: 10, color: '#555', marginTop: 2 }}>{company.spec}</div>
      </td>
      <td style={{ padding: '10px 12px', fontFamily: 'Space Mono, monospace', fontSize: 12, color: '#555' }} onClick={() => onSelect(company)}>{company.ticker ?? '—'}</td>
      <td style={{ padding: '10px 12px', fontFamily: 'Space Mono, monospace', fontSize: 11, color: '#444' }} onClick={() => onSelect(company)}>{company.exchange}</td>
      <td style={{ padding: '10px 12px', fontFamily: 'Space Mono, monospace', fontSize: 11, color: '#444' }} onClick={() => onSelect(company)}>{company.hq}</td>
      <td style={{ padding: '10px 12px', minWidth: 140 }} onClick={() => onSelect(company)}>
        <PriceCell ticker={company.ticker} priceData={priceData} flashMap={flashMap} />
      </td>
      {/* Watchlist star */}
      <td style={{ padding: '10px 12px', width: 36, textAlign: 'center' }}>
        <button onClick={() => onToggleWatch(company, sectorId)} style={{
          background: 'none', border: 'none', cursor: 'pointer',
          fontSize: 15, opacity: isWatched ? 1 : 0.3,
          transition: 'opacity 0.2s, transform 0.15s',
          color: isWatched ? '#F0A500' : '#888',
        }}
          onMouseEnter={e => { e.currentTarget.style.opacity = 1; e.currentTarget.style.transform = 'scale(1.2)'; }}
          onMouseLeave={e => { e.currentTarget.style.opacity = isWatched ? 1 : 0.3; e.currentTarget.style.transform = 'scale(1)'; }}
          title={isWatched ? 'Remove from watchlist' : 'Add to watchlist'}
        >
          {isWatched ? '★' : '☆'}
        </button>
      </td>
      <td style={{ padding: '10px 12px', width: 28, textAlign: 'center', color: '#2a2a3a', fontFamily: 'Space Mono, monospace', fontSize: 14 }} onClick={() => onSelect(company)}>›</td>
    </tr>
  );
}

// ── SectorPanel ────────────────────────────────────────────────────────────
function SectorPanel({ sector, data, prices, flashMap, active, onSelectCompany, watchlist, onToggleWatch }) {
  if (!active || !data) return null;
  return (
    <div style={{ animation: 'fadeIn 0.3s ease' }}>
      <div style={{ marginBottom: 20, padding: '16px 20px', background: '#0a0a12', borderRadius: 8, borderLeft: `3px solid ${sector.color}` }}>
        <div style={{ fontFamily: 'Syne, sans-serif', fontWeight: 800, fontSize: 13, color: sector.color, textTransform: 'uppercase', letterSpacing: 2, marginBottom: 6 }}>{data.fullName}</div>
        <div style={{ fontFamily: 'Syne, sans-serif', fontSize: 13, color: '#555', lineHeight: 1.6 }}>{data.description}</div>
        <div style={{ marginTop: 10, fontFamily: 'Space Mono, monospace', fontSize: 10, color: '#2a2a3a' }}>Click ☆ to watchlist · Click row for AI briefing</div>
      </div>
      <div style={{ overflowX: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ borderBottom: `2px solid ${sector.color}33` }}>
              {['#', 'Company', 'Ticker', 'Exchange', 'HQ', 'Live Price', '☆', ''].map((h, i) => (
                <th key={i} style={{ padding: '8px 12px', textAlign: i === 5 ? 'right' : 'left', fontFamily: 'Space Mono, monospace', fontSize: 10, color: i === 6 ? '#F0A500' : sector.color, letterSpacing: 1, textTransform: 'uppercase', fontWeight: 700, whiteSpace: 'nowrap' }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {data.companies.map((company, i) => (
              <CompanyRow key={company.name + i} company={company} rank={i + 1}
                sectorColor={sector.color} sectorId={sector.id}
                prices={prices} flashMap={flashMap}
                onSelect={onSelectCompany}
                watchlist={watchlist}
                onToggleWatch={onToggleWatch}
              />
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ── OverviewCard ───────────────────────────────────────────────────────────
function OverviewCard({ sector, data, prices, onClick, active }) {
  const publicCos = data?.companies.filter(c => c.ticker && prices[c.ticker]) ?? [];
  const avgChange = publicCos.length ? publicCos.reduce((acc, c) => acc + (prices[c.ticker]?.changePct ?? 0), 0) / publicCos.length : 0;
  const gainers = publicCos.filter(c => (prices[c.ticker]?.changePct ?? 0) > 0).length;
  return (
    <button onClick={onClick} style={{ background: active ? `${sector.color}18` : '#0a0a12', border: `1px solid ${active ? sector.color : '#1a1a2e'}`, borderRadius: 10, padding: '16px 18px', cursor: 'pointer', textAlign: 'left', transition: 'all 0.2s', width: '100%' }}>
      <div style={{ fontFamily: 'Syne, sans-serif', fontWeight: 800, fontSize: 15, color: active ? sector.color : '#777', marginBottom: 8 }}>{sector.label}</div>
      <div style={{ fontFamily: 'Space Mono, monospace', fontSize: 11, color: avgChange >= 0 ? '#0FA97A' : '#DC3C3C', marginBottom: 4 }}>Avg {fmtPct(avgChange)}</div>
      <div style={{ fontFamily: 'Space Mono, monospace', fontSize: 10, color: '#444' }}>{gainers}/{publicCos.length} advancing</div>
    </button>
  );
}

// ── App ────────────────────────────────────────────────────────────────────
export default function App() {
  const { prices, connected, flashMap } = useLivePrices();
  const [sectorData, setSectorData] = useState({});
  const [activeTab, setActiveTab] = useState('gpu');
  const [selectedCompany, setSelectedCompany] = useState(null);
  const [selectedCompanySector, setSelectedCompanySector] = useState(null);
  const [watchlist, setWatchlist] = useState(loadWatchlist);
  const [now, setNow] = useState(new Date());

  useEffect(() => {
    fetch(`${import.meta.env.VITE_API_URL ?? ''}/api/sectors`).then(r => r.json()).then(setSectorData).catch(console.error);
  }, []);

  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(t);
  }, []);

  useEffect(() => {
    const handler = (e) => { if (e.key === 'Escape') setSelectedCompany(null); };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, []);

  const toggleWatch = useCallback((company, sectorId) => {
    setWatchlist(prev => {
      const exists = prev.some(w => w.name === company.name);
      const next = exists
        ? prev.filter(w => w.name !== company.name)
        : [...prev, { ...company, sectorId }];
      saveWatchlist(next);
      return next;
    });
  }, []);

  const removeFromWatchlist = useCallback((name) => {
    setWatchlist(prev => {
      const next = prev.filter(w => w.name !== name);
      saveWatchlist(next);
      return next;
    });
  }, []);

  const handleSelectCompany = useCallback((company, sectorIdOverride) => {
    setSelectedCompany(company);
    const sId = sectorIdOverride ?? activeTab;
    setSelectedCompanySector(SECTORS.find(s => s.id === sId));
  }, [activeTab]);

  const activeSector = SECTORS.find(s => s.id === activeTab);
  const activeSectorData = sectorData[activeTab];
  const isWatchlistTab = activeTab === 'watchlist';

  const intelSector = selectedCompanySector
    ? { ...selectedCompanySector, fullName: sectorData[selectedCompanySector.id]?.fullName }
    : activeSector
      ? { ...activeSector, fullName: activeSectorData?.fullName }
      : null;

  return (
    <div style={{ minHeight: '100vh', background: '#050508', color: '#f0f0f0' }}>
      <style>{`
        * { box-sizing: border-box; margin: 0; padding: 0; }
        body { background: #050508; }
        @keyframes pulse { 0%,100%{opacity:1} 50%{opacity:0.4} }
        @keyframes fadeIn { from{opacity:0;transform:translateY(6px)} to{opacity:1;transform:none} }
        @keyframes slideIn { from{transform:translateX(100%)} to{transform:translateX(0)} }
        @keyframes shimmer { 0%{transform:translateX(-200%)} 100%{transform:translateX(300%)} }
        ::-webkit-scrollbar{width:6px;height:6px}
        ::-webkit-scrollbar-track{background:#050508}
        ::-webkit-scrollbar-thumb{background:#1a1a2e;border-radius:3px}
      `}</style>

      {/* Header */}
      <header style={{ borderBottom: '1px solid #0f0f1a', padding: '16px 32px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: '#070710', position: 'sticky', top: 0, zIndex: 100 }}>
        <div style={{ display: 'flex', alignItems: 'baseline', gap: 14 }}>
          <span style={{ fontFamily: 'Syne, sans-serif', fontWeight: 800, fontSize: 20, color: '#fff', letterSpacing: -0.5 }}>AI<span style={{ color: '#1A6FD8' }}>FMI</span></span>
          <span style={{ fontFamily: 'Space Mono, monospace', fontSize: 10, color: '#2a2a3a', letterSpacing: 1 }}>AI FINANCIAL MARKET INDICATOR</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 20 }}>
          <span style={{ fontFamily: 'Space Mono, monospace', fontSize: 11, color: '#2a2a3a' }}>{now.toLocaleTimeString('en-US', { hour12: false })}</span>
          <StatusDot connected={connected} />
        </div>
      </header>

      <div style={{ maxWidth: 1280, margin: '0 auto', padding: '28px 24px' }}>

        {/* Nav — sector cards + watchlist tab */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr) 160px', gap: 10, marginBottom: 28 }}>
          {SECTORS.map(s => (
            <OverviewCard key={s.id} sector={s} data={sectorData[s.id]} prices={prices}
              active={activeTab === s.id} onClick={() => setActiveTab(s.id)} />
          ))}
          {/* Watchlist card */}
          <button onClick={() => setActiveTab('watchlist')} style={{
            background: activeTab === 'watchlist' ? '#F0A50018' : '#0a0a12',
            border: `1px solid ${activeTab === 'watchlist' ? '#F0A500' : '#1a1a2e'}`,
            borderRadius: 10, padding: '16px 18px', cursor: 'pointer', textAlign: 'left', transition: 'all 0.2s',
          }}>
            <div style={{ fontFamily: 'Syne, sans-serif', fontWeight: 800, fontSize: 15, color: activeTab === 'watchlist' ? '#F0A500' : '#777', marginBottom: 8 }}>⭐ Watchlist</div>
            <div style={{ fontFamily: 'Space Mono, monospace', fontSize: 11, color: '#F0A500', marginBottom: 4 }}>{watchlist.length} stocks</div>
            <div style={{ fontFamily: 'Space Mono, monospace', fontSize: 10, color: '#444' }}>
              {watchlist.filter(w => w.ticker && (prices[w.ticker]?.changePct ?? 0) > 0).length} advancing
            </div>
          </button>
        </div>

        {/* Content area */}
        {isWatchlistTab ? (
          <>
            <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 20 }}>
              <div style={{ height: 2, width: 32, background: '#F0A500' }} />
              <span style={{ fontFamily: 'Syne, sans-serif', fontWeight: 800, fontSize: 22, color: '#fff' }}>My Watchlist</span>
              <div style={{ height: 2, flex: 1, background: 'linear-gradient(90deg, #F0A50044, transparent)' }} />
              {watchlist.length > 0 && (
                <button onClick={() => { setWatchlist([]); saveWatchlist([]); }} style={{ background: 'none', border: '1px solid #1a1a2e', color: '#333', fontFamily: 'Space Mono, monospace', fontSize: 9, padding: '4px 10px', borderRadius: 4, cursor: 'pointer', letterSpacing: 1 }}>CLEAR ALL</button>
              )}
            </div>
            <div style={{ background: '#08080f', borderRadius: 12, border: '1px solid #0f0f1a', padding: 24 }}>
              <WatchlistView
                watchlist={watchlist}
                sectorData={sectorData}
                prices={prices}
                flashMap={flashMap}
                onRemove={removeFromWatchlist}
                onSelectCompany={(company, sectorId) => handleSelectCompany(company, sectorId ?? company.sectorId)}
                onSelectSector={setActiveTab}
              />
            </div>
          </>
        ) : (
          <>
            <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 20 }}>
              <div style={{ height: 2, width: 32, background: activeSector?.color }} />
              <span style={{ fontFamily: 'Syne, sans-serif', fontWeight: 800, fontSize: 22, color: '#fff' }}>{activeSector?.label} Sector</span>
              <div style={{ height: 2, flex: 1, background: `linear-gradient(90deg, ${activeSector?.color}44, transparent)` }} />
              <span style={{ fontFamily: 'Space Mono, monospace', fontSize: 10, color: '#2a2a3a' }}>TOP 20 COMPANIES</span>
            </div>
            <div style={{ background: '#08080f', borderRadius: 12, border: '1px solid #0f0f1a', padding: 24 }}>
              {SECTORS.map(s => (
                <SectorPanel key={s.id} sector={s} data={sectorData[s.id]}
                  prices={prices} flashMap={flashMap} active={activeTab === s.id}
                  onSelectCompany={(company) => handleSelectCompany(company)}
                  watchlist={watchlist}
                  onToggleWatch={toggleWatch}
                />
              ))}
            </div>
          </>
        )}

        <div style={{ marginTop: 24, textAlign: 'center', fontFamily: 'Space Mono, monospace', fontSize: 10, color: '#1a1a2a', lineHeight: 2 }}>
          AIFMI v1.0 · Not financial advice
        </div>
      </div>

      {selectedCompany && (
        <IntelPanel
          company={selectedCompany}
          sector={intelSector}
          prices={prices}
          onClose={() => { setSelectedCompany(null); setSelectedCompanySector(null); }}
        />
      )}
    </div>
  );
}
