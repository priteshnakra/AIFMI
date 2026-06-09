import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';

const API = 'https://aifmi.onrender.com';
const FINNHUB = 'https://finnhub.io/api/v1';
const FKEY = import.meta.env.VITE_FINNHUB_KEY ?? '';

const SECTOR_COLORS = {
  gpu: '#1A6FD8', chip: '#0e7490', asic: '#047857',
  npu: '#6d28d9', network: '#c2410c',
};

const fmt = (n) => n == null ? '—' : `$${n.toFixed(2)}`;
const fmtB = (n) => {
  if (n == null) return '—';
  if (n >= 1e12) return `$${(n / 1e12).toFixed(2)}T`;
  if (n >= 1e9) return `$${(n / 1e9).toFixed(2)}B`;
  if (n >= 1e6) return `$${(n / 1e6).toFixed(2)}M`;
  return `$${n.toFixed(0)}`;
};
const fmtPct = (n) => n == null ? '—' : `${n >= 0 ? '+' : ''}${n.toFixed(2)}%`;

function loadPortfolio() {
  try { return JSON.parse(localStorage.getItem('aifmi_portfolio') ?? '[]'); } catch { return []; }
}
function savePortfolio(p) {
  localStorage.setItem('aifmi_portfolio', JSON.stringify(p));
}

