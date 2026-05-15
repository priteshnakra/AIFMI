import { useNavigate } from 'react-router-dom';

export default function DisclaimerPage() {
  const navigate = useNavigate();
  return (
    <div style={{ minHeight: '100vh', background: '#f5f5f5', fontFamily: "-apple-system, BlinkMacSystemFont, 'Helvetica Neue', sans-serif" }}>
      {/* NAV */}
      <div style={{ background: '#fff', borderBottom: '1px solid #e8e8e8', padding: '0 48px', height: 56, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <span onClick={() => navigate('/')} style={{ fontSize: 18, fontWeight: 800, color: '#0a0a0a', letterSpacing: -0.8, cursor: 'pointer' }}>AI<span style={{ color: '#1A6FD8' }}>FMI</span></span>
        <button onClick={() => navigate('/')} style={{ fontSize: 12, fontWeight: 600, padding: '6px 14px', borderRadius: 6, border: '1px solid #e0e0e0', background: '#fff', color: '#0a0a0a', cursor: 'pointer' }}>← Dashboard</button>
      </div>

      <div style={{ maxWidth: 820, margin: '0 auto', padding: '64px 48px' }}>
        <div style={{ fontSize: 11, fontWeight: 700, color: '#dc2626', letterSpacing: 2, textTransform: 'uppercase', marginBottom: 16 }}>Legal</div>
        <h1 style={{ fontSize: 36, fontWeight: 800, color: '#0a0a0a', letterSpacing: -1, lineHeight: 1.1, marginBottom: 12 }}>Disclaimer & Terms of Use</h1>
        <p style={{ fontSize: 13, color: '#0a0a0a', marginBottom: 48 }}>Last updated: May 2026</p>

        {[
          {
            title: 'Not Financial Advice',
            content: 'AIFMI is an informational and educational platform only. Nothing on this website — including AI-generated briefings, investor scorecards, price data, analyst ratings, peer comparisons, or any other content — constitutes financial, investment, legal, or tax advice. Do not make investment decisions based solely on information provided by AIFMI.',
            accent: '#dc2626',
          },
          {
            title: 'AI-Generated Content',
            content: 'Intelligence briefings, investor scorecards, analyst outlooks, and other AI-generated content are produced by large language models (Claude by Anthropic). These outputs may contain inaccuracies, outdated information, hallucinations, or errors. They reflect model-generated analysis, not human financial research, and should be treated accordingly.',
            accent: '#1A6FD8',
          },
          {
            title: 'Data Accuracy',
            content: 'Live prices, financial metrics, analyst ratings, earnings data, and price targets are sourced from third-party data providers including Finnhub and Yahoo Finance. AIFMI does not guarantee the accuracy, completeness, timeliness, or reliability of this data. Market data may be delayed, incorrect, or incomplete.',
            accent: '#F0A500',
          },
          {
            title: 'Investment Risk',
            content: 'Investing in securities involves significant risk, including the possible loss of your entire principal. Past performance of any stock, sector, index, or benchmark displayed on AIFMI does not guarantee or predict future results. The AI semiconductor sector is particularly volatile and subject to rapid technological, regulatory, and geopolitical change.',
            accent: '#dc2626',
          },
          {
            title: 'No Warranty',
            content: 'AIFMI is provided "as is" without warranty of any kind, express or implied. AIFMI and its creator make no representations about the suitability, reliability, availability, timeliness, or accuracy of the information, products, or services provided on this platform for any purpose.',
            accent: '#0FA97A',
          },
          {
            title: 'Limitation of Liability',
            content: 'In no event shall AIFMI or its creator be liable for any direct, indirect, incidental, special, or consequential damages arising from your use of, or reliance on, any information on this platform — including financial losses, lost profits, or any other damages.',
            accent: '#7B3FBF',
          },
          {
            title: 'Third-Party Links',
            content: 'AIFMI provides links to third-party broker platforms (Robinhood, Fidelity, Schwab, etc.) for convenience only. These links do not constitute endorsement. AIFMI is not affiliated with any broker and receives no compensation for these links. Always conduct your own due diligence before using any financial service.',
            accent: '#C85C14',
          },
          {
            title: 'Regulatory Compliance',
            content: 'AIFMI is not registered as an investment advisor, broker-dealer, or financial planner with any regulatory authority including the SEC, FINRA, or any state or international equivalent. Always consult a qualified, licensed financial professional before making investment decisions.',
            accent: '#1A6FD8',
          },
        ].map(({ title, content, accent }) => (
          <div key={title} style={{ background: '#fff', borderRadius: 10, padding: '22px 24px', border: '1px solid #e8e8e8', borderLeft: `4px solid ${accent}`, marginBottom: 16 }}>
            <div style={{ fontSize: 13, fontWeight: 700, color: '#0a0a0a', marginBottom: 8 }}>{title}</div>
            <div style={{ fontSize: 13, color: '#0a0a0a', lineHeight: 1.75 }}>{content}</div>
          </div>
        ))}

        <div style={{ background: '#0a0a0a', borderRadius: 10, padding: '20px 24px', marginTop: 32, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ fontSize: 13, color: '#fff', fontWeight: 600 }}>By using AIFMI, you acknowledge that you have read and agreed to this disclaimer.</div>
          <button onClick={() => navigate('/')} style={{ fontSize: 12, fontWeight: 700, padding: '8px 18px', borderRadius: 6, background: '#fff', color: '#0a0a0a', border: 'none', cursor: 'pointer', whiteSpace: 'nowrap', marginLeft: 16 }}>I Understand →</button>
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
