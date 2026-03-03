// LoginPage.jsx — glassmorphism card over purple landscape
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import AuthNavbar from '../../components/layout/AuthNavbar';
import { useAuth } from '../../hooks/useAuth';
import { useNotify } from '../../hooks/useNotify';

export default function LoginPage() {
    const [form, setForm] = useState({ email: '', password: '' });
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    const navigate = useNavigate();
    const notify = useNotify();
    const { login } = useAuth();

    const handleLogin = async () => {
        if (!form.email || !form.password) { setError('Please fill in all fields.'); return; }
        setLoading(true); setError('');
        try {
            await login(form.email, form.password);
            notify('Welcome back!', 'success');
            navigate('/');
        } catch (e) {
            setError(e.message || 'Incorrect email or password.');
        } finally { setLoading(false); }
    };

    return (
        <div style={{
            minHeight: '100vh',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            position: 'relative', zIndex: 1,
        }}>
            <AuthNavbar onLoginClick={() => { }} />

            {/* Glass Modal Card */}
            <div className="auth-glass-card fade-up" style={{ width: '100%', maxWidth: 440 }}>

                {/* Header */}
                <h2 style={{
                    fontFamily: 'var(--font-display)', fontWeight: 700,
                    fontSize: 26, color: 'white', textAlign: 'center', marginBottom: 28,
                }}>
                    Sign In
                </h2>

                {/* Error */}
                {error && (
                    <div className="auth-error-banner">{error}</div>
                )}

                {/* Email input */}
                <div className="auth-input-group">
                    <input
                        className="auth-input"
                        type="email" placeholder="Email"
                        value={form.email}
                        onChange={e => setForm(f => ({ ...f, email: e.target.value }))}
                        onKeyDown={e => e.key === 'Enter' && handleLogin()}
                    />
                    <span className="auth-input-icon">✉</span>
                </div>

                {/* Password input */}
                <div className="auth-input-group">
                    <input
                        className="auth-input"
                        type="password" placeholder="Password"
                        value={form.password}
                        onChange={e => setForm(f => ({ ...f, password: e.target.value }))}
                        onKeyDown={e => e.key === 'Enter' && handleLogin()}
                    />
                    <span className="auth-input-icon">🔒</span>
                </div>

                {/* Submit */}
                <button
                    className="auth-btn-primary"
                    onClick={handleLogin}
                    disabled={loading}
                    style={{ marginTop: 8 }}
                >
                    {loading ? 'Signing in...' : 'Sign In'}
                </button>

                {/* Switch */}
                <p style={{
                    textAlign: 'center', marginTop: 16,
                    color: 'rgba(255,255,255,0.65)', fontSize: 13,
                }}>
                    Don't have an account?{' '}
                    <span
                        onClick={() => navigate('/register')}
                        style={{ color: '#c084fc', cursor: 'pointer', fontWeight: 500 }}
                    >
                        Register
                    </span>
                </p>
            </div>
        </div>
    );
}