export default function Portfolio() {
  const navigate = useNavigate();
  const [holdings, setHoldings] = useState(loadPortfolio);
  const [allCompanies, setAllCompanies] = useState([]);
  const [search, setSearch] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [showSearch, setShowSearch] = useState(false);
  const [liveData, setLiveData] = useState({});
  const [analysis, setAnalysis] = useState(null);
  const [analysisLoading, setAnalysisLoading] = useState(false);
  const [editingShares, setEditingShares] = useState(null);
  const [sharesInput, setSharesInput] = useState('');
  const [activeTab, setActiveTab] = useState('holdings');
  const [riskTolerance, setRiskTolerance] = useState(3);

  // Load all companies from backend
  useEffect(() => {
    fetch(`${API}/api/sectors`).then(r => r.json()).then(data => {
      const companies = [];
      Object.entries(data).forEach(([sectorId, sector]) => {
        sector.companies?.forEach(c => {
          if (c.ticker && ['NASDAQ', 'NYSE'].includes(c.exchange)) {
            companies.push({ ...c, sectorId, sectorLabel: sector.label, sectorColor: SECTOR_COLORS[sectorId] });
          }
        });
      });
      setAllCompanies(companies);
    }).catch(() => {});
  }, []);

  // Fetch live prices for holdings
  useEffect(() => {
    if (holdings.length === 0) return;
    const tickers = holdings.map(h => h.ticker);
    fetch(`${API}/api/prices`).then(r => r.json()).then(data => {
      setLiveData(data);
    }).catch(() => {});
  }, [holdings]);

  // Search filter
  useEffect(() => {
    if (!search.trim()) { setSearchResults([]); return; }
    const q = search.toLowerCase();
    setSearchResults(
      allCompanies.filter(c =>
        c.name.toLowerCase().includes(q) || c.ticker.toLowerCase().includes(q)
      ).slice(0, 8)
    );
  }, [search, allCompanies]);

  const addHolding = (company) => {
    if (holdings.find(h => h.ticker === company.ticker)) return;
    const newHoldings = [...holdings, { ...company, shares: 1, addedAt: Date.now() }];
    setHoldings(newHoldings);
    savePortfolio(newHoldings);
    setSearch('');
    setShowSearch(false);
    setAnalysis(null);
  };

  const removeHolding = (ticker) => {
    const newHoldings = holdings.filter(h => h.ticker !== ticker);
    setHoldings(newHoldings);
    savePortfolio(newHoldings);
    setAnalysis(null);
  };

  const updateShares = (ticker, shares) => {
    const n = parseFloat(shares);
    if (isNaN(n) || n <= 0) return;
    const newHoldings = holdings.map(h => h.ticker === ticker ? { ...h, shares: n } : h);
    setHoldings(newHoldings);
    savePortfolio(newHoldings);
    setEditingShares(null);
    setAnalysis(null);
  };

  // Portfolio calculations
  const enrichedHoldings = holdings.map(h => {
    const price = liveData[h.ticker]?.price ?? null;
    const changePct = liveData[h.ticker]?.changePct ?? null;
    const value = price ? price * h.shares : null;
    return { ...h, price, changePct, value };
  });

  const totalValue = enrichedHoldings.reduce((s, h) => s + (h.value ?? 0), 0);

  const sectorBreakdown = enrichedHoldings.reduce((acc, h) => {
    if (!h.value) return acc;
    acc[h.sectorId] = acc[h.sectorId] || { label: h.sectorLabel, color: h.sectorColor, value: 0, count: 0 };
    acc[h.sectorId].value += h.value;
    acc[h.sectorId].count += 1;
    return acc;
  }, {});

  const topGainer = enrichedHoldings.reduce((best, h) =>
    (h.changePct ?? -999) > (best?.changePct ?? -999) ? h : best, null);
  const topLoser = enrichedHoldings.reduce((worst, h) =>
    (h.changePct ?? 999) < (worst?.changePct ?? 999) ? h : worst, null);
  const dayChange = enrichedHoldings.reduce((s, h) => {
    if (h.price && h.changePct) {
      const prev = h.price / (1 + h.changePct / 100);
      return s + (h.price - prev) * h.shares;
    }
    return s;
  }, 0);

  // AI Analysis
  const runAnalysis = useCallback(async () => {
    if (holdings.length === 0) return;
    setAnalysisLoading(true);
    setAnalysis(null);
    setActiveTab('analysis');

    const holdingsSummary = enrichedHoldings.map(h => ({
      name: h.name, ticker: h.ticker, sector: h.sectorLabel,
      shares: h.shares, price: h.price, value: h.value,
      changePct: h.changePct,
      weight: h.value && totalValue ? ((h.value / totalValue) * 100).toFixed(1) + '%' : 'N/A',
    }));

    const sectorSummary = Object.entries(sectorBreakdown).map(([id, s]) => ({
      sector: s.label,
      value: s.value,
      weight: totalValue ? ((s.value / totalValue) * 100).toFixed(1) + '%' : 'N/A',
      count: s.count,
    }));

    const prompt = `You are a senior portfolio analyst. Analyze this AI semiconductor portfolio.

PORTFOLIO HOLDINGS:
\${JSON.stringify(holdingsSummary, null, 2)}

SECTOR BREAKDOWN:
\${JSON.stringify(sectorSummary, null, 2)}

TOTAL PORTFOLIO VALUE: $\${totalValue.toFixed(2)}
DAY CHANGE: $\${dayChange.toFixed(2)}

INVESTOR RISK TOLERANCE: \${riskTolerance}/5 (\${['','Conservative','Conservative','Moderate','Growth','Aggressive'][riskTolerance]})

Respond with ONLY valid JSON:
{
  "verdict": "STRONG BUY | BUY | HOLD | REDUCE | SELL",
  "riskScore": 7,
  "riskLabel": "Elevated",
  "riskFit": "one sentence on whether this portfolio matches the investor risk tolerance",
  "summary": "2-3 sentence summary",
  "strengths": ["s1", "s2", "s3"],
  "risks": ["r1", "r2", "r3"],
  "recommendations": [
    {"action": "ADD | REDUCE | HOLD | TRIM", "ticker": "TICKER", "reason": "reason"}
  ],
  "pitches": [
    {"ticker": "TICKER", "name": "Company Name", "sector": "gpu|chip|asic|npu|network", "reason": "2 sentence pitch for why this fills a gap given the investor risk tolerance", "pe": "P/E or N/A", "highlight": "key metric e.g. Rev Growth +46%"},
    {"ticker": "TICKER", "name": "Company Name", "sector": "gpu|chip|asic|npu|network", "reason": "2 sentence pitch", "pe": "P/E or N/A", "highlight": "key metric"}
  ],
  "concentration": "comment on sector concentration",
  "outlook": "forward looking sentence"
}

For pitches: recommend 2 stocks the user does NOT own that fill portfolio gaps. Use actual AIFMI companies (NVDA, AMD, INTC, QCOM, ARM, TSM, ASML, AVGO, MRVL, etc).`;

    try {
      const res = await fetch('https://aifmi.onrender.com/api/portfolio/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt }),
      });
      const parsed = await res.json();
      setAnalysis(parsed);
    } catch {
      setAnalysis({ error: true });
    }
    setAnalysisLoading(false);
  }, [holdings, enrichedHoldings, totalValue, dayChange, sectorBreakdown]);

  const verdictColor = {
    'STRONG BUY': '#15803d', 'BUY': '#15803d',
    'HOLD': '#d97706', 'REDUCE': '#dc2626', 'SELL': '#dc2626',
  };

  return (
    <div style={{ minHeight: '100vh', background: '#f5f5f5', fontFamily: "'DM Sans', -apple-system, sans-serif" }}>

      {/* NAV */}
      <div style={{ background: '#fff', borderBottom: '1px solid #e8e8e8', padding: '0 32px', height: 56, display: 'flex', alignItems: 'center', justifyContent: 'space-between', position: 'sticky', top: 0, zIndex: 100 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
          <span onClick={() => navigate('/')} style={{ fontSize: 18, fontWeight: 800, color: '#0a0a0a', letterSpacing: -0.8, cursor: 'pointer' }}>
            AI<span style={{ color: '#1A6FD8' }}>FMI</span>
          </span>
          <div style={{ width: 1, height: 16, background: '#e0e0e0' }} />
          <span style={{ fontSize: 13, fontWeight: 600, color: '#0a0a0a' }}>Portfolio Builder</span>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <button onClick={() => navigate('/')} style={{ fontSize: 12, fontWeight: 500, padding: '6px 14px', borderRadius: 6, border: '1px solid #e0e0e0', background: '#fff', color: '#0a0a0a', cursor: 'pointer' }}>← Dashboard</button>
          {holdings.length > 0 && (
            <button onClick={runAnalysis} disabled={analysisLoading} style={{ fontSize: 12, fontWeight: 700, padding: '6px 16px', borderRadius: 6, border: 'none', background: '#0a0a0a', color: '#fff', cursor: 'pointer', opacity: analysisLoading ? 0.6 : 1 }}>
              {analysisLoading ? 'Analyzing...' : '✦ Run AI Analysis'}
            </button>
          )}
        </div>
      </div>

      <div style={{ maxWidth: 1100, margin: '0 auto', padding: '32px 24px' }}>

        {/* HEADER */}
        <div style={{ marginBottom: 28 }}>
          <h1 style={{ fontSize: 28, fontWeight: 800, color: '#0a0a0a', letterSpacing: -0.8, marginBottom: 6 }}>Portfolio Builder</h1>
          <p style={{ fontSize: 14, color: '#0a0a0a' }}>Build your AI semiconductor portfolio, track performance, and get Claude-powered institutional analysis.</p>
        </div>

        {/* STATS ROW */}
        {holdings.length > 0 && (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12, marginBottom: 24 }}>
            {[
              { label: 'Portfolio Value', value: totalValue > 0 ? `$${totalValue.toFixed(2)}` : '—', sub: `${holdings.length} positions` },
              { label: "Today's Change", value: dayChange !== 0 ? `${dayChange >= 0 ? '+' : ''}$${dayChange.toFixed(2)}` : '—', sub: dayChange !== 0 ? `${dayChange >= 0 ? '+' : ''}${((dayChange / (totalValue - dayChange)) * 100).toFixed(2)}%` : '', color: dayChange >= 0 ? '#15803d' : '#dc2626' },
              { label: 'Top Gainer', value: topGainer?.ticker ?? '—', sub: topGainer ? fmtPct(topGainer.changePct) : '', color: '#15803d' },
              { label: 'Top Loser', value: topLoser?.ticker ?? '—', sub: topLoser ? fmtPct(topLoser.changePct) : '', color: '#dc2626' },
            ].map(({ label, value, sub, color }) => (
              <div key={label} style={{ background: '#fff', borderRadius: 10, padding: '16px 18px', border: '1px solid #e8e8e8' }}>
                <div style={{ fontSize: 10, fontWeight: 700, color: '#0a0a0a', textTransform: 'uppercase', letterSpacing: 0.8, marginBottom: 6 }}>{label}</div>
                <div style={{ fontSize: 22, fontWeight: 800, color: color ?? '#0a0a0a', fontVariantNumeric: 'tabular-nums', marginBottom: 2 }}>{value}</div>
                {sub && <div style={{ fontSize: 11, color: color ?? '#0a0a0a', fontWeight: 500 }}>{sub}</div>}
              </div>
            ))}
          </div>
        )}

        <div style={{ display: 'grid', gridTemplateColumns: holdings.length > 0 ? '1fr 320px' : '1fr', gap: 20 }}>

          {/* LEFT COLUMN */}
          <div>

            {/* TABS */}
            {holdings.length > 0 && (
              <div style={{ display: 'flex', gap: 0, marginBottom: 16, background: '#fff', borderRadius: 8, border: '1px solid #e8e8e8', padding: 4, width: 'fit-content' }}>
                {['holdings', 'analysis'].map(tab => (
                  <button key={tab} onClick={() => setActiveTab(tab)} style={{
                    padding: '6px 16px', borderRadius: 6, border: 'none', fontSize: 12, fontWeight: 600,
                    cursor: 'pointer', textTransform: 'capitalize',
                    background: activeTab === tab ? '#0a0a0a' : 'transparent',
                    color: activeTab === tab ? '#fff' : '#0a0a0a',
                  }}>{tab}</button>
                ))}
              </div>
            )}


            {/* RISK METER */}
            <div style={{ background: '#fff', borderRadius: 10, padding: '16px 20px', border: '1px solid #e8e8e8', marginBottom: 16 }}>
              <div style={{ fontSize: 11, fontWeight: 700, color: '#0a0a0a', textTransform: 'uppercase', letterSpacing: 0.8, marginBottom: 12 }}>
                Risk Tolerance
                <span style={{ fontSize: 10, fontWeight: 400, textTransform: 'none', letterSpacing: 0, marginLeft: 8 }}>— tell Claude how you want to invest</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 12 }}>
                <span style={{ fontSize: 11, fontWeight: 500, color: '#0a0a0a', width: 80 }}>Conservative</span>
                <div style={{ display: 'flex', gap: 8, flex: 1, justifyContent: 'center' }}>
                  {[1,2,3,4,5].map(n => {
                    const colors = ['','#15803d','#15803d','#d97706','#d97706','#dc2626'];
                    const active = n <= riskTolerance;
                    return (
                      <div key={n} onClick={() => setRiskTolerance(n)}
                        style={{ width: 28, height: 28, borderRadius: '50%', border: '2px solid ' + (active ? colors[riskTolerance] : '#e0e0e0'), background: active ? colors[riskTolerance] : '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', fontSize: 11, fontWeight: 700, color: active ? '#fff' : '#0a0a0a', transition: 'all 0.15s', flexShrink: 0 }}>
                        {n}
                      </div>
                    );
                  })}
                </div>
                <span style={{ fontSize: 11, fontWeight: 500, color: '#0a0a0a', width: 80, textAlign: 'right' }}>Aggressive</span>
              </div>
              {(() => {
                const info = [null,
                  { title: 'Conservative (1/5)', body: 'Maximum capital preservation. Claude will flag positions above 15% and suggest low-beta dividend stocks.', bg: '#f0fdf4', border: '#bbf7d0', tc: '#15803d' },
                  { title: 'Conservative (2/5)', body: 'You prioritize capital preservation. Claude will flag overweight positions and avoid high-beta stocks.', bg: '#f0fdf4', border: '#bbf7d0', tc: '#15803d' },
                  { title: 'Moderate (3/5)', body: 'Balanced approach. Claude balances growth and risk management equally.', bg: '#fffbeb', border: '#fde68a', tc: '#d97706' },
                  { title: 'Growth (4/5)', body: 'You accept higher volatility for higher returns. Claude leans toward buy signals on momentum names.', bg: '#fffbeb', border: '#fde68a', tc: '#d97706' },
                  { title: 'Aggressive (5/5)', body: 'Maximum growth. Claude recommends high-conviction buys and flags sells only on fundamental breakdowns.', bg: '#fef2f2', border: '#fecaca', tc: '#dc2626' },
                ][riskTolerance];
                return (
                  <div style={{ background: info.bg, borderRadius: 8, padding: '10px 14px', border: '1px solid ' + info.border }}>
                    <div style={{ fontSize: 12, fontWeight: 700, color: info.tc, marginBottom: 3 }}>{info.title}</div>
                    <div style={{ fontSize: 12, color: '#0a0a0a', lineHeight: 1.6 }}>{info.body}</div>
                  </div>
                );
              })()}
            </div>

            {/* ADD STOCK */}
            <div style={{ background: '#fff', borderRadius: 10, padding: '16px 20px', border: '1px solid #e8e8e8', marginBottom: 16, position: 'relative' }}>
              <div style={{ fontSize: 11, fontWeight: 700, color: '#0a0a0a', textTransform: 'uppercase', letterSpacing: 0.8, marginBottom: 10 }}>Add Position</div>
              <div style={{ display: 'flex', gap: 8 }}>
                <input
                  value={search}
                  onChange={e => { setSearch(e.target.value); setShowSearch(true); }}
                  onFocus={() => setShowSearch(true)}
                  placeholder="Search by company name or ticker..."
                  style={{ flex: 1, padding: '9px 14px', borderRadius: 7, border: '1px solid #e0e0e0', fontSize: 13, color: '#0a0a0a', outline: 'none', fontFamily: 'inherit' }}
                />
              </div>
              {showSearch && searchResults.length > 0 && (
                <div style={{ position: 'absolute', top: '100%', left: 20, right: 20, background: '#fff', border: '1px solid #e8e8e8', borderRadius: 8, zIndex: 50, boxShadow: '0 8px 24px rgba(0,0,0,0.1)', overflow: 'hidden', marginTop: 4 }}>
                  {searchResults.map(c => (
                    <div key={c.ticker} onClick={() => addHolding(c)}
                      style={{ padding: '10px 16px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '1px solid #f5f5f5' }}
                      onMouseEnter={e => e.currentTarget.style.background = '#f5f5f5'}
                      onMouseLeave={e => e.currentTarget.style.background = '#fff'}
                    >
                      <div>
                        <div style={{ fontSize: 13, fontWeight: 600, color: '#0a0a0a' }}>{c.name}</div>
                        <div style={{ fontSize: 11, color: '#0a0a0a', marginTop: 2 }}>{c.ticker} · {c.exchange}</div>
                      </div>
                      <span style={{ fontSize: 10, fontWeight: 700, padding: '2px 8px', borderRadius: 4, background: c.sectorColor + '15', color: c.sectorColor }}>{c.sectorLabel}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* HOLDINGS TAB */}
            {activeTab === 'holdings' && (
              <>
                {holdings.length === 0 ? (
                  <div style={{ background: '#fff', borderRadius: 10, border: '1px solid #e8e8e8', padding: '48px', textAlign: 'center' }}>
                    <div style={{ fontSize: 32, marginBottom: 12 }}>📊</div>
                    <div style={{ fontSize: 16, fontWeight: 700, color: '#0a0a0a', marginBottom: 8 }}>Build your portfolio</div>
                    <div style={{ fontSize: 13, color: '#0a0a0a' }}>Search for AI semiconductor stocks above to start tracking your positions and get AI-powered analysis.</div>
                  </div>
                ) : (
                  <div style={{ background: '#fff', borderRadius: 10, border: '1px solid #e8e8e8', overflow: 'hidden' }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                      <thead>
                        <tr style={{ background: '#fafafa', borderBottom: '1px solid #e8e8e8' }}>
                          {['Company', 'Shares', 'Price', 'Value', 'Change', 'Weight', ''].map(h => (
                            <th key={h} style={{ padding: '10px 14px', fontSize: 10, fontWeight: 700, color: '#0a0a0a', textAlign: h === '' ? 'center' : 'left', textTransform: 'uppercase', letterSpacing: 0.5 }}>{h}</th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {enrichedHoldings.map(h => (
                          <tr key={h.ticker} style={{ borderBottom: '1px solid #f5f5f5' }}
                            onMouseEnter={e => e.currentTarget.style.background = '#fafafa'}
                            onMouseLeave={e => e.currentTarget.style.background = '#fff'}
                          >
                            <td style={{ padding: '12px 14px' }}>
                              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                <div style={{ width: 3, height: 28, borderRadius: 2, background: h.sectorColor, flexShrink: 0 }} />
                                <div>
                                  <div style={{ fontSize: 13, fontWeight: 600, color: '#0a0a0a', cursor: 'pointer' }} onClick={() => navigate(`/company/${h.ticker}`)}>{h.name}</div>
                                  <div style={{ fontSize: 10, color: '#0a0a0a', marginTop: 1 }}>{h.ticker} · {h.sectorLabel}</div>
                                </div>
                              </div>
                            </td>
                            <td style={{ padding: '12px 14px' }}>
                              {editingShares === h.ticker ? (
                                <input
                                  autoFocus
                                  value={sharesInput}
                                  onChange={e => setSharesInput(e.target.value)}
                                  onBlur={() => updateShares(h.ticker, sharesInput)}
                                  onKeyDown={e => e.key === 'Enter' && updateShares(h.ticker, sharesInput)}
                                  style={{ width: 70, padding: '4px 8px', borderRadius: 5, border: '1px solid #1A6FD8', fontSize: 12, fontFamily: 'inherit', outline: 'none' }}
                                />
                              ) : (
                                <span onClick={() => { setEditingShares(h.ticker); setSharesInput(String(h.shares)); }}
                                  style={{ fontSize: 13, fontWeight: 500, color: '#0a0a0a', cursor: 'pointer', textDecoration: 'underline', textDecorationStyle: 'dotted' }}>
                                  {h.shares}
                                </span>
                              )}
                            </td>
                            <td style={{ padding: '12px 14px', fontSize: 13, fontWeight: 600, color: '#0a0a0a', fontVariantNumeric: 'tabular-nums' }}>{fmt(h.price)}</td>
                            <td style={{ padding: '12px 14px', fontSize: 13, fontWeight: 700, color: '#0a0a0a', fontVariantNumeric: 'tabular-nums' }}>{h.value ? `$${h.value.toFixed(2)}` : '—'}</td>
                            <td style={{ padding: '12px 14px' }}>
                              {h.changePct != null ? (
                                <span style={{ fontSize: 11, fontWeight: 700, padding: '3px 8px', borderRadius: 4, background: h.changePct >= 0 ? '#f0fdf4' : '#fef2f2', color: h.changePct >= 0 ? '#15803d' : '#dc2626', fontVariantNumeric: 'tabular-nums' }}>
                                  {fmtPct(h.changePct)}
                                </span>
                              ) : '—'}
                            </td>
                            <td style={{ padding: '12px 14px' }}>
                              {h.value && totalValue ? (
                                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                                  <div style={{ width: 40, height: 4, borderRadius: 2, background: '#f0f0f0', overflow: 'hidden' }}>
                                    <div style={{ width: `${(h.value / totalValue) * 100}%`, height: '100%', background: h.sectorColor, borderRadius: 2 }} />
                                  </div>
                                  <span style={{ fontSize: 11, color: '#0a0a0a', fontVariantNumeric: 'tabular-nums' }}>{((h.value / totalValue) * 100).toFixed(1)}%</span>
                                </div>
                              ) : '—'}
                            </td>
                            <td style={{ padding: '12px 14px', textAlign: 'center' }}>
                              <button onClick={() => removeHolding(h.ticker)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#ccc', fontSize: 16, lineHeight: 1 }}
                                onMouseEnter={e => e.currentTarget.style.color = '#dc2626'}
                                onMouseLeave={e => e.currentTarget.style.color = '#ccc'}
                              >×</button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </>
            )}

            {/* ANALYSIS TAB */}
            {activeTab === 'analysis' && (
              <div>
                {!analysis && !analysisLoading && (
                  <div style={{ background: '#fff', borderRadius: 10, border: '1px solid #e8e8e8', padding: '48px', textAlign: 'center' }}>
                    <div style={{ fontSize: 32, marginBottom: 12 }}>✦</div>
                    <div style={{ fontSize: 16, fontWeight: 700, color: '#0a0a0a', marginBottom: 8 }}>AI Portfolio Analysis</div>
                    <div style={{ fontSize: 13, color: '#0a0a0a', marginBottom: 20 }}>Get institutional-grade analysis of your portfolio — risk scoring, sector concentration, and Claude-powered recommendations.</div>
                    <button onClick={runAnalysis} style={{ fontSize: 13, fontWeight: 700, padding: '10px 24px', borderRadius: 7, background: '#0a0a0a', color: '#fff', border: 'none', cursor: 'pointer' }}>Run Analysis →</button>
                  </div>
                )}

                {analysisLoading && (
                  <div style={{ background: '#fff', borderRadius: 10, border: '1px solid #e8e8e8', padding: '48px', textAlign: 'center' }}>
                    <div style={{ fontSize: 13, color: '#0a0a0a', marginBottom: 16 }}>Analyzing your portfolio...</div>
                    {['Evaluating sector concentration...', 'Assessing risk profile...', 'Generating recommendations...'].map((msg, i) => (
                      <div key={i} style={{ padding: '10px 14px', background: '#f5f5f5', borderRadius: 6, marginBottom: 8, fontSize: 12, color: '#0a0a0a', animation: `pulse 1.5s ease-in-out ${i * 0.3}s infinite` }}>{msg}</div>
                    ))}
                  </div>
                )}

                {analysis && !analysis.error && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>

                    {/* VERDICT */}
                    <div style={{ background: '#fff', borderRadius: 10, border: '1px solid #e8e8e8', padding: '20px 24px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                      <div>
                        <div style={{ fontSize: 10, fontWeight: 700, color: '#0a0a0a', textTransform: 'uppercase', letterSpacing: 0.8, marginBottom: 6 }}>AI Verdict</div>
                        <div style={{ fontSize: 26, fontWeight: 800, color: verdictColor[analysis.verdict] ?? '#0a0a0a' }}>{analysis.verdict}</div>
                        <div style={{ fontSize: 13, color: '#0a0a0a', marginTop: 8, lineHeight: 1.7 }}>{analysis.summary}</div>
                      </div>
                      <div style={{ textAlign: 'center', flexShrink: 0, marginLeft: 24 }}>
                        <div style={{ fontSize: 10, fontWeight: 700, color: '#0a0a0a', textTransform: 'uppercase', letterSpacing: 0.8, marginBottom: 8 }}>Risk Score</div>
                        <div style={{ width: 72, height: 72, borderRadius: '50%', border: `4px solid ${analysis.riskScore > 6 ? '#dc2626' : analysis.riskScore > 4 ? '#d97706' : '#15803d'}`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column' }}>
                          <div style={{ fontSize: 24, fontWeight: 800, color: '#0a0a0a' }}>{analysis.riskScore}</div>
                          <div style={{ fontSize: 8, color: '#0a0a0a' }}>/10</div>
                        </div>
                        <div style={{ fontSize: 11, fontWeight: 600, color: '#0a0a0a', marginTop: 6 }}>{analysis.riskLabel}</div>
                      </div>
                    </div>

                    {/* STRENGTHS & RISKS */}
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                      <div style={{ background: '#f0fdf4', borderRadius: 10, padding: '18px 20px', border: '1px solid #bbf7d0' }}>
                        <div style={{ fontSize: 11, fontWeight: 700, color: '#15803d', textTransform: 'uppercase', letterSpacing: 0.8, marginBottom: 12 }}>Strengths</div>
                        {analysis.strengths?.map((s, i) => (
                          <div key={i} style={{ display: 'flex', gap: 8, marginBottom: 8 }}>
                            <span style={{ color: '#15803d', fontWeight: 700, flexShrink: 0 }}>✓</span>
                            <span style={{ fontSize: 13, color: '#0a0a0a', lineHeight: 1.6 }}>{s}</span>
                          </div>
                        ))}
                      </div>
                      <div style={{ background: '#fef2f2', borderRadius: 10, padding: '18px 20px', border: '1px solid #fecaca' }}>
                        <div style={{ fontSize: 11, fontWeight: 700, color: '#dc2626', textTransform: 'uppercase', letterSpacing: 0.8, marginBottom: 12 }}>Risks</div>
                        {analysis.risks?.map((r, i) => (
                          <div key={i} style={{ display: 'flex', gap: 8, marginBottom: 8 }}>
                            <span style={{ color: '#dc2626', fontWeight: 700, flexShrink: 0 }}>!</span>
                            <span style={{ fontSize: 13, color: '#0a0a0a', lineHeight: 1.6 }}>{r}</span>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* RECOMMENDATIONS */}
                    <div style={{ background: '#fff', borderRadius: 10, border: '1px solid #e8e8e8', padding: '20px 24px' }}>
                      <div style={{ fontSize: 11, fontWeight: 700, color: '#0a0a0a', textTransform: 'uppercase', letterSpacing: 0.8, marginBottom: 14 }}>Recommendations</div>
                      {analysis.recommendations?.map((r, i) => (
                        <div key={i} style={{ display: 'flex', gap: 12, alignItems: 'flex-start', marginBottom: 12, paddingBottom: 12, borderBottom: i < analysis.recommendations.length - 1 ? '1px solid #f5f5f5' : 'none' }}>
                          <span style={{
                            fontSize: 10, fontWeight: 700, padding: '3px 8px', borderRadius: 4, flexShrink: 0, marginTop: 1,
                            background: r.action === 'ADD' ? '#f0fdf4' : r.action === 'REDUCE' || r.action === 'TRIM' ? '#fef2f2' : '#f5f5f5',
                            color: r.action === 'ADD' ? '#15803d' : r.action === 'REDUCE' || r.action === 'TRIM' ? '#dc2626' : '#0a0a0a',
                          }}>{r.action}</span>
                          <div>
                            <span style={{ fontSize: 13, fontWeight: 700, color: '#1A6FD8', cursor: 'pointer', marginRight: 6 }} onClick={() => navigate(`/company/${r.ticker}`)}>{r.ticker}</span>
                            <span style={{ fontSize: 13, color: '#0a0a0a', lineHeight: 1.6 }}>{r.reason}</span>
                          </div>
                        </div>
                      ))}
                    </div>


                    {analysis.pitches && analysis.pitches.length > 0 && (
                      <div>
                        <div style={{ fontSize: 11, fontWeight: 700, color: '#0a0a0a', textTransform: 'uppercase', letterSpacing: 0.8, marginBottom: 10 }}>
                          AI Stock Recommendations
                          <span style={{ fontSize: 10, fontWeight: 400, textTransform: 'none', letterSpacing: 0, marginLeft: 8 }}>stocks to consider adding</span>
                        </div>
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                          {analysis.pitches.map((p, idx) => {
                            const sc = ({ gpu: '#1A6FD8', chip: '#0e7490', asic: '#047857', npu: '#6d28d9', network: '#c2410c' })[p.sector] || '#1A6FD8';
                            return (
                              <div key={idx} style={{ background: '#fff', borderRadius: 10, padding: '16px 18px', border: '1px solid #e8e8e8', borderLeft: '4px solid ' + sc }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8 }}>
                                  <div>
                                    <div style={{ fontSize: 15, fontWeight: 800, color: '#0a0a0a' }}>{p.name}</div>
                                    <div style={{ fontSize: 11, color: '#0a0a0a', marginTop: 2 }}>{p.ticker} · {p.sector}</div>
                                  </div>
                                  <div style={{ display: 'flex', gap: 5, flexShrink: 0, marginLeft: 8 }}>
                                    {p.pe && p.pe !== 'N/A' && <span style={{ fontSize: 10, fontWeight: 700, padding: '2px 7px', borderRadius: 4, background: '#f5f5f5', color: '#0a0a0a' }}>P/E {p.pe}</span>}
                                    {p.highlight && <span style={{ fontSize: 10, fontWeight: 700, padding: '2px 7px', borderRadius: 4, background: '#f0fdf4', color: '#15803d' }}>{p.highlight}</span>}
                                  </div>
                                </div>
                                <div style={{ fontSize: 12, color: '#0a0a0a', lineHeight: 1.7, marginBottom: 12 }}>{p.reason}</div>
                                <div style={{ display: 'flex', gap: 8 }}>
                                  <button onClick={() => navigate('/company/' + p.ticker)} style={{ flex: 1, padding: '7px', borderRadius: 6, border: 'none', background: '#0a0a0a', color: '#fff', fontSize: 11, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit' }}>View Profile</button>
                                  <button onClick={() => { const co = allCompanies.find(c => c.ticker === p.ticker); if(co) addHolding(co); }} style={{ flex: 1, padding: '7px', borderRadius: 6, border: '1px solid #e0e0e0', background: '#fff', color: '#0a0a0a', fontSize: 11, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit' }}>+ Add</button>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    )}
                    {/* OUTLOOK */}
                    <div style={{ background: '#0a0a0a', borderRadius: 10, padding: '18px 22px' }}>
                      <div style={{ fontSize: 10, fontWeight: 700, color: '#1A6FD8', textTransform: 'uppercase', letterSpacing: 0.8, marginBottom: 8 }}>Sector Outlook</div>
                      <div style={{ fontSize: 13, color: '#fff', lineHeight: 1.7 }}>{analysis.outlook}</div>
                      <div style={{ fontSize: 10, color: '#555', marginTop: 10 }}>Generated by Claude AI · Not financial advice · For informational purposes only</div>
                    </div>
                  </div>
                )}

                {analysis?.error && (
                  <div style={{ background: '#fef2f2', borderRadius: 10, border: '1px solid #fecaca', padding: '24px', textAlign: 'center' }}>
                    <div style={{ fontSize: 13, color: '#dc2626', marginBottom: 12 }}>Analysis failed. Please try again.</div>
                    <button onClick={runAnalysis} style={{ fontSize: 12, fontWeight: 600, padding: '8px 16px', borderRadius: 6, background: '#0a0a0a', color: '#fff', border: 'none', cursor: 'pointer' }}>Try Again</button>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* RIGHT COLUMN — Sector Breakdown */}
          {holdings.length > 0 && (
            <div>
              <div style={{ background: '#fff', borderRadius: 10, border: '1px solid #e8e8e8', padding: '20px', marginBottom: 16 }}>
                <div style={{ fontSize: 11, fontWeight: 700, color: '#0a0a0a', textTransform: 'uppercase', letterSpacing: 0.8, marginBottom: 16 }}>Sector Breakdown</div>
                {Object.entries(sectorBreakdown).sort((a, b) => b[1].value - a[1].value).map(([id, s]) => {
                  const pct = totalValue ? (s.value / totalValue) * 100 : 0;
                  return (
                    <div key={id} style={{ marginBottom: 14 }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 5 }}>
                        <span style={{ fontSize: 12, fontWeight: 600, color: s.color }}>{s.label}</span>
                        <span style={{ fontSize: 12, fontWeight: 600, color: '#0a0a0a', fontVariantNumeric: 'tabular-nums' }}>{pct.toFixed(1)}%</span>
                      </div>
                      <div style={{ height: 6, background: '#f0f0f0', borderRadius: 3, overflow: 'hidden' }}>
                        <div style={{ width: `${pct}%`, height: '100%', background: s.color, borderRadius: 3, transition: 'width 0.5s ease' }} />
                      </div>
                      <div style={{ fontSize: 11, color: '#0a0a0a', marginTop: 3 }}>{s.count} position{s.count > 1 ? 's' : ''} · {fmtB(s.value)}</div>
                    </div>
                  );
                })}
              </div>

              {analysis?.concentration && (
                <div style={{ background: '#fff', borderRadius: 10, border: '1px solid #e8e8e8', padding: '18px 20px' }}>
                  <div style={{ fontSize: 11, fontWeight: 700, color: '#0a0a0a', textTransform: 'uppercase', letterSpacing: 0.8, marginBottom: 10 }}>Concentration Note</div>
                  <div style={{ fontSize: 13, color: '#0a0a0a', lineHeight: 1.7 }}>{analysis.concentration}</div>
                </div>
              )}

              <div style={{ background: '#fff', borderRadius: 10, border: '1px solid #e8e8e8', padding: '18px 20px', marginTop: 16 }}>
                <div style={{ fontSize: 11, fontWeight: 700, color: '#0a0a0a', textTransform: 'uppercase', letterSpacing: 0.8, marginBottom: 12 }}>Quick Actions</div>
                <button onClick={() => { setHoldings([]); savePortfolio([]); setAnalysis(null); }}
                  style={{ width: '100%', padding: '9px', borderRadius: 7, border: '1px solid #fecaca', background: '#fef2f2', color: '#dc2626', fontSize: 12, fontWeight: 600, cursor: 'pointer', marginBottom: 8 }}>
                  Clear Portfolio
                </button>
                <button onClick={() => navigate('/')}
                  style={{ width: '100%', padding: '9px', borderRadius: 7, border: '1px solid #e0e0e0', background: '#fff', color: '#0a0a0a', fontSize: 12, fontWeight: 600, cursor: 'pointer' }}>
                  Browse Companies
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* FOOTER */}
      <div style={{ borderTop: '1px solid #e8e8e8', padding: '16px 32px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: '#fafafa', marginTop: 48 }}>
        <span style={{ fontSize: 13, fontWeight: 800, color: '#0a0a0a' }}>AI<span style={{ color: '#1A6FD8' }}>FMI</span></span>
        <div style={{ display: 'flex', gap: 20 }}>
          {[['About', '/about'], ['Disclaimer', '/disclaimer'], ['Contact', '/contact']].map(([l, p]) => (
            <a key={l} href={p} style={{ fontSize: 11, fontWeight: 500, color: '#0a0a0a', textDecoration: 'none' }}>{l}</a>
          ))}
        </div>
        <span style={{ fontSize: 10, color: '#888' }}>Not financial advice · v2.0</span>
      </div>
    </div>
  );
}
