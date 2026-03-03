export default function Card({
    children,
    variant = 'default',
    padding = '24',
    className = ''
}) {
    const baseClass = variant === 'cyan' ? 'glass-card-cyan' : variant === 'flat' ? 'bg-bg1 rounded-2xl border border-border2' : 'glass-card';
    const padClass = `p-${padding}`;
    // For standard css usage if utility class doesn't exist
    const style = padding ? { padding: `${padding}px` } : {};

    return (
        <div className={`${baseClass} ${className}`} style={style}>
            {children}
        </div>
    );
}
