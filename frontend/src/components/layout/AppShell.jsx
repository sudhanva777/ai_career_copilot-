// AppShell.jsx — Top navbar layout (no sidebar)
import TopNavbar from './TopNavbar';

export default function AppShell({ children }) {
    return (
        <div style={{
            minHeight: '100vh',
            background: 'var(--bg)',
            display: 'flex',
            flexDirection: 'column',
        }}>
            <TopNavbar />
            <main style={{
                flex: 1,
                padding: '28px 40px',
                maxWidth: 1400,
                width: '100%',
                margin: '0 auto',
                boxSizing: 'border-box',
            }}>
                {children}
            </main>
        </div>
    );
}
