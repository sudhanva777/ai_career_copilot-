import { useLocation } from 'react-router-dom';

export default function Background() {
    const { pathname } = useLocation();
    const isAuth = pathname === '/login' || pathname === '/register';
    if (!isAuth) return null;

    return (
        <div style={{
            position: 'fixed', inset: 0, zIndex: 0, pointerEvents: 'none',
            overflow: 'hidden',
        }}>
            {/* SVG Landscape Scene — full sky + mountains + foliage */}
            <svg
                viewBox="0 0 1440 600"
                preserveAspectRatio="xMidYMid slice"
                style={{ width: '100%', height: '100%', position: 'absolute', inset: 0 }}
                xmlns="http://www.w3.org/2000/svg"
            >
                <defs>
                    {/* Sky gradient */}
                    <linearGradient id="sky" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#1a0533" />
                        <stop offset="30%" stopColor="#2d1b69" />
                        <stop offset="65%" stopColor="#6b21a8" />
                        <stop offset="85%" stopColor="#9333ea" stopOpacity="0.7" />
                        <stop offset="100%" stopColor="#c084fc" stopOpacity="0.5" />
                    </linearGradient>
                    {/* Moon glow */}
                    <radialGradient id="moonGlow" cx="50%" cy="50%" r="50%">
                        <stop offset="0%" stopColor="#fef9c3" stopOpacity="0.9" />
                        <stop offset="40%" stopColor="#fde68a" stopOpacity="0.5" />
                        <stop offset="100%" stopColor="#f9a8d4" stopOpacity="0" />
                    </radialGradient>
                </defs>

                {/* Sky */}
                <rect width="1440" height="600" fill="url(#sky)" />

                {/* Moon glow halo */}
                <ellipse cx="720" cy="200" rx="180" ry="180" fill="url(#moonGlow)" />

                {/* Moon circle */}
                <circle cx="720" cy="210" r="72" fill="#fef9c3" opacity="0.92" />
                <circle cx="720" cy="210" r="68" fill="#fef08a" opacity="0.7" />

                {/* Far mountains — lightest purple */}
                <path d="M0,380 L120,240 L260,310 L380,200 L520,280 L640,190 L760,260 L880,180
                 L1020,260 L1140,200 L1280,280 L1440,220 L1440,600 L0,600 Z"
                    fill="#4c1d95" opacity="0.6" />

                {/* Mid mountains */}
                <path d="M0,430 L80,320 L200,390 L340,280 L480,360 L600,260 L720,340
                 L840,250 L980,330 L1100,270 L1240,350 L1360,300 L1440,340
                 L1440,600 L0,600 Z"
                    fill="#2e1065" opacity="0.85" />

                {/* Near mountains — darkest */}
                <path d="M0,490 L60,400 L160,460 L280,370 L400,440 L520,360 L640,430
                 L760,350 L880,420 L1000,370 L1120,440 L1240,390 L1360,450
                 L1440,400 L1440,600 L0,600 Z"
                    fill="#1a0040" />

                {/* Water/ground reflection */}
                <rect x="0" y="520" width="1440" height="80"
                    fill="#0f0020" opacity="0.8" />
                <rect x="0" y="540" width="1440" height="60"
                    fill="#1a0040" opacity="0.5" />

                {/* Foreground foliage — left cluster */}
                <ellipse cx="80" cy="580" rx="90" ry="120" fill="#0f0020" />
                <ellipse cx="0" cy="560" rx="80" ry="100" fill="#12002e" />
                <ellipse cx="160" cy="590" rx="70" ry="100" fill="#0a001e" />

                {/* Foreground foliage — right cluster */}
                <ellipse cx="1360" cy="580" rx="90" ry="120" fill="#0f0020" />
                <ellipse cx="1440" cy="560" rx="80" ry="100" fill="#12002e" />
                <ellipse cx="1280" cy="590" rx="70" ry="100" fill="#0a001e" />

                {/* Mid foliage */}
                <ellipse cx="300" cy="595" rx="50" ry="70" fill="#12002e" />
                <ellipse cx="1140" cy="595" rx="50" ry="70" fill="#12002e" />

                {/* Stars */}
                {[
                    [100, 60], [200, 40], [350, 80], [500, 30], [650, 55], [800, 25], [950, 70],
                    [1100, 45], [1250, 65], [1380, 35], [150, 120], [450, 100], [900, 110], [1300, 90],
                    [50, 150], [600, 130], [1050, 140]
                ].map(([x, y], i) => (
                    <circle key={i} cx={x} cy={y} r={Math.random() * 1.5 + 0.5}
                        fill="white" opacity={0.4 + Math.random() * 0.5} />
                ))}
            </svg>
        </div>
    );
}
