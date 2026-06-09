import { useNavigate } from 'react-router-dom';

export default function About() {
  const navigate = useNavigate();
  return (
    <div style={{ minHeight: '100vh', background: '#f5f5f5', fontFamily: "-apple-system, BlinkMacSystemFont, 'Helvetica Neue', sans-serif" }}>
      {/* NAV */}
      <div style={{ background: '#fff', borderBottom: '1px solid #e8e8e8', padding: '0 48px', height: 56, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <span onClick={() => navigate('/')} style={{ fontSize: 18, fontWeight: 800, color: '#0a0a0a', letterSpacing: -0.8, cursor: 'pointer' }}>AI<span style={{ color: '#1A6FD8' }}>FMI</span></span>
        <button onClick={() => navigate('/')} style={{ fontSize: 12, fontWeight: 600, padding: '6px 14px', borderRadius: 6, border: '1px solid #e0e0e0', background: '#fff', color: '#0a0a0a', cursor: 'pointer' }}>← Dashboard</button>
      </div>

      <div style={{ maxWidth: 820, margin: '0 auto', padding: '64px 48px' }}>

        {/* HERO */}
        <div style={{ marginBottom: 64 }}>
          <div style={{ fontSize: 11, fontWeight: 700, color: '#1A6FD8', letterSpacing: 2, textTransform: 'uppercase', marginBottom: 16 }}>About</div>
          <h1 style={{ fontSize: 42, fontWeight: 800, color: '#0a0a0a', letterSpacing: -1.5, lineHeight: 1.1, marginBottom: 24 }}>AI Financial Market Indicator</h1>
          <p style={{ fontSize: 17, color: '#0a0a0a', lineHeight: 1.8, maxWidth: 640 }}>AIFMI is a real-time AI semiconductor and fintech intelligence platform built to give investors, analysts, and portfolio managers a data-driven edge in the most consequential technology sector of our time.</p>
        </div>

        {/* DIVIDER */}
        <div style={{ height: 1, background: '#e8e8e8', marginBottom: 64 }} />

        {/* WHAT WE DO */}
        <div style={{ marginBottom: 64 }}>
          <h2 style={{ fontSize: 24, fontWeight: 700, color: '#0a0a0a', marginBottom: 24 }}>What AIFMI Does</h2>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
            {[
              ['Live Market Intelligence', 'Real-time prices, performance metrics, and sector averages across GPU, Microchip, ASIC, NPU, and Networking companies — updated continuously via Finnhub.'],
              ['AI-Powered Briefings', 'Every company profile includes a Claude-generated intelligence briefing covering earnings, leadership, products, investments, and forward-looking analyst outlook.'],
              ['Investor Scorecard', 'Each company is evaluated across 5 institutional dimensions: Technical Moat, Supply Chain Resilience, Market Fit, Financial Health, and Strategic Ecosystem.'],
              ['Peer Comparison', 'Normalized 1-month performance charts benchmarked against FINX, ARKF, and DIA — with AI analyst verdicts on relative performance.'],
            ].map(([title, desc]) => (
              <div key={title} style={{ background: '#fff', borderRadius: 10, padding: '20px 22px', border: '1px solid #e8e8e8' }}>
                <div style={{ fontSize: 13, fontWeight: 700, color: '#0a0a0a', marginBottom: 8 }}>{title}</div>
                <div style={{ fontSize: 13, color: '#0a0a0a', lineHeight: 1.7 }}>{desc}</div>
              </div>
            ))}
          </div>
        </div>

        {/* DIVIDER */}
        <div style={{ height: 1, background: '#e8e8e8', marginBottom: 64 }} />

        {/* ABOUT THE BUILDER */}
        <div style={{ marginBottom: 64 }}>
          <h2 style={{ fontSize: 24, fontWeight: 700, color: '#0a0a0a', marginBottom: 24 }}>About the Builder</h2>
          <div style={{ background: '#fff', borderRadius: 10, padding: '28px 32px', border: '1px solid #e8e8e8', display: 'flex', gap: 32, alignItems: 'flex-start' }}>
            <div style={{ width: 56, height: 56, borderRadius: '50%', background: '#1A6FD8', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
              <span style={{ fontSize: 20, fontWeight: 800, color: '#fff' }}>P</span>
            </div>
            <div>
              <div style={{ fontSize: 17, fontWeight: 700, color: '#0a0a0a', marginBottom: 4 }}>Pritesh Nakra</div>
              <div style={{ fontSize: 12, color: '#0a0a0a', marginBottom: 16, fontWeight: 500 }}>Sophomore, Finance & Accounting · Martin J. Whitman School of Management, Syracuse University</div>
              <p style={{ fontSize: 13, color: '#0a0a0a', lineHeight: 1.75, marginBottom: 12 }}>AIFMI was built as a passion project at the intersection of finance, technology, and AI. With prior internship experience at KPMG India, Anand Rathi, and Mahindra Finance, Pritesh built AIFMI to democratize the kind of deep-sector intelligence that institutional investors take for granted.</p>
              <p style={{ fontSize: 13, color: '#0a0a0a', lineHeight: 1.75 }}>The platform combines real-time market data with Claude AI to give serious investors a fast, clean, and intelligent window into the AI hardware ecosystem — from GPU design firms to neuromorphic chip startups.</p>
            </div>
          </div>
        </div>

        {/* DIVIDER */}
        <div style={{ height: 1, background: '#e8e8e8', marginBottom: 64 }} />

        {/* TECH STACK */}
        <div style={{ marginBottom: 64 }}>
          <h2 style={{ fontSize: 24, fontWeight: 700, color: '#0a0a0a', marginBottom: 24 }}>Technology</h2>
          <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
            {['React', 'Node.js', 'Finnhub API', 'Claude AI (Anthropic)', 'Recharts', 'Vercel', 'Render', 'Yahoo Finance'].map(t => (
              <span key={t} style={{ fontSize: 12, fontWeight: 600, padding: '6px 14px', borderRadius: 6, background: '#fff', border: '1px solid #e0e0e0', color: '#0a0a0a' }}>{t}</span>
            ))}
          </div>
        </div>

        {/* CTA */}
        <div style={{ background: '#0a0a0a', borderRadius: 12, padding: '32px 36px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div>
            <div style={{ fontSize: 18, fontWeight: 700, color: '#fff', marginBottom: 6 }}>Ready to explore the AI hardware market?</div>
            <div style={{ fontSize: 13, color: '#888' }}>Real-time data · AI briefings · Institutional-grade analysis</div>
          </div>
          <button onClick={() => navigate('/')} style={{ fontSize: 13, fontWeight: 700, padding: '11px 22px', borderRadius: 7, background: '#fff', color: '#0a0a0a', border: 'none', cursor: 'pointer', whiteSpace: 'nowrap' }}>Open Dashboard →</button>
        </div>

      </div>

      {/* FOOTER */}
      <div style={{ borderTop: '1px solid #e8e8e8', padding: '16px 48px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: '#fafafa' }}>
        <span style={{ fontSize: 13, fontWeight: 800, color: '#0a0a0a' }}>AI<span style={{ color: '#1A6FD8' }}>FMI</span></span>
        <div style={{ display: 'flex', gap: 20 }}>
          {[['About', '/about'], ['Disclaimer', '/disclaimer'], ['Contact', '/contact']].map(([l, p]) => (
            <span key={l} onClick={() => navigate(p)} style={{ fontSize: 11, fontWeight: 500, color: '#0a0a0a', cursor: 'pointer' }}>{l}</span>
          ))}
        </div>
        <span style={{ fontSize: 10, color: '#888' }}>Not financial advice · v2.0</span>
      </div>
    </div>
  );
}
