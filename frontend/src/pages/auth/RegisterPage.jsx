// RegisterPage.jsx
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import AuthNavbar from '../../components/layout/AuthNavbar';
import PasswordStrength from '../../components/common/PasswordStrength';
import { useAuth } from '../../hooks/useAuth';
import { useNotify } from '../../hooks/useNotify';

export default function RegisterPage() {
    const [form, setForm] = useState({ name: '', email: '', password: '' });
    const [agreed, setAgreed] = useState(false);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    const navigate = useNavigate();
    const notify = useNotify();
    const { register } = useAuth();

    const handleRegister = async () => {
        if (!form.name || !form.email || !form.password) { setError('All fields are required.'); return; }
        if (form.password.length < 8) { setError('Password must be at least 8 characters long.'); return; }

        setLoading(true); setError('');
        try {
            await register(form.name, form.email, form.password);
            notify('Registration successful!', 'success');
            navigate('/');
        } catch (e) {
            setError(e.message || 'Registration failed.');
        } finally { setLoading(false); }
    };

    return (
        <div style={{
            minHeight: '100vh',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            position: 'relative', zIndex: 1,
        }}>
            <AuthNavbar onLoginClick={() => navigate('/login')} />

            <div className="auth-glass-card fade-up" style={{ width: '100%', maxWidth: 440 }}>

                {/* Close button — top right of card */}
                <button
                    onClick={() => navigate('/login')}
                    style={{
                        position: 'absolute', top: 16, right: 16,
                        width: 32, height: 32, borderRadius: '50%',
                        background: 'rgba(255,255,255,0.15)',
                        border: '1px solid rgba(255,255,255,0.3)',
                        color: 'white', fontSize: 16, cursor: 'pointer',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                    }}
                >×</button>

                <h2 style={{
                    fontFamily: 'var(--font-display)', fontWeight: 700,
                    fontSize: 26, color: 'white', textAlign: 'center', marginBottom: 24,
                }}>
                    Registration
                </h2>

                {error && <div className="auth-error-banner">{error}</div>}

                <div className="auth-input-group">
                    <input className="auth-input" type="text" placeholder="Name"
                        value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} />
                    <span className="auth-input-icon">👤</span>
                </div>

                <div className="auth-input-group">
                    <input className="auth-input" type="email" placeholder="Email"
                        value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))} />
                    <span className="auth-input-icon">✉</span>
                </div>

                <div className="auth-input-group mb-4">
                    <input className="auth-input" type="password" placeholder="Password"
                        value={form.password} onChange={e => setForm(f => ({ ...f, password: e.target.value }))} />
                    <span className="auth-input-icon">🔒</span>
                </div>

                <PasswordStrength password={form.password} />

                {/* Terms checkbox */}
                <label style={{
                    display: 'flex', alignItems: 'center', gap: 8,
                    color: 'rgba(255,255,255,0.65)', fontSize: 13, margin: '12px 0',
                }}>
                    <input type="checkbox" checked={agreed}
                        onChange={e => setAgreed(e.target.checked)}
                        style={{ accentColor: '#9333ea' }} />
                    I agree to the terms &amp; conditions
                </label>

                <button
                    className="auth-btn-primary"
                    onClick={handleRegister}
                    disabled={loading || !agreed}
                >
                    {loading ? 'Creating account...' : 'Register'}
                </button>

                <p style={{
                    textAlign: 'center', marginTop: 16,
                    color: 'rgba(255,255,255,0.65)', fontSize: 13,
                }}>
                    Already have account?{' '}
                    <span onClick={() => navigate('/login')}
                        style={{ color: '#c084fc', cursor: 'pointer', fontWeight: 500 }}>
                        Login
                    </span>
                </p>
            </div>
        </div>
    );
}
