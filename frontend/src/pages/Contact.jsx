import { useState } from 'react';
import { useNavigate } from 'react-router-dom';

export default function Contact() {
  const navigate = useNavigate();
  const [form, setForm] = useState({ name: '', email: '', subject: '', message: '' });
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = () => {
    if (!form.name || !form.email || !form.message) return;
    const mailto = `mailto:contact@aifmi.com?subject=${encodeURIComponent(form.subject || 'AIFMI Inquiry')}&body=${encodeURIComponent(`Name: ${form.name}\nEmail: ${form.email}\n\n${form.message}`)}`;
    window.location.href = mailto;
    setSubmitted(true);
  };

  return (
    <div style={{ minHeight: '100vh', background: '#f5f5f5', fontFamily: "-apple-system, BlinkMacSystemFont, 'Helvetica Neue', sans-serif" }}>
      {/* NAV */}
      <div style={{ background: '#fff', borderBottom: '1px solid #e8e8e8', padding: '0 48px', height: 56, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <span onClick={() => navigate('/')} style={{ fontSize: 18, fontWeight: 800, color: '#0a0a0a', letterSpacing: -0.8, cursor: 'pointer' }}>AI<span style={{ color: '#1A6FD8' }}>FMI</span></span>
        <button onClick={() => navigate('/')} style={{ fontSize: 12, fontWeight: 600, padding: '6px 14px', borderRadius: 6, border: '1px solid #e0e0e0', background: '#fff', color: '#0a0a0a', cursor: 'pointer' }}>← Dashboard</button>
      </div>

      <div style={{ maxWidth: 640, margin: '0 auto', padding: '64px 48px' }}>
        <div style={{ fontSize: 11, fontWeight: 700, color: '#1A6FD8', letterSpacing: 2, textTransform: 'uppercase', marginBottom: 16 }}>Contact</div>
        <h1 style={{ fontSize: 36, fontWeight: 800, color: '#0a0a0a', letterSpacing: -1, lineHeight: 1.1, marginBottom: 12 }}>Get in Touch</h1>
        <p style={{ fontSize: 15, color: '#0a0a0a', lineHeight: 1.7, marginBottom: 48 }}>Have a question, suggestion, or want to discuss AIFMI? Reach out directly.</p>

        {submitted ? (
          <div style={{ background: '#fff', borderRadius: 12, padding: '40px', border: '1px solid #e8e8e8', textAlign: 'center' }}>
            <div style={{ fontSize: 32, marginBottom: 16 }}>✓</div>
            <div style={{ fontSize: 18, fontWeight: 700, color: '#0a0a0a', marginBottom: 8 }}>Message prepared</div>
            <div style={{ fontSize: 13, color: '#0a0a0a', marginBottom: 24 }}>Your email client should have opened. If not, email us directly at contact@aifmi.com</div>
            <button onClick={() => navigate('/')} style={{ fontSize: 13, fontWeight: 700, padding: '10px 20px', borderRadius: 7, background: '#0a0a0a', color: '#fff', border: 'none', cursor: 'pointer' }}>Back to Dashboard</button>
          </div>
        ) : (
          <div style={{ background: '#fff', borderRadius: 12, padding: '32px', border: '1px solid #e8e8e8', display: 'flex', flexDirection: 'column', gap: 16 }}>
            {[
              { key: 'name', label: 'Your Name', placeholder: 'John Smith', type: 'text' },
              { key: 'email', label: 'Email Address', placeholder: 'john@example.com', type: 'email' },
              { key: 'subject', label: 'Subject', placeholder: 'Question about AIFMI...', type: 'text' },
            ].map(({ key, label, placeholder, type }) => (
              <div key={key}>
                <label style={{ display: 'block', fontSize: 11, fontWeight: 700, color: '#0a0a0a', letterSpacing: 0.5, textTransform: 'uppercase', marginBottom: 8 }}>{label}</label>
                <input
                  type={type}
                  placeholder={placeholder}
                  value={form[key]}
                  onChange={e => setForm(f => ({ ...f, [key]: e.target.value }))}
                  style={{ width: '100%', padding: '10px 14px', borderRadius: 7, border: '1px solid #e0e0e0', fontSize: 13, color: '#0a0a0a', outline: 'none', fontFamily: 'inherit', background: '#fff' }}
                />
              </div>
            ))}
            <div>
              <label style={{ display: 'block', fontSize: 11, fontWeight: 700, color: '#0a0a0a', letterSpacing: 0.5, textTransform: 'uppercase', marginBottom: 8 }}>Message</label>
              <textarea
                placeholder="Tell us what's on your mind..."
                value={form.message}
                onChange={e => setForm(f => ({ ...f, message: e.target.value }))}
                rows={5}
                style={{ width: '100%', padding: '10px 14px', borderRadius: 7, border: '1px solid #e0e0e0', fontSize: 13, color: '#0a0a0a', outline: 'none', fontFamily: 'inherit', resize: 'vertical', background: '#fff' }}
              />
            </div>
            <button
              onClick={handleSubmit}
              style={{ padding: '12px', borderRadius: 8, background: '#0a0a0a', color: '#fff', border: 'none', fontSize: 13, fontWeight: 700, cursor: 'pointer', letterSpacing: 0.3 }}
            >Send Message →</button>
          </div>
        )}

        <div style={{ marginTop: 32, display: 'flex', gap: 24 }}>
          <div style={{ background: '#fff', borderRadius: 10, padding: '18px 22px', border: '1px solid #e8e8e8', flex: 1 }}>
            <div style={{ fontSize: 11, fontWeight: 700, color: '#0a0a0a', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 6 }}>Email</div>
            <div style={{ fontSize: 13, color: '#1A6FD8', fontWeight: 500 }}>contact@aifmi.com</div>
          </div>
          <div style={{ background: '#fff', borderRadius: 10, padding: '18px 22px', border: '1px solid #e8e8e8', flex: 1 }}>
            <div style={{ fontSize: 11, fontWeight: 700, color: '#0a0a0a', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 6 }}>Built by</div>
            <div style={{ fontSize: 13, color: '#0a0a0a', fontWeight: 500 }}>Pritesh Nakra · Syracuse University</div>
          </div>
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
