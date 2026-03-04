import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import Icon from '../ui/Icon';

const NAV_ITEMS = [
    { label: 'Dashboard', path: '/' },
    { label: 'Resumes', path: '/resumes' },
    { label: 'Analysis', path: '/analysis' },
    { label: 'History', path: '/history' },
    { label: 'Job Match', path: '/jobs' },
    { label: 'Interview', path: '/interview' },
];

export default function TopNavbar() {
    const navigate = useNavigate();
    const { pathname } = useLocation();
    const { user, logout } = useAuth();

    return (
        <header style={{
            position: 'sticky', top: 0, zIndex: 100,
            background: '#0a0a0a',
            borderBottom: '1px solid rgba(255,255,255,0.06)',
            padding: '0 40px',
            height: 68,
            display: 'flex', alignItems: 'center', gap: 0,
        }}>
            {/* Logo */}
            <div
                onClick={() => navigate('/')}
                style={{
                    fontFamily: 'var(--font-display)',
                    fontWeight: 800, fontSize: 20, color: 'white',
                    cursor: 'pointer', marginRight: 56, letterSpacing: 0.5,
                    flexShrink: 0,
                }}
            >
                Career<span style={{ color: '#9333ea' }}>Copilot</span>
            </div>

            {/* Nav Links */}
            <nav style={{ display: 'flex', alignItems: 'center', gap: 4, flex: 1 }}>
                {NAV_ITEMS.map(item => {
                    const isActive = item.path === '/'
                        ? pathname === '/'
                        : pathname.startsWith(item.path);
                    return (
                        <button
                            key={item.path}
                            onClick={() => navigate(item.path)}
                            style={{
                                padding: '8px 18px',
                                background: 'transparent',
                                border: 'none',
                                borderRadius: 8,
                                color: isActive ? 'white' : 'var(--text3)',
                                fontFamily: 'var(--font-body)',
                                fontSize: 14,
                                fontWeight: isActive ? 500 : 400,
                                cursor: 'pointer',
                                position: 'relative',
                                transition: 'color 0.2s',
                            }}
                            onMouseEnter={e => { if (!isActive) e.currentTarget.style.color = 'var(--text2)'; }}
                            onMouseLeave={e => { if (!isActive) e.currentTarget.style.color = 'var(--text3)'; }}
                        >
                            {item.label}
                            {/* Active underline dot */}
                            {isActive && (
                                <span style={{
                                    position: 'absolute', bottom: 4, left: '50%',
                                    transform: 'translateX(-50%)',
                                    width: 4, height: 4, borderRadius: '50%',
                                    background: '#9333ea',
                                }} />
                            )}
                        </button>
                    );
                })}
            </nav>

            {/* Right section */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                {/* Icon buttons */}
                {[
                    { icon: 'shield', label: 'Settings' },
                    { icon: 'eye', label: 'Messages' },
                    { icon: 'info', label: 'Notifications' },
                ].map(btn => (
                    <button key={btn.icon} title={btn.label} style={{
                        width: 40, height: 40,
                        background: 'var(--bg2)',
                        border: '1px solid var(--border)',
                        borderRadius: 10,
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        cursor: 'pointer', color: 'var(--text2)',
                        transition: 'all 0.2s',
                    }}
                        onMouseEnter={e => {
                            e.currentTarget.style.background = 'var(--bg3)';
                            e.currentTarget.style.color = 'white';
                        }}
                        onMouseLeave={e => {
                            e.currentTarget.style.background = 'var(--bg2)';
                            e.currentTarget.style.color = 'var(--text2)';
                        }}>
                        <Icon name={btn.icon} size={16} />
                    </button>
                ))}

                {/* Divider */}
                <div style={{
                    width: 1, height: 28,
                    background: 'rgba(255,255,255,0.08)',
                    margin: '0 8px',
                }} />

                {/* User info + logout */}
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <div style={{
                        width: 36, height: 36, borderRadius: '50%',
                        background: 'linear-gradient(135deg, #9333ea, #7c3aed)',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        fontWeight: 700, fontSize: 14, color: 'white',
                        flexShrink: 0,
                    }}>
                        {user?.name?.[0]?.toUpperCase() || 'U'}
                    </div>
                    <span style={{
                        fontFamily: 'var(--font-body)',
                        fontSize: 14, fontWeight: 500, color: 'white',
                    }}>
                        {user?.name || 'User'}
                    </span>
                    <button onClick={logout} title="Logout" style={{
                        width: 34, height: 34,
                        background: 'var(--bg2)',
                        border: '1px solid var(--border)',
                        borderRadius: 8,
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        cursor: 'pointer', color: 'var(--text3)',
                        transition: 'all 0.2s',
                    }}
                        onMouseEnter={e => {
                            e.currentTarget.style.background = 'rgba(239,68,68,0.1)';
                            e.currentTarget.style.color = '#ef4444';
                        }}
                        onMouseLeave={e => {
                            e.currentTarget.style.background = 'var(--bg2)';
                            e.currentTarget.style.color = 'var(--text3)';
                        }}>
                        <Icon name="logout" size={15} />
                    </button>
                </div>
            </div>
        </header>
    );
}
