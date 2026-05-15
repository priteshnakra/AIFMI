import { useState } from 'react';

export default function Disclaimer({ onAccept }) {
  const [checked, setChecked] = useState(false);

  return (
    <div style={{ minHeight: '100vh', background: '#f1f5f9', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20, fontFamily: "-apple-system, BlinkMacSystemFont, 'SF Pro Display', 'Helvetica Neue', sans-serif" }}>
      <div style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: 16, maxWidth: 560, width: '100%', overflow: 'hidden', boxShadow: '0 4px 24px rgba(0,0,0,0.06)' }}>

        {/* Header */}
        <div style={{ padding: '24px 28px 20px', borderBottom: '1px solid #e2e8f0', background: '#f8fafc' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 4 }}>
            <span style={{ fontSize: 20, fontWeight: 800, color: '#0f172a', letterSpacing: -0.8 }}>AI<span style={{ color: '#1d4ed8' }}>FMI</span></span>
            <div style={{ height: 18, width: 1, background: '#e2e8f0' }} />
            <span style={{ fontSize: 11, fontWeight: 700, color: '#dc2626', letterSpacing: 0.5, textTransform: 'uppercase' }}>Important Disclaimer</span>
          </div>
          <div style={{ fontSize: 15, fontWeight: 700, color: '#0f172a' }}>Please read before continuing</div>
        </div>

        {/* Body */}
        <div style={{ padding: '20px 28px' }}>
          <div style={{ fontSize: 12, color: '#475569', lineHeight: 1.8, maxHeight: 260, overflowY: 'auto', marginBottom: 20, paddingRight: 4 }}>
            <p style={{ marginBottom: 12 }}><span style={{ color: '#dc2626', fontWeight: 700 }}>AIFMI is not a financial advisor.</span> All content, data, AI-generated briefings, charts, metrics, and information on this platform is for <span style={{ fontWeight: 600, color: '#0f172a' }}>informational and educational purposes only</span>. Nothing on this platform constitutes financial, investment, legal, or tax advice.</p>
            <p style={{ marginBottom: 12 }}>AI-generated intelligence briefings and investor scorecards are produced by large language models and may contain inaccuracies, outdated information, or errors. They should not be relied upon as the sole basis for any investment decision.</p>
            <p style={{ marginBottom: 12 }}>Live stock prices, financial metrics, analyst ratings, and price targets are sourced from third-party data providers including Finnhub. AIFMI does not guarantee the accuracy, completeness, or timeliness of this data.</p>
            <p style={{ marginBottom: 12 }}><span style={{ fontWeight: 600, color: '#0f172a' }}>Past performance does not guarantee future results.</span> Investing involves significant risk, including possible loss of principal. Always conduct your own research and consult a qualified financial professional before making investment decisions.</p>
            <p>By accessing AIFMI, you acknowledge that you have read and understood this disclaimer. AIFMI and its creator assume no liability for any financial losses or damages arising from use of this platform.</p>
          </div>

          {/* Checkbox */}
          <label style={{ display: 'flex', alignItems: 'flex-start', gap: 12, cursor: 'pointer', marginBottom: 20, padding: '14px 16px', background: '#f8fafc', borderRadius: 10, border: '1px solid #e2e8f0' }}>
            <input
              type="checkbox"
              checked={checked}
              onChange={e => setChecked(e.target.checked)}
              style={{ marginTop: 2, width: 16, height: 16, accentColor: '#1d4ed8', cursor: 'pointer', flexShrink: 0 }}
            />
            <span style={{ fontSize: 12, color: '#334155', lineHeight: 1.6, fontWeight: 500 }}>
              I have read and understood the disclaimer. I agree that AIFMI does not provide financial advice and I will not make investment decisions based solely on this platform.
            </span>
          </label>

          {/* Button */}
          <button
            onClick={() => checked && onAccept()}
            style={{
              width: '100%', padding: '13px', borderRadius: 10,
              background: checked ? '#1d4ed8' : '#f1f5f9',
              border: `1px solid ${checked ? '#1d4ed8' : '#e2e8f0'}`,
              color: checked ? '#fff' : '#94a3b8',
              fontSize: 13, fontWeight: 700, letterSpacing: 0.3,
              cursor: checked ? 'pointer' : 'not-allowed',
              transition: 'all 0.2s',
              fontFamily: 'inherit',
            }}
          >
            {checked ? 'Enter AIFMI →' : 'Please check the box to continue'}
          </button>
        </div>
      </div>
    </div>
  );
}
