export default function Spinner({ size = 20, className = '' }) {
    return (
        <svg className={`spinner ${className}`} width={size} height={size} viewBox="0 0 24 24" fill="none">
            <circle cx="12" cy="12" r="10" stroke="rgba(0,229,255,0.2)" strokeWidth="2" />
            <path d="M12 2a10 10 0 0110 10" stroke="var(--cyan)" strokeWidth="2" strokeLinecap="round" />
        </svg>
    );
}
