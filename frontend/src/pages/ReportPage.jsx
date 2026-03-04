import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { getAnalysis } from '../api/resume';
import { getDashboardSummary } from '../api/dashboard';

const PRINT_STYLES = `
@media print {
  .no-print { display: none !important; }
  body { background: white !important; }
  @page { margin: 18mm 20mm; }
}
`;

function ScoreBlock({ label, value, unit = '', color = '#1d1d1f' }) {
    return (
        <div style={{
            textAlign: 'center', padding: '16px 20px',
            border: '1px solid #e5e7eb', borderRadius: 10,
            minWidth: 110,
        }}>
            <div style={{
                fontFamily: 'monospace', fontSize: 32, fontWeight: 700,
                color, lineHeight: 1,
            }}>
                {value != null ? value : '—'}
                {value != null && unit && (
                    <span style={{ fontSize: 15, fontWeight: 400, color: '#6b7280', marginLeft: 2 }}>{unit}</span>
                )}
            </div>
            <div style={{ fontSize: 11, color: '#6b7280', marginTop: 6, textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                {label}
            </div>
        </div>
    );
}

export default function ReportPage() {
    const { resumeId } = useParams();
    const navigate = useNavigate();
    const { user } = useAuth();

    const [analysis, setAnalysis] = useState(null);
    const [summary, setSummary] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    useEffect(() => {
        let cancelled = false;
        Promise.all([
            getAnalysis(resumeId),
            getDashboardSummary(),
        ])
            .then(([a, s]) => {
                if (!cancelled) { setAnalysis(a); setSummary(s); }
            })
            .catch(err => { if (!cancelled) setError(err.message || 'Failed to load report'); })
            .finally(() => { if (!cancelled) setLoading(false); });
        return () => { cancelled = true; };
    }, [resumeId]);

    if (loading) {
        return (
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh', fontFamily: 'system-ui' }}>
                Preparing report...
            </div>
        );
    }
    if (error || !analysis) {
        return (
            <div style={{ textAlign: 'center', padding: 64, fontFamily: 'system-ui' }}>
                <p style={{ color: '#6b7280', marginBottom: 16 }}>{error || 'Report not available.'}</p>
                <button onClick={() => navigate(-1)} style={{ color: '#7c3aed', cursor: 'pointer', background: 'none', border: 'none', fontSize: 14 }}>
                    ← Go Back
                </button>
            </div>
        );
    }

    const now = new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
    const atsScore = Math.round(analysis.ats_score ?? 0);
    const atsLabel = atsScore >= 75 ? 'Excellent' : atsScore >= 50 ? 'Good' : 'Needs Improvement';
    const atsColor = atsScore >= 75 ? '#16a34a' : atsScore >= 50 ? '#d97706' : '#dc2626';

    const healthScore = summary?.career_health ?? null;
    const healthColor = healthScore == null ? '#6b7280'
        : healthScore >= 80 ? '#16a34a'
        : healthScore >= 65 ? '#0891b2'
        : healthScore >= 45 ? '#d97706'
        : '#dc2626';

    const sortedSkills = [...(analysis.extracted_skills || [])].sort((a, b) => b.score - a.score);

    return (
        <>
            <style>{PRINT_STYLES}</style>

            {/* Sticky action bar — hidden when printing */}
            <div className="no-print" style={{
                position: 'fixed', top: 0, left: 0, right: 0, zIndex: 100,
                background: '#1a1a2e', borderBottom: '1px solid rgba(255,255,255,0.08)',
                padding: '12px 24px',
                display: 'flex', alignItems: 'center', gap: 12,
            }}>
                <button
                    onClick={() => navigate(-1)}
                    style={{
                        padding: '7px 14px', borderRadius: 8,
                        background: 'rgba(255,255,255,0.06)',
                        border: '1px solid rgba(255,255,255,0.1)',
                        color: '#d1d5db', fontSize: 13, cursor: 'pointer',
                    }}
                >
                    ← Back
                </button>
                <span style={{ flex: 1, fontFamily: 'monospace', fontSize: 13, color: '#9ca3af' }}>
                    Career Report · {user?.name} · {now}
                </span>
                <button
                    onClick={() => window.print()}
                    style={{
                        padding: '8px 20px', borderRadius: 8,
                        background: 'linear-gradient(135deg, #7c3aed, #9333ea)',
                        border: 'none',
                        color: 'white', fontSize: 13, fontWeight: 600, cursor: 'pointer',
                    }}
                >
                    ↓ Download PDF
                </button>
            </div>

            {/* Report body — white, print-safe */}
            <div style={{
                background: 'white',
                minHeight: '100vh',
                paddingTop: 64,   /* offset for sticky bar */
                fontFamily: 'system-ui, -apple-system, sans-serif',
                color: '#1f2937',
            }}>
                <div style={{ maxWidth: 800, margin: '0 auto', padding: '40px 40px 80px' }}>

                    {/* ── Report Header ── */}
                    <div style={{
                        display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start',
                        paddingBottom: 24, marginBottom: 32,
                        borderBottom: '2px solid #7c3aed',
                    }}>
                        <div>
                            <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.12em', color: '#7c3aed', textTransform: 'uppercase', marginBottom: 6 }}>
                                CareerCopilot
                            </div>
                            <h1 style={{ fontSize: 26, fontWeight: 700, color: '#111827', marginBottom: 4 }}>
                                Career Analysis Report
                            </h1>
                            <p style={{ fontSize: 14, color: '#6b7280' }}>
                                {user?.name} · Generated {now}
                            </p>
                        </div>
                        <div style={{ textAlign: 'right' }}>
                            <div style={{ fontSize: 11, color: '#9ca3af', marginBottom: 4 }}>Analysis ID</div>
                            <div style={{ fontFamily: 'monospace', fontSize: 13, color: '#374151' }}>
                                #{analysis.analysis_id}
                            </div>
                        </div>
                    </div>

                    {/* ── Score Summary Row ── */}
                    <section style={{ marginBottom: 36 }}>
                        <h2 style={{ fontSize: 13, fontWeight: 700, letterSpacing: '0.08em', color: '#6b7280', textTransform: 'uppercase', marginBottom: 16 }}>
                            Performance Summary
                        </h2>
                        <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
                            <ScoreBlock label="ATS Score" value={atsScore} unit="/100" color={atsColor} />
                            <ScoreBlock label="Career Health" value={healthScore} unit="/100" color={healthColor} />
                            <ScoreBlock
                                label="Interview Avg"
                                value={summary?.interview_avg != null ? `${summary.interview_avg}` : null}
                                unit="/10"
                                color={summary?.interview_avg >= 7 ? '#16a34a' : '#d97706'}
                            />
                            <ScoreBlock
                                label="Best Job Match"
                                value={summary?.best_match_score != null ? `${Math.round(summary.best_match_score)}` : null}
                                unit="%"
                                color={summary?.best_match_score >= 70 ? '#16a34a' : '#d97706'}
                            />
                        </div>

                        {/* ATS score label */}
                        <div style={{
                            marginTop: 16, padding: '12px 16px',
                            background: `${atsColor}10`,
                            border: `1px solid ${atsColor}30`,
                            borderRadius: 8,
                            display: 'flex', alignItems: 'center', gap: 10,
                        }}>
                            <div style={{ width: 8, height: 8, borderRadius: '50%', background: atsColor, flexShrink: 0 }} />
                            <span style={{ fontSize: 13, color: '#374151' }}>
                                ATS Rating: <strong style={{ color: atsColor }}>{atsLabel}</strong>
                                {atsScore < 75 && ' — Applying rewrite suggestions can significantly improve this score.'}
                                {atsScore >= 75 && ' — Your resume is well-optimised for ATS systems.'}
                            </span>
                        </div>
                    </section>

                    {/* ── Role Predictions ── */}
                    {analysis.predicted_roles && analysis.predicted_roles.length > 0 && (
                        <section style={{ marginBottom: 36, pageBreakInside: 'avoid' }}>
                            <h2 style={{ fontSize: 13, fontWeight: 700, letterSpacing: '0.08em', color: '#6b7280', textTransform: 'uppercase', marginBottom: 16 }}>
                                Role Predictions
                            </h2>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                                {analysis.predicted_roles.map((role, i) => (
                                    <div key={i}>
                                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 5 }}>
                                            <span style={{ fontSize: 14, fontWeight: i === 0 ? 600 : 400, color: '#1f2937' }}>
                                                {role.role}
                                                {i === 0 && <span style={{ marginLeft: 8, fontSize: 11, color: '#16a34a', fontWeight: 600 }}>Best Match</span>}
                                            </span>
                                            <span style={{ fontFamily: 'monospace', fontSize: 13, fontWeight: 600, color: '#7c3aed' }}>
                                                {role.score}%
                                            </span>
                                        </div>
                                        <div style={{ height: 6, background: '#f3f4f6', borderRadius: 3, overflow: 'hidden' }}>
                                            <div style={{
                                                height: '100%', width: `${role.score}%`,
                                                background: i === 0 ? '#7c3aed' : '#c4b5fd',
                                                borderRadius: 3,
                                            }} />
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </section>
                    )}

                    {/* ── Skill Confidence ── */}
                    {sortedSkills.length > 0 && (
                        <section style={{ marginBottom: 36 }}>
                            <h2 style={{ fontSize: 13, fontWeight: 700, letterSpacing: '0.08em', color: '#6b7280', textTransform: 'uppercase', marginBottom: 16 }}>
                                Detected Skills ({sortedSkills.length})
                            </h2>
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px 32px' }}>
                                {sortedSkills.map((item, i) => {
                                    const pct = Math.round((item.score ?? 0) * 100);
                                    const color = pct >= 80 ? '#16a34a' : pct >= 65 ? '#0891b2' : '#d97706';
                                    return (
                                        <div key={i}>
                                            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                                                <span style={{ fontSize: 13, color: '#374151' }}>{item.skill ?? item}</span>
                                                <span style={{ fontFamily: 'monospace', fontSize: 12, color, fontWeight: 600 }}>{pct}%</span>
                                            </div>
                                            <div style={{ height: 4, background: '#f3f4f6', borderRadius: 2, overflow: 'hidden' }}>
                                                <div style={{ height: '100%', width: `${pct}%`, background: color, borderRadius: 2 }} />
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        </section>
                    )}

                    {/* ── Skill Gaps ── */}
                    {analysis.gap_skills && analysis.gap_skills.length > 0 && (
                        <section style={{ marginBottom: 36, pageBreakInside: 'avoid' }}>
                            <h2 style={{ fontSize: 13, fontWeight: 700, letterSpacing: '0.08em', color: '#6b7280', textTransform: 'uppercase', marginBottom: 16 }}>
                                Skill Gaps to Address
                            </h2>
                            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                                {analysis.gap_skills.map((gap, i) => (
                                    <span key={i} style={{
                                        fontSize: 12, padding: '4px 12px',
                                        background: '#fef3c7',
                                        color: '#92400e',
                                        border: '1px solid #fde68a',
                                        borderRadius: 100,
                                        fontFamily: 'monospace',
                                    }}>
                                        {gap}
                                    </span>
                                ))}
                            </div>
                            <p style={{ fontSize: 12, color: '#6b7280', marginTop: 12 }}>
                                Adding these skills to your resume through concrete experience bullets can meaningfully improve your ATS score and job match rate.
                            </p>
                        </section>
                    )}

                    {/* ── Footer ── */}
                    <div style={{
                        marginTop: 48, paddingTop: 20,
                        borderTop: '1px solid #e5e7eb',
                        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                    }}>
                        <span style={{ fontSize: 11, color: '#9ca3af' }}>
                            Generated by <strong style={{ color: '#7c3aed' }}>CareerCopilot</strong> · {now}
                        </span>
                        <span style={{ fontFamily: 'monospace', fontSize: 11, color: '#9ca3af' }}>
                            #{analysis.analysis_id}
                        </span>
                    </div>
                </div>
            </div>
        </>
    );
}
