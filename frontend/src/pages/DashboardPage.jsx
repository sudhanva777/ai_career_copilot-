// DashboardPage.jsx — matches banking dashboard aesthetic
import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { listResumes, getAnalysis } from '../api/resume';
import { useNotify } from '../hooks/useNotify';
import { useAuth } from '../hooks/useAuth';
import Icon from '../components/ui/Icon';

export default function DashboardPage() {
    const [resumes, setResumes] = useState([]);
    const [latestAnalysis, setLatestAnalysis] = useState(null);
    const [loading, setLoading] = useState(true);

    const navigate = useNavigate();
    const notify = useNotify();
    const { user } = useAuth();

    useEffect(() => {
        async function loadDashboardData() {
            try {
                const records = await listResumes();
                setResumes(records || []);

                if (records && records.length > 0) {
                    const analysis = await getAnalysis(records[0].id);
                    setLatestAnalysis(analysis);
                }
            } catch (err) {
                notify(err.message || 'Failed to load dashboard data', 'error');
            } finally {
                setLoading(false);
            }
        }
        loadDashboardData();
    }, [notify]);

    const userName = user?.name || 'User';

    const score = latestAnalysis?.ats_score || 0;
    const scoreColor = score >= 75 ? 'var(--green)' : score >= 50 ? 'var(--gold)' : 'var(--red)';
    const scoreLabel = score >= 75 ? 'Excellent' : score >= 50 ? 'Needs Improvement' : 'Poor Match';

    const statCards = [
        { label: 'Resumes Uploaded', sub: 'Total Documents', icon: 'file', value: resumes.length, color: '#3b82f6' },
        { label: 'Skills Detected', sub: 'Unique Keywords', icon: 'zap', value: latestAnalysis?.extracted_skills?.length || 0, color: '#22c55e' },
        { label: 'Skill Gaps', sub: 'Missing Requirements', icon: 'info', value: latestAnalysis?.gap_skills?.length || 0, color: '#f59e0b' },
        { label: 'Predicted Match', sub: 'Target Role', icon: 'target', value: latestAnalysis?.predicted_roles?.[0] ? `${Math.round(latestAnalysis.predicted_roles[0].score)}%` : '—', color: '#9333ea' },
    ];

    const viewAnalysis = (r) => {
        navigate(`/analysis`);
    };

    if (loading) {
        return (
            <div style={{ display: 'flex', alignItems: 'center', justifyItems: 'center', height: '100%', width: '100%', color: 'var(--text3)' }}>
                Loading dashboard...
            </div>
        );
    }

    return (
        <div className="fade-up">

            {/* Hero Card — matches "Main account" card */}
            <div style={{
                background: 'var(--bg2)',
                border: '1px solid var(--border)',
                borderRadius: 16,
                padding: '28px 32px',
                marginBottom: 24,
                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            }}>
                <div>
                    <p style={{ color: 'var(--text3)', fontSize: 12, marginBottom: 6 }}>Career Profile</p>
                    <h2 style={{ fontFamily: 'var(--font-display)', fontSize: 22, fontWeight: 700, color: 'white' }}>
                        {userName}
                    </h2>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10, margin: '8px 0 20px' }}>
                        <span style={{ color: 'var(--text3)', fontFamily: 'var(--font-mono)', fontSize: 13 }}>
                            {latestAnalysis ? `#${latestAnalysis.analysis_id}` : '—'}
                        </span>
                    </div>
                    <div style={{ display: 'flex', gap: 12 }}>
                        <button className="dash-btn-purple" onClick={() => navigate('/upload')}>
                            Upload Resume
                        </button>
                        <button className="dash-btn-ghost" onClick={() => navigate('/analysis')}>
                            View Analysis
                        </button>
                    </div>
                </div>

                <div style={{ textAlign: 'right' }}>
                    <p style={{ color: 'var(--text3)', fontSize: 12, marginBottom: 8 }}>Latest ATS Score</p>
                    <div style={{
                        fontFamily: 'var(--font-mono)', fontSize: 48, fontWeight: 700,
                        color: scoreColor, lineHeight: 1,
                    }}>
                        {latestAnalysis ? Math.round(latestAnalysis.ats_score) : '—'}
                        <span style={{ fontSize: 24, opacity: 0.5 }}>/100</span>
                    </div>
                    <span style={{ fontSize: 13, color: scoreColor, marginTop: 6, display: 'block' }}>
                        {scoreLabel}
                    </span>
                </div>
            </div>

            {/* 4 Stat cards — like bank account cards */}
            <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(4, 1fr)',
                gap: 16, marginBottom: 24,
            }}>
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
                        <div style={{
                            fontFamily: 'var(--font-mono)',
                            fontSize: 26, fontWeight: 600, color: card.color,
                        }}>
                            {card.value}
                        </div>
                    </div>
                ))}
            </div>

            {/* Bottom row — 2 columns */}
            <div style={{ display: 'grid', gridTemplateColumns: '1.4fr 1fr', gap: 20 }}>

                {/* Latest Resumes — matches "Latest transactions" */}
                <div style={{
                    background: 'var(--bg2)',
                    border: '1px solid var(--border)',
                    borderRadius: 14, padding: '24px',
                }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 20 }}>
                        <span style={{ fontWeight: 600, color: 'white', fontSize: 16 }}>Latest Resumes</span>
                        <button onClick={() => navigate('/resumes')} style={{
                            width: 32, height: 32, borderRadius: '50%',
                            background: 'var(--bg3)',
                            border: '1px solid var(--border)',
                            color: 'white', cursor: 'pointer',
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                        }}>→</button>
                    </div>
                    {/* Resume rows like transaction rows */}
                    {resumes.slice(0, 5).map((r, i) => (
                        <div key={r.id} style={{
                            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                            padding: '12px 0',
                            borderBottom: i < Math.min(resumes.length, 5) - 1
                                ? '1px solid var(--border2)' : 'none',
                        }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                                <div style={{
                                    width: 36, height: 36, borderRadius: 8,
                                    background: 'rgba(147,51,234,0.15)',
                                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                                }}>
                                    <Icon name="file" size={16} color="#a855f7" />
                                </div>
                                <div>
                                    <p style={{ fontSize: 14, color: 'white', fontWeight: 500 }}>{r.filename}</p>
                                    <p style={{ fontSize: 11, color: 'var(--text3)', fontFamily: 'var(--font-mono)' }}>
                                        {new Date(r.uploaded_at).toLocaleDateString()}
                                    </p>
                                </div>
                            </div>
                            <button
                                onClick={() => viewAnalysis(r)}
                                style={{
                                    fontSize: 12, color: '#a855f7',
                                    background: 'rgba(147,51,234,0.1)',
                                    border: '1px solid rgba(147,51,234,0.2)',
                                    borderRadius: 6, padding: '4px 12px', cursor: 'pointer',
                                }}
                            >
                                Analyze
                            </button>
                        </div>
                    ))}
                    {resumes.length === 0 && (
                        <div style={{ textAlign: 'center', padding: '32px 0', color: 'var(--text3)', fontSize: 14 }}>
                            No resumes yet.{' '}
                            <span style={{ color: '#a855f7', cursor: 'pointer' }} onClick={() => navigate('/upload')}>
                                Upload one →
                            </span>
                        </div>
                    )}
                </div>

                {/* Skill Profile — matches "All expenses" panel */}
                <div style={{
                    background: 'var(--bg2)',
                    border: '1px solid var(--border)',
                    borderRadius: 14, padding: '24px',
                }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 20 }}>
                        <span style={{ fontWeight: 600, color: 'white', fontSize: 16 }}>Skill Profile</span>
                        <button onClick={() => navigate('/analysis')} style={{
                            width: 32, height: 32, borderRadius: '50%',
                            background: 'var(--bg3)',
                            border: '1px solid var(--border)',
                            color: 'white', cursor: 'pointer',
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                        }}>→</button>
                    </div>

                    {/* Top roles */}
                    {latestAnalysis?.predicted_roles?.slice(0, 3).map((role, i) => (
                        <div key={role.role} style={{ marginBottom: 14 }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                                <span style={{ fontSize: 13, color: i === 0 ? 'white' : 'var(--text2)' }}>{role.role}</span>
                                <span style={{ fontFamily: 'var(--font-mono)', fontSize: 13, color: '#a855f7' }}>
                                    {Math.round(role.score)}%
                                </span>
                            </div>
                            <div style={{ height: 5, background: 'var(--bg3)', borderRadius: 3, overflow: 'hidden' }}>
                                <div style={{
                                    height: '100%', width: `${role.score}%`,
                                    background: i === 0
                                        ? 'linear-gradient(90deg, #7c3aed, #a855f7)'
                                        : 'rgba(147,51,234,0.4)',
                                    borderRadius: 3,
                                    transition: 'width 1s var(--ease)',
                                }} />
                            </div>
                        </div>
                    ))}

                    {/* Skill gap summary */}
                    {latestAnalysis && (
                        <div style={{
                            marginTop: 20,
                            padding: '14px',
                            background: 'rgba(147,51,234,0.07)',
                            borderRadius: 10,
                            border: '1px solid rgba(147,51,234,0.15)',
                        }}>
                            <p style={{ fontSize: 12, color: 'var(--text3)', marginBottom: 8 }}>Skill Gaps to Fill</p>
                            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                                {latestAnalysis.gap_skills?.slice(0, 4).map(s => (
                                    <span key={s} style={{
                                        fontSize: 11, padding: '3px 10px',
                                        background: 'rgba(245,158,11,0.1)',
                                        color: '#f59e0b',
                                        border: '1px solid rgba(245,158,11,0.2)',
                                        borderRadius: 100,
                                        fontFamily: 'var(--font-mono)',
                                    }}>
                                        {s}
                                    </span>
                                ))}
                            </div>
                        </div>
                    )}

                    {!latestAnalysis && (
                        <div style={{ textAlign: 'center', padding: '32px 0', color: 'var(--text3)', fontSize: 14 }}>
                            Upload a resume to see your profile
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
