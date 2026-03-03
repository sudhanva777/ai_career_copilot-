import { useEffect, useState } from 'react';

export default function ProgressBar({ label, value = 0, color = 'var(--cyan)', showValue = true }) {
    const [width, setWidth] = useState(0);

    useEffect(() => {
        // Delay width to allow css transition on mount
        const timeout = setTimeout(() => {
            setWidth(Math.min(Math.max(value, 0), 100)); // Clamp 0-100
        }, 100);
        return () => clearTimeout(timeout);
    }, [value]);

    return (
        <div className="flex flex-col gap-2 w-full">
            <div className="flex items-center justify-between text-sm">
                <span className="font-body text-text">{label}</span>
                {showValue && (
                    <span className="font-mono text-xs font-medium" style={{ color: color }}>
                        {value}%
                    </span>
                )}
            </div>

            <div className="progress-bar w-full">
                <div
                    className="progress-fill absolute top-0 left-0"
                    style={{
                        width: `${width}%`,
                        background: `linear-gradient(90deg, ${color}40, ${color})`
                    }}
                />
            </div>
        </div>
    );
}
