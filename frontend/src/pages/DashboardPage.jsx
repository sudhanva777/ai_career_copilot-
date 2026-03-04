import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useNotify } from '../hooks/useNotify';
import { useAuth } from '../hooks/useAuth';
import { getDashboardSummary } from '../api/dashboard';
import Icon from '../components/ui/Icon';
import OnboardingWizard, { useOnboarding } from '../components/common/OnboardingWizard';

// ── Career Health Gauge ───────────────────────────────────────────
function HealthGauge({ score, label }) {
    const radius = 52;
    const circumference = 2 * Math.PI * radius;
    const dashoffset = circumference * (1 - score / 100);
    const color = score >= 80 ? 'var(--green)'
        : score >= 65 ? '#22d3ee'
        : score >= 45 ? 'var(--gold)'
        : 'var(--red)';

    return (
        <div style={{ position: 'relative', width: 136, height: 136, flexShrink: 0 }}>
            <svg width={136} height={136} style={{ transform: 'rotate(-90deg)' }}>
                <circle cx={68} cy={68} r={radius} fill="none"
                    stroke="rgba(255,255,255,0.06)" strokeWidth={9} />
                <circle cx={68} cy={68} r={radius} fill="none"
                    stroke={color}
                    strokeWidth={9}
                    strokeDasharray={circumference}
                    strokeDashoffset={dashoffset}
                    strokeLinecap="round"
                    style={{ transition: 'stroke-dashoffset 1.2s cubic-bezier(0.4,0,0.2,1)' }}
                />
            </svg>
            <div style={{
                position: 'absolute', inset: 0,
                display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
            }}>
                <span style={{ fontFamily: 'var(--font-mono)', fontSize: 30, fontWeight: 700, color, lineHeight: 1 }}>
                    {score}
                </span>
                <span style={{ fontSize: 10, color: 'var(--text3)', marginTop: 4, fontFamily: 'var(--font-mono)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                    {label}
                </span>
            </div>
        </div>
    );
}

// ── Activity type config ──────────────────────────────────────────
const ACTIVITY_CONFIG = {
    resume: { icon: 'file', color: '#a855f7', label: 'Resume Uploaded' },
    job_match: { icon: 'target', color: '#3b82f6', label: 'Job Matched' },
    interview: { icon: 'mic', color: '#22d3ee', label: 'Interview' },
};

// ── Priority config ───────────────────────────────────────────────
const PRIORITY_CONFIG = {
    high: { color: '#ef4444', dot: 'var(--red)' },
    medium: { color: '#f59e0b', dot: 'var(--gold)' },
    low: { color: '#3b82f6', dot: '#3b82f6' },
};

export default function DashboardPage() {
    const [summary, setSummary] = useState(null);
    const [loading, setLoading] = useState(true);
    const navigate = useNavigate();
    const notify = useNotify();
    const { user } = useAuth();

    useEffect(() => {
        getDashboardSummary()
            .then(setSummary)
            .catch(err => notify(err.message || 'Failed to load dashboard', 'error'))
            .finally(() => setLoading(false));
    }, [notify]);

    const userName = user?.name || 'User';
    const s = summary || {};
    // Pass 1 during loading so wizard doesn't flash before data arrives
    const { show: showOnboarding, dismiss: dismissOnboarding } = useOnboarding(loading ? 1 : (s.total_resumes ?? 0));

    if (loading) {
        return (
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', color: 'var(--text3)' }}>
                Loading dashboard...
            </div>
        );
    }
    const careerHealth = s.career_health ?? 0;
    const healthLabel = s.career_health_label ?? 'No Data';
    const atsScore = s.ats_score;
    const interviewAvg = s.interview_avg;
    const bestMatch = s.best_match_score;

    const statCards = [
        { label: 'Resumes Uploaded', sub: 'Total Documents', icon: 'file', value: s.total_resumes ?? 0, color: '#3b82f6' },
        { label: 'Skills Detected', sub: 'Unique Keywords', icon: 'zap', value: s.skills_detected ?? 0, color: '#22c55e' },
        { label: 'Skill Gaps', sub: 'Missing Requirements', icon: 'info', value: s.gaps_count ?? 0, color: '#f59e0b' },
        { label: 'Job Matches', sub: 'Sessions Run', icon: 'target', value: s.total_matches ?? 0, color: '#9333ea' },
    ];

    const subStats = [
        { label: 'ATS Score', value: atsScore != null ? `${Math.round(atsScore)}` : '—', unit: '/100', color: atsScore >= 75 ? 'var(--green)' : atsScore >= 50 ? 'var(--gold)' : 'var(--red)' },
        { label: 'Interview Avg', value: interviewAvg != null ? `${interviewAvg}` : '—', unit: '/10', color: interviewAvg >= 7 ? 'var(--green)' : interviewAvg >= 5 ? 'var(--gold)' : 'var(--red)' },
        { label: 'Best Job Match', value: bestMatch != null ? `${Math.round(bestMatch)}` : '—', unit: '%', color: bestMatch >= 70 ? 'var(--green)' : bestMatch >= 45 ? 'var(--gold)' : 'var(--red)' },
    ];

    return (
        <>
        {showOnboarding && (
            <OnboardingWizard
                userName={userName}
                onDismiss={dismissOnboarding}
            />
        )}
        <div className="fade-up">

            {/* ── Hero Card ── */}
            <div style={{
                background: 'var(--bg2)',
                border: '1px solid var(--border)',
                borderRadius: 16,
                padding: '28px 32px',
                marginBottom: 20,
                display: 'flex', alignItems: 'center', gap: 32,
            }}>
                {/* Health Gauge */}
                <HealthGauge score={careerHealth} label={healthLabel} />

                {/* Name + sub-stats + actions */}
                <div style={{ flex: 1 }}>
                    <p style={{ color: 'var(--text3)', fontSize: 12, marginBottom: 4 }}>Career Profile</p>
                    <h2 style={{ fontFamily: 'var(--font-display)', fontSize: 22, fontWeight: 700, color: 'white', marginBottom: 16 }}>
                        {userName}
                    </h2>

                    {/* Sub-stats row */}
                    <div style={{ display: 'flex', gap: 24, marginBottom: 20 }}>
                        {subStats.map(stat => (
                            <div key={stat.label} style={{
                                padding: '10px 16px',
                                background: 'rgba(255,255,255,0.03)',
                                border: '1px solid var(--border2)',
                                borderRadius: 10,
                                minWidth: 90,
                            }}>
                                <p style={{ fontSize: 10, color: 'var(--text3)', marginBottom: 4, fontFamily: 'var(--font-mono)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                                    {stat.label}
                                </p>
                                <div style={{ fontFamily: 'var(--font-mono)', fontSize: 20, fontWeight: 700, color: stat.value === '—' ? 'var(--text3)' : stat.color }}>
                                    {stat.value}
                                    {stat.value !== '—' && (
                                        <span style={{ fontSize: 12, opacity: 0.6, marginLeft: 2 }}>{stat.unit}</span>
                                    )}
                                </div>
                            </div>
                        ))}
                    </div>

                    {/* Action buttons */}
                    <div style={{ display: 'flex', gap: 10 }}>
                        <button className="dash-btn-purple" onClick={() => navigate('/upload')}>
                            Upload Resume
                        </button>
                        <button className="dash-btn-ghost" onClick={() => navigate('/analysis')}>
                            View Analysis
                        </button>
                        <button className="dash-btn-ghost" onClick={() => navigate('/jobs')}>
                            Match a Job
                        </button>
                        <button className="dash-btn-ghost" onClick={() => navigate('/interview')}>
                            Practice Interview
                        </button>
                    </div>
                </div>
            </div>

            {/* ── Stat Cards ── */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 16, marginBottom: 20 }}>
                {statCards.map(card => (
                    <div key={card.label} style={{
                        background: 'var(--bg2)',
                        border: '1px solid var(--border)',
                        borderRadius: 14,
                        padding: '20px 22px',
                        cursor: 'pointer',
                        transition: 'border-color 0.2s, transform 0.2s',
                    }}
                        onMouseEnter={e => {
                            e.currentTarget.style.borderColor = 'rgba(147,51,234,0.3)';
                            e.currentTarget.style.transform = 'translateY(-2px)';
                        }}
                        onMouseLeave={e => {
                            e.currentTarget.style.borderColor = 'rgba(255,255,255,0.06)';
                            e.currentTarget.style.transform = 'translateY(0)';
                        }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 16 }}>
                            <div>
                                <p style={{ color: 'var(--text3)', fontSize: 12, marginBottom: 4 }}>{card.label}</p>
                                <p style={{ fontSize: 11, color: 'var(--text3)' }}>{card.sub}</p>
                            </div>
                            <div style={{
                                width: 36, height: 36, borderRadius: 8,
                                background: `${card.color}18`,
                                display: 'flex', alignItems: 'center', justifyContent: 'center',
                            }}>
                                <Icon name={card.icon} size={18} color={card.color} />
                            </div>
                        </div>
                        <div style={{ fontFamily: 'var(--font-mono)', fontSize: 26, fontWeight: 600, color: card.color }}>
                            {card.value}
                        </div>
                    </div>
                ))}
            </div>

            {/* ── Bottom Row: Activity Feed + Next Steps ── */}
            <div style={{ display: 'grid', gridTemplateColumns: '1.4fr 1fr', gap: 20 }}>

                {/* Activity Feed */}
                <div style={{
                    background: 'var(--bg2)',
                    border: '1px solid var(--border)',
                    borderRadius: 14, padding: '24px',
                }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
                        <span style={{ fontWeight: 600, color: 'white', fontSize: 15 }}>Recent Activity</span>
                        <span style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--text3)' }}>
                            All modules
                        </span>
                    </div>

                    {s.recent_activity && s.recent_activity.length > 0 ? (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                            {s.recent_activity.map((item, i) => {
                                const cfg = ACTIVITY_CONFIG[item.type] || ACTIVITY_CONFIG.resume;
                                const isLast = i === s.recent_activity.length - 1;
                                return (
                                    <div
                                        key={i}
                                        onClick={() => navigate(item.url)}
                                        style={{
                                            display: 'flex', alignItems: 'center', gap: 14,
                                            padding: '11px 0',
                                            borderBottom: isLast ? 'none' : '1px solid var(--border2)',
                                            cursor: 'pointer',
                                        }}
                                        onMouseEnter={e => e.currentTarget.style.opacity = '0.8'}
                                        onMouseLeave={e => e.currentTarget.style.opacity = '1'}
                                    >
                                        {/* Icon */}
                                        <div style={{
                                            width: 36, height: 36, borderRadius: 8, flexShrink: 0,
                                            background: `${cfg.color}18`,
                                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                                        }}>
                                            <Icon name={cfg.icon} size={16} color={cfg.color} />
                                        </div>

                                        {/* Label + type */}
                                        <div style={{ flex: 1, minWidth: 0 }}>
                                            <p style={{ fontSize: 13, color: 'white', fontWeight: 500, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                                {item.label}
                                            </p>
                                            <p style={{ fontSize: 11, color: 'var(--text3)', fontFamily: 'var(--font-mono)', marginTop: 2 }}>
                                                {cfg.label} · {item.date ? new Date(item.date).toLocaleDateString() : '—'}
                                            </p>
                                        </div>

                                        {/* Score badge */}
                                        {item.score != null && (
                                            <span style={{
                                                fontFamily: 'var(--font-mono)', fontSize: 12,
                                                color: cfg.color,
                                                background: `${cfg.color}15`,
                                                border: `1px solid ${cfg.color}30`,
                                                borderRadius: 6, padding: '3px 9px', flexShrink: 0,
                                            }}>
                                                {item.type === 'interview'
                                                    ? `${item.score}/10`
                                                    : `${Math.round(item.score)}%`}
                                            </span>
                                        )}
                                    </div>
                                );
                            })}
                        </div>
                    ) : (
                        <div style={{ textAlign: 'center', padding: '32px 0', color: 'var(--text3)', fontSize: 14 }}>
                            No activity yet.{' '}
                            <span style={{ color: '#a855f7', cursor: 'pointer' }} onClick={() => navigate('/upload')}>
                                Upload a resume to start →
                            </span>
                        </div>
                    )}
                </div>

                {/* Next Steps */}
                <div style={{
                    background: 'var(--bg2)',
                    border: '1px solid var(--border)',
                    borderRadius: 14, padding: '24px',
                }}>
                    <div style={{ marginBottom: 20 }}>
                        <span style={{ fontWeight: 600, color: 'white', fontSize: 15 }}>Recommended Next Steps</span>
                    </div>

                    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                        {(s.next_steps || []).map((step, i) => {
                            const pcfg = PRIORITY_CONFIG[step.priority] || PRIORITY_CONFIG.medium;
                            return (
                                <div
                                    key={i}
                                    onClick={() => navigate(step.url)}
                                    style={{
                                        padding: '14px 16px',
                                        background: 'rgba(255,255,255,0.02)',
                                        border: '1px solid var(--border2)',
                                        borderRadius: 12,
                                        cursor: 'pointer',
                                        transition: 'border-color 0.2s, background 0.2s',
                                        position: 'relative',
                                        overflow: 'hidden',
                                    }}
                                    onMouseEnter={e => {
                                        e.currentTarget.style.borderColor = `${pcfg.color}40`;
                                        e.currentTarget.style.background = `${pcfg.color}08`;
                                    }}
                                    onMouseLeave={e => {
                                        e.currentTarget.style.borderColor = 'rgba(255,255,255,0.06)';
                                        e.currentTarget.style.background = 'rgba(255,255,255,0.02)';
                                    }}
                                >
                                    {/* Priority stripe */}
                                    <div style={{
                                        position: 'absolute', left: 0, top: 0, bottom: 0,
                                        width: 3,
                                        background: pcfg.color,
                                        borderRadius: '3px 0 0 3px',
                                    }} />

                                    <div style={{ paddingLeft: 8 }}>
                                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
                                            <p style={{ fontSize: 13, color: 'white', fontWeight: 600 }}>{step.label}</p>
                                            <span style={{ fontSize: 14, color: 'var(--text3)' }}>→</span>
                                        </div>
                                        <p style={{ fontSize: 12, color: 'var(--text3)', lineHeight: 1.5 }}>{step.desc}</p>
                                    </div>
                                </div>
                            );
                        })}
                    </div>

                    {/* Top Role chip */}
                    {s.top_role && (
                        <div style={{
                            marginTop: 20, padding: '12px 16px',
                            background: 'rgba(147,51,234,0.07)',
                            borderRadius: 10,
                            border: '1px solid rgba(147,51,234,0.15)',
                            display: 'flex', alignItems: 'center', gap: 10,
                        }}>
                            <Icon name="award" size={14} color="#a855f7" />
                            <div>
                                <p style={{ fontSize: 10, color: 'var(--text3)', fontFamily: 'var(--font-mono)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 2 }}>Top Predicted Role</p>
                                <p style={{ fontSize: 13, color: 'white', fontWeight: 600 }}>{s.top_role}</p>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
        </>
    );
}
