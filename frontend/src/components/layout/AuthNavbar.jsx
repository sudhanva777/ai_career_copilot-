export default function AuthNavbar({ onLoginClick }) {
    return (
        <nav style={{
            position: 'fixed', top: 0, left: 0, right: 0, zIndex: 100,
            display: 'flex', alignItems: 'center', padding: '20px 48px',
        }}>
            {/* Logo */}
            <div style={{
                fontFamily: 'var(--font-display)',
                fontWeight: 800, fontSize: 22,
                color: 'white', letterSpacing: 1,
                marginRight: 'auto',
            }}>
                Career<span style={{ color: '#c084fc' }}>Copilot</span>
            </div>

            {/* Nav Links */}
            {['Home', 'Services', 'Contact', 'About'].map(item => (
                <a key={item} href="#" style={{
                    color: 'rgba(255,255,255,0.85)', fontFamily: 'var(--font-body)',
                    fontSize: 15, textDecoration: 'none', marginLeft: 40,
                    transition: 'color 0.2s',
                }}
                    onMouseEnter={e => e.target.style.color = 'white'}
                    onMouseLeave={e => e.target.style.color = 'rgba(255,255,255,0.85)'}>
                    {item}
                </a>
            ))}

            {/* Login button */}
            <button onClick={onLoginClick} style={{
                marginLeft: 48,
                padding: '8px 28px',
                background: 'transparent',
                border: '1.5px solid rgba(255,255,255,0.7)',
                borderRadius: 100,
                color: 'white',
                fontFamily: 'var(--font-body)',
                fontSize: 14,
                cursor: 'pointer',
                transition: 'all 0.2s',
            }}
                onMouseEnter={e => {
                    e.target.style.background = 'rgba(255,255,255,0.1)';
                    e.target.style.borderColor = 'white';
                }}
                onMouseLeave={e => {
                    e.target.style.background = 'transparent';
                    e.target.style.borderColor = 'rgba(255,255,255,0.7)';
                }}>
                Login
            </button>
        </nav>
    );
}
