import { useState } from 'react';

export default function Disclaimer({ onAccept }) {
  const [checked, setChecked] = useState(false);
  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.85)', zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px', backdropFilter: 'blur(4px)' }}>
      <div style={{ background: '#07070f', border: '1px solid #1a1a2e', borderRadius: 12, maxWidth: 560, width: '100%', padding: '32px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 20 }}>
          <span style={{ fontFamily: 'Syne, sans-serif', fontWeight: 800, fontSize: 20, color: '#fff' }}>AI<span style={{ color: '#1A6FD8' }}>FMI</span></span>
          <div style={{ height: 20, width: 1, background: '#1a1a2e' }} />
          <span style={{ fontFamily: 'Space Mono, monospace', fontSize: 10, color: '#555', letterSpacing: 1 }}>IMPORTANT DISCLAIMER</span>
        </div>
        <div style={{ fontFamily: 'Syne, sans-serif', fontWeight: 700, fontSize: 16, color: '#fff', marginBottom: 16 }}>Please Read Before Continuing</div>
        <div style={{ fontFamily: 'Space Mono, monospace', fontSize: 11, color: '#888', lineHeight: 1.9, marginBottom: 24, maxHeight: 260, overflowY: 'auto', paddingRight: 8 }}>
          <p style={{ marginBottom: 12 }}><span style={{ color: '#DC3C3C' }}>AIFMI is not a financial advisor.</span> All content, data, AI-generated briefings, charts, metrics, analyst ratings, and information on this platform is for <span style={{ color: '#ccc' }}>informational and educational purposes only</span>. Nothing on this platform constitutes financial, investment, legal, or tax advice.</p>
          <p style={{ marginBottom: 12 }}>AI-generated intelligence briefings are produced by large language models and may contain inaccuracies, outdated information, or errors. They should not be relied upon as the sole basis for any investment decision.</p>
          <p style={{ marginBottom: 12 }}>Live stock prices, financial metrics, analyst ratings, and price targets are sourced from third-party data providers including Finnhub and Yahoo Finance. AIFMI does not guarantee the accuracy, completeness, or timeliness of this data.</p>
          <p style={{ marginBottom: 12 }}><span style={{ color: '#ccc' }}>Past performance does not guarantee future results.</span> Investing involves significant risk, including possible loss of principal. Always conduct your own research and consult a qualified financial professional before making investment decisions.</p>
          <p>By accessing AIFMI, you acknowledge that you have read and understood this disclaimer. AIFMI and its creator assume no liability for any financial losses or damages arising from use of this platform.</p>
        </div>
        <label style={{ display: 'flex', alignItems: 'flex-start', gap: 12, cursor: 'pointer', marginBottom: 24 }}>
          <input type="checkbox" checked={checked} onChange={e => setChecked(e.target.checked)} style={{ marginTop: 2, width: 16, height: 16, accentColor: '#1A6FD8', cursor: 'pointer', flexShrink: 0 }} />
          <span style={{ fontFamily: 'Space Mono, monospace', fontSize: 11, color: '#888', lineHeight: 1.7 }}>I have read and understood the disclaimer. I agree that AIFMI does not provide financial advice and I will not make investment decisions based solely on this platform.</span>
        </label>
        <button onClick={() => checked && onAccept()} style={{ width: '100%', padding: '12px', borderRadius: 8, background: checked ? '#1A6FD8' : '#0f0f1a', border: `1px solid ${checked ? '#1A6FD8' : '#1a1a2e'}`, color: checked ? '#fff' : '#333', fontFamily: 'Space Mono, monospace', fontSize: 11, letterSpacing: 1, cursor: checked ? 'pointer' : 'not-allowed', transition: 'all 0.2s' }}>
          {checked ? 'ENTER AIFMI →' : 'PLEASE CHECK THE BOX TO CONTINUE'}
        </button>
      </div>
    </div>
  );
}
