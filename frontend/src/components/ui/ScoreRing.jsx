import { useEffect, useState } from 'react';

export default function ScoreRing({ score = 0, size = 160, animate = true }) {
    const [offset, setOffset] = useState(339.3); // Initial circumference
    const r = 54;
    const circumference = 2 * Math.PI * r; // ~339.3

    let color = 'var(--coral)';
    if (score >= 75) color = 'var(--green)';
    else if (score >= 50) color = 'var(--gold)';

    useEffect(() => {
        if (animate) {
            // Small delay to ensure CSS animation can trigger if needed or JS handles it
            const timeout = setTimeout(() => {
                const targetOffset = circumference * (1 - score / 100);
                setOffset(targetOffset);
            }, 100);
            return () => clearTimeout(timeout);
        } else {
            setOffset(circumference * (1 - score / 100));
        }
    }, [score, animate, circumference]);

    return (
        <div className="relative flex items-center justify-center flex-col" style={{ width: size, height: size }}>
            {/* SVG Ring rotated -90deg */}
            <svg
                width={size}
                height={size}
                viewBox="0 0 120 120"
                className="absolute inset-0"
                style={{ transform: 'rotate(-90deg)' }}
            >
                <defs>
                    <filter id={`glow-${score}`}>
                        <feGaussianBlur stdDeviation="3" result="coloredBlur" />
                        <feMerge>
                            <feMergeNode in="coloredBlur" />
                            <feMergeNode in="SourceGraphic" />
                        </feMerge>
                    </filter>
                </defs>

                {/* Background Track */}
                <circle
                    cx="60" cy="60" r={r}
                    fill="none"
                    stroke="rgba(255,255,255,0.06)"
                    strokeWidth="8"
                />

                {/* Animated Score Ring */}
                <circle
                    cx="60" cy="60" r={r}
                    fill="none"
                    stroke={color}
                    strokeWidth="8"
                    strokeLinecap="round"
                    strokeDasharray={circumference}
                    strokeDashoffset={offset}
                    filter={`url(#glow-${score})`}
                    style={{ transition: 'stroke-dashoffset 1.5s cubic-bezier(0.4, 0, 0.2, 1)' }}
                />
            </svg>

            {/* Center Content */}
            <div className="flex flex-col items-center justify-center z-10">
                <span className="font-mono font-medium text-4xl" style={{ color }}>{score}</span>
                <span className="font-body text-text3 text-xs uppercase tracking-wider mt-1">ATS Score</span>
            </div>
        </div>
    );
}
