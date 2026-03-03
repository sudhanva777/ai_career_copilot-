export default function PasswordStrength({ password = '' }) {
    // 0=empty, 1=weak (<6), 2=fair (<10), 3=strong (>=10)
    let strength = 0;
    if (password.length > 0) strength = 1;
    if (password.length >= 6) strength = 2;
    if (password.length >= 10) strength = 3;

    const labels = ['none', 'Weak', 'Fair', 'Strong'];
    const colors = [
        'transparent',
        'var(--coral)',
        'var(--gold)',
        'var(--green)'
    ];

    return (
        <div className="flex flex-col gap-8 w-full mt-4">
            <div className="flex gap-4 w-full h-[4px]">
                {[1, 2, 3].map((level) => (
                    <div
                        key={level}
                        className="flex-1 rounded-full transition-colors duration-300"
                        style={{
                            background: strength >= level ? colors[strength] : 'rgba(255,255,255,0.06)'
                        }}
                    />
                ))}
            </div>
            <div className="flex justify-end">
                <span
                    className="font-mono text-[11px] uppercase tracking-wider transition-colors duration-300"
                    style={{ color: strength > 0 ? colors[strength] : 'var(--text3)' }}
                >
                    {strength > 0 ? labels[strength] : 'Strength'}
                </span>
            </div>
        </div>
    );
}
