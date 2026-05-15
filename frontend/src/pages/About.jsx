import { useNavigate } from 'react-router-dom';
export default function About() {
  const navigate = useNavigate();
  return (
    <div style={{ minHeight: '100vh', background: '#f5f5f5', fontFamily: "-apple-system, BlinkMacSystemFont, 'Helvetica Neue', sans-serif" }}>
      <div style={{ background: '#fff', borderBottom: '1px solid #e8e8e8', padding: '0 48px', height: 56, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <span onClick={() => navigate('/')} style={{ fontSize: 18, fontWeight: 800, color: '#0a0a0a', letterSpacing: -0.8, cursor: 'pointer' }}>AI<span style={{ color: '#1A6FD8' }}>FMI</span></span>
        <button onClick={() => navigate('/')} style={{ fontSize: 12, fontWeight: 600, padding: '6px 14px', borderRadius: 6, border: '1px solid #e0e0e0', background: '#fff', color: '#0a0a0a', cursor: 'pointer' }}>← Dashboard</button>
      </div>
      <div style={{ maxWidth: 760, margin: '0 auto', padding: '64px 48px' }}>
        <div style={{ fontSize: 11, fontWeight: 700, color: '#1A6FD8', letterSpacing: 2, textTransform: 'uppercase', marginBottom: 16 }}>About AIFMI</div>
        <h1 style={{ fontSize: 38, fontWeight: 800, color: '#0a0a0a', letterSpacing: -1.2, lineHeight: 1.15, marginBottom: 20 }}>Institutional-grade AI market intelligence — built for every investor.</h1>
        <p style={{ fontSize: 16, color: '#0a0a0a', lineHeight: 1.8, marginBottom: 48 }}>AIFMI gives you the same deep, real-time analysis of AI semiconductor companies that Wall Street analysts spend hours building manually — in seconds, for free.</p>
        <div style={{ height: 1, background: '#e8e8e8', marginBottom: 48 }} />
        <h2 style={{ fontSize: 22, fontWeight: 700, color: '#0a0a0a', marginBottom: 16 }}>Who is this for?</h2>
        <p style={{ fontSize: 14, color: '#0a0a0a', lineHeight: 1.85, marginBottom: 24 }}>If you are a serious investor, portfolio manager, analyst, or finance student who wants to understand the AI hardware sector — AIFMI is built for you.</p>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 48 }}>
          {[['Without AIFMI', ['Hours researching 100+ AI companies manually', 'Scattered data across Bloomberg and Yahoo Finance', 'No easy peer comparison or benchmark tools', 'AI briefings that cost thousands per month'], '#fef2f2', '#dc2626', '✕'],['With AIFMI', ['Live prices, metrics and AI briefings in one place', 'Instant peer comparison vs FINX, ARKF and Dow Jones', 'Investor scorecard across 5 institutional dimensions', 'Claude-powered analysis — free, fast, always on'], '#f0fdf4', '#15803d', '✓']].map(([title, items, bg, color, icon]) => (
            <div key={title} style={{ background: bg, borderRadius: 10, padding: '20px 22px', border: '1px solid ' + color + '33' }}>
              <div style={{ fontSize: 11, fontWeight: 700, color: color, textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 14 }}>{title}</div>
              {items.map(item => (<div key={item} style={{ display: 'flex', gap: 8, marginBottom: 10 }}><span style={{ color: color, fontWeight: 700, fontSize: 12, flexShrink: 0 }}>{icon}</span><span style={{ fontSize: 13, color: '#0a0a0a', lineHeight: 1.6 }}>{item}</span></div>))}
            </div>
          ))}
        </div>
        <div style={{ height: 1, background: '#e8e8e8', marginBottom: 48 }} />
        <h2 style={{ fontSize: 22, fontWeight: 700, color: '#0a0a0a', marginBottom: 20 }}>The story behind it</h2>
        <div style={{ background: '#fff', borderRadius: 12, padding: '28px 32px', border: '1px solid #e8e8e8', display: 'flex', gap: 28, alignItems: 'flex-start', marginBottom: 16 }}>
          <div style={{ width: 64, height: 64, borderRadius: '50%', background: 'linear-gradient(135deg, #1A6FD8, #0FA97A)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, fontSize: 24, fontWeight: 800, color: '#fff' }}>P</div>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 17, fontWeight: 700, color: '#0a0a0a', marginBottom: 2 }}>Pritesh Nakra</div>
            <div style={{ fontSize: 12, fontWeight: 600, color: '#1A6FD8', marginBottom: 16 }}>Finance and Business Analytics · Whitman School of Management, Syracuse University</div>
            <p style={{ fontSize: 13, color: '#0a0a0a', lineHeight: 1.8, marginBottom: 12 }}>I built AIFMI because I could not find a single tool that gave me a fast, clean, AI-powered view of the semiconductor market. As a finance student with internship experience at KPMG India, Anand Rathi, and Mahindra Finance, I kept running into the same wall — deep market intelligence was locked behind expensive institutional platforms. So I built it myself.</p>
            <p style={{ fontSize: 13, color: '#0a0a0a', lineHeight: 1.8, marginBottom: 20 }}>AIFMI started as a side project and turned into a full-stack fintech platform. It is still growing — and I am always open to feedback.</p>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              <a href="https://www.linkedin.com/in/priteshnakra" target="_blank" rel="noopener noreferrer" style={{ fontSize: 12, fontWeight: 600, padding: '6px 14px', borderRadius: 6, background: '#0a66c2', color: '#fff', textDecoration: 'none' }}>LinkedIn</a>
              <a href="mailto:priteshnakra@gmail.com" style={{ fontSize: 12, fontWeight: 600, padding: '6px 14px', borderRadius: 6, background: '#f0f0f0', color: '#0a0a0a', textDecoration: 'none' }}>priteshnakra@gmail.com</a>
              <a href="tel:+12167028786" style={{ fontSize: 12, fontWeight: 600, padding: '6px 14px', borderRadius: 6, background: '#f0f0f0', color: '#0a0a0a', textDecoration: 'none' }}>+1 (216) 702-8786</a>
            </div>
          </div>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 10, marginBottom: 48 }}>
          {[['KPMG India', 'Audit and Advisory Intern'], ['Anand Rathi', 'Finance Intern'], ['Mahindra Finance', 'Financial Analysis Intern']].map(([co, role]) => (
            <div key={co} style={{ background: '#fff', borderRadius: 8, padding: '14px 16px', border: '1px solid #e8e8e8' }}>
              <div style={{ fontSize: 12, fontWeight: 700, color: '#0a0a0a' }}>{co}</div>
              <div style={{ fontSize: 11, color: '#0a0a0a', marginTop: 3 }}>{role}</div>
            </div>
          ))}
        </div>
        <div style={{ height: 1, background: '#e8e8e8', marginBottom: 48 }} />
        <h2 style={{ fontSize: 22, fontWeight: 700, color: '#0a0a0a', marginBottom: 20 }}>What you get</h2>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 48 }}>
          {[['Live Market Data', 'Real-time prices across 100+ AI hardware companies — GPU, ASIC, NPU, Microchip and Networking.'], ['AI Intelligence Briefings', 'Claude-powered analysis of earnings, leadership, products and analyst outlook for every company.'], ['Investor Scorecard', '5-dimension institutional scoring: Moat, Supply Chain, Market Fit, Financials and Ecosystem.'], ['Peer Comparison', 'Normalize and compare stocks vs FINX, ARKF and DIA — with AI-generated verdicts.']].map(([title, desc]) => (
            <div key={title} style={{ background: '#fff', borderRadius: 10, padding: '18px 20px', border: '1px solid #e8e8e8' }}>
              <div style={{ fontSize: 13, fontWeight: 700, color: '#0a0a0a', marginBottom: 6 }}>{title}</div>
              <div style={{ fontSize: 12, color: '#0a0a0a', lineHeight: 1.7 }}>{desc}</div>
            </div>
          ))}
        </div>
        <div style={{ background: '#0a0a0a', borderRadius: 12, padding: '36px', display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center', gap: 16 }}>
          <div style={{ fontSize: 22, fontWeight: 800, color: '#fff', letterSpacing: -0.5 }}>Ready to start?</div>
          <div style={{ fontSize: 14, color: '#888', maxWidth: 440 }}>Explore live AI market data, company profiles, and Claude-powered briefings — no signup required.</div>
          <div style={{ display: 'flex', gap: 10 }}>
            <button onClick={() => navigate('/')} style={{ fontSize: 13, fontWeight: 700, padding: '11px 24px', borderRadius: 7, background: '#fff', color: '#0a0a0a', border: 'none', cursor: 'pointer' }}>Open Dashboard</button>
            <a href="mailto:priteshnakra@gmail.com" style={{ fontSize: 13, fontWeight: 700, padding: '11px 24px', borderRadius: 7, background: 'transparent', color: '#fff', border: '1px solid #333', textDecoration: 'none' }}>Get in Touch</a>
          </div>
        </div>
      </div>
      <div style={{ borderTop: '1px solid #e8e8e8', padding: '16px 48px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: '#fafafa', marginTop: 48 }}>
        <span style={{ fontSize: 13, fontWeight: 800, color: '#0a0a0a' }}>AIFMI</span>
        <div style={{ display: 'flex', gap: 20 }}>
          <a href="/about" style={{ fontSize: 11, fontWeight: 500, color: '#0a0a0a', textDecoration: 'none' }}>About</a>
          <a href="/disclaimer" style={{ fontSize: 11, fontWeight: 500, color: '#0a0a0a', textDecoration: 'none' }}>Disclaimer</a>
          <a href="/contact" style={{ fontSize: 11, fontWeight: 500, color: '#0a0a0a', textDecoration: 'none' }}>Contact</a>
        </div>
        <span style={{ fontSize: 10, color: '#888' }}>Not financial advice · v2.0</span>
      </div>
    </div>
  );
}
