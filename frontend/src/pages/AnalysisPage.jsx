import { useEffect, useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { listResumes, getAnalysis } from '../api/resume';
import { useNotify } from '../hooks/useNotify';
import PageHeader from '../components/layout/PageHeader';
import ScoreRing from '../components/ui/ScoreRing';
import ProgressBar from '../components/ui/ProgressBar';
import Badge from '../components/ui/Badge';
import Card from '../components/ui/Card';
import Tag from '../components/ui/Tag';
import Button from '../components/ui/Button';
import EmptyState from '../components/ui/EmptyState';
import Spinner from '../components/ui/Spinner';

export default function AnalysisPage() {
    const [analysis, setAnalysis] = useState(null);
    const [loading, setLoading] = useState(true);

    const navigate = useNavigate();
    const location = useLocation();
    const notify = useNotify();

    useEffect(() => {
        let cancelled = false;

        async function fetchLatestAnalysis() {
            try {
                // If navigated with a specific resumeId, use it
                if (location.state?.resumeId) {
                    const data = await getAnalysis(location.state.resumeId);
                    if (!cancelled) setAnalysis(data);
                    return;
                }
                const resumes = await listResumes();
                if (resumes && resumes.length > 0) {
                    const latest = await getAnalysis(resumes[0].id);
                    if (!cancelled) setAnalysis(latest);
                }
            } catch (err) {
                if (!cancelled) notify(err.message || 'Failed to load analysis', 'error');
            } finally {
                if (!cancelled) setLoading(false);
            }
        }

        // If navigated with pre-fetched analysis data, use it directly
        if (location.state?.analysis) {
            setAnalysis(location.state.analysis);
            setLoading(false);
        } else {
            fetchLatestAnalysis();
        }

        return () => { cancelled = true; };
    }, [location.state, notify]);

    const startInterview = () => {
        navigate('/interview', { state: { analysis } });
    };

    const goToRewrite = () => {
        navigate(`/rewrite/${analysis.resume_id}`);
    };

    if (loading) {
        return (
            <div className="flex-1 flex items-center justify-center h-full">
                <Spinner size={40} className="text-cyan" />
            </div>
        );
    }

    if (!analysis) {
        return (
            <div className="flex-1 flex items-center justify-center h-full">
                <EmptyState
                    emoji="📊"
                    title="No Analysis Found"
                    description="Upload a resume to generate an AI analysis report."
                    action={{ label: "Upload Resume", onClick: () => navigate('/upload') }}
                />
            </div>
        );
    }

    // Derive score labels
    let scoreLabel = 'Needs Work';
    let scoreVariant = 'error';
    let scoreMessage = 'Your resume needs significant improvements to pass standard ATS filters.';

    if (analysis.ats_score >= 75) {
        scoreLabel = 'Excellent';
        scoreVariant = 'success';
        scoreMessage = 'Your resume is highly optimized and ready for top-tier applications.';
    } else if (analysis.ats_score >= 50) {
        scoreLabel = 'Good';
        scoreVariant = 'warning';
        scoreMessage = 'Solid foundation, but addressing the skill gaps will improve your chances.';
    }

    return (
        <div className="p-32 overflow-y-auto w-full h-full pb-64">
            <PageHeader
                eyebrow="AI ANALYSIS REPORT"
                title="Resume Analysis"
                subtitle={<>Analysis ID: <span className="font-mono text-cyan">#{analysis.analysis_id}</span></>}
                rightSlot={
                    <div className="flex gap-12">
                        <Button variant="secondary" onClick={goToRewrite}>Rewrite Suggestions</Button>
                        <Button variant="secondary" onClick={() => navigate(`/report/${analysis.resume_id}`)}>Export PDF</Button>
                        <Button variant="primary" onClick={startInterview}>Start Interview</Button>
                    </div>
                }
            />

            <div className="flex flex-col gap-32">
                {/* ATS Hero Card */}
                <Card variant="cyan" padding="32" className="fade-up-1">
                    <div className="flex flex-col md:flex-row gap-48 items-center md:items-start">

                        <div className="flex-shrink-0">
                            <ScoreRing score={analysis.ats_score} size={180} />
                        </div>

                        <div className="flex flex-col w-full">
                            <div className="flex items-center gap-16 mb-16">
                                <h2 className="font-display font-bold text-2xl text-text leading-none">ATS Score</h2>
                                <Badge label={scoreLabel} variant={scoreVariant} />
                            </div>

                            <p className="text-text2 font-body text-[15px] mb-24 max-w-xl">
                                {scoreMessage}
                            </p>

                            <div className="grid grid-3 gap-24 pt-24 border-t border-border mt-auto">
                                <div className="flex flex-col gap-4">
                                    <span className="font-mono text-xl font-medium text-cyan">{analysis.extracted_skills?.length || 0}</span>
                                    <span className="text-xs text-text3 font-body uppercase tracking-wider">Skills Found</span>
                                </div>
                                <div className="flex flex-col gap-4">
                                    <span className="font-mono text-xl font-medium text-green">{analysis.predicted_roles?.length || 0}</span>
                                    <span className="text-xs text-text3 font-body uppercase tracking-wider">Role Matches</span>
                                </div>
                                <div className="flex flex-col gap-4">
                                    <span className="font-mono text-xl font-medium text-coral">{analysis.gap_skills?.length || 0}</span>
                                    <span className="text-xs text-text3 font-body uppercase tracking-wider">Skill Gaps</span>
                                </div>
                            </div>
                        </div>
                    </div>
                </Card>

                {/* Two-Column Details Grid */}
                <div className="grid grid-2 gap-32">

                    {/* LEFT: Role Predictions */}
                    <Card className="flex flex-col gap-24 fade-up-2">
                        <h3 className="font-mono text-sm tracking-wider text-text2 uppercase">Role Predictions</h3>

                        <div className="flex flex-col gap-24">
                            {analysis.predicted_roles?.map((role, idx) => {
                                const colors = ['var(--cyan)', 'var(--green)', 'var(--gold)'];
                                return (
                                    <div key={idx} className="flex flex-col gap-8">
                                        <div className="flex items-center justify-between font-body text-sm mb-2">
                                            <div className="flex items-center gap-8">
                                                <span className="text-text font-medium">{role.role}</span>
                                                {idx === 0 && <Badge label="Best Match" variant="success" />}
                                            </div>
                                            <span className="font-mono text-xs font-medium" style={{ color: colors[idx % 3] }}>{role.score}%</span>
                                        </div>
                                        <ProgressBar
                                            value={role.score}
                                            color={colors[idx % 3]}
                                            showValue={false}
                                        />
                                    </div>
                                );
                            })}

                            {(!analysis.predicted_roles || analysis.predicted_roles.length === 0) && (
                                <span className="text-text3 text-sm italic">No role predictions available.</span>
                            )}
                        </div>
                    </Card>

                    {/* RIGHT: Skills & Gaps */}
                    <div className="flex flex-col gap-32 fade-up-3">

                        <Card className="flex flex-col gap-16">
                            <h3 className="font-mono text-sm tracking-wider text-text2 uppercase">Detected Skills</h3>
                            <div className="flex flex-wrap gap-8">
                                {analysis.extracted_skills?.length > 0 ? (
                                    analysis.extracted_skills.map((skill, idx) => (
                                        <Tag key={idx} label={skill.skill ?? skill} variant="skill" />
                                    ))
                                ) : (
                                    <span className="text-text3 text-sm italic">No skills detected.</span>
                                )}
                            </div>
                        </Card>

                        <Card className="flex flex-col gap-16">
                            <div className="flex items-center justify-between">
                                <h3 className="font-mono text-sm tracking-wider text-text2 uppercase flex items-center gap-12">
                                    Skill Gaps <Badge label="Focus Areas" variant="warning" />
                                </h3>
                                {analysis.gap_skills?.length > 0 && (
                                    <button
                                        onClick={goToRewrite}
                                        className="font-mono text-[11px] text-cyan tracking-wider uppercase hover:opacity-80 transition-opacity"
                                    >
                                        Fix these →
                                    </button>
                                )}
                            </div>
                            <div className="flex flex-wrap gap-8">
                                {analysis.gap_skills?.length > 0 ? (
                                    analysis.gap_skills.map((gap, idx) => (
                                        <Tag key={idx} label={gap} variant="gap" />
                                    ))
                                ) : (
                                    <span className="text-text3 text-sm italic">No major gaps identified!</span>
                                )}
                            </div>
                        </Card>

                    </div>
                </div>

                {/* Skill Confidence Breakdown */}
                {analysis.extracted_skills && analysis.extracted_skills.length > 0 && (
                    <Card className="flex flex-col gap-20 fade-up-4">
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                            <h3 className="font-mono text-sm tracking-wider text-text2 uppercase">Skill Confidence Breakdown</h3>
                            <span style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--text3)' }}>
                                {analysis.extracted_skills.length} skills · sorted by match strength
                            </span>
                        </div>

                        {/* 2-col grid of bars */}
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px 40px' }}>
                            {[...analysis.extracted_skills]
                                .sort((a, b) => b.score - a.score)
                                .map((item, i) => {
                                    const pct = Math.round((item.score ?? 0) * 100);
                                    const color = pct >= 80 ? 'var(--green)'
                                        : pct >= 65 ? '#22d3ee'
                                        : 'var(--gold)';
                                    return (
                                        <div key={i}>
                                            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                                                <span style={{ fontSize: 13, color: 'var(--text)', fontWeight: 500 }}>
                                                    {item.skill ?? item}
                                                </span>
                                                <span style={{ fontFamily: 'var(--font-mono)', fontSize: 12, color, fontWeight: 600 }}>
                                                    {pct}%
                                                </span>
                                            </div>
                                            <div style={{ height: 5, background: 'var(--bg3)', borderRadius: 3, overflow: 'hidden' }}>
                                                <div style={{
                                                    height: '100%',
                                                    width: `${pct}%`,
                                                    background: color,
                                                    borderRadius: 3,
                                                    transition: 'width 1.2s cubic-bezier(0.4,0,0.2,1)',
                                                }} />
                                            </div>
                                        </div>
                                    );
                                })}
                        </div>

                        {/* Legend */}
                        <div style={{ display: 'flex', gap: 24, paddingTop: 12, borderTop: '1px solid var(--border2)' }}>
                            {[
                                { color: 'var(--green)', label: '≥80%  Strong match' },
                                { color: '#22d3ee', label: '65–79%  Good match' },
                                { color: 'var(--gold)', label: '<65%  Partial match' },
                            ].map(l => (
                                <div key={l.label} style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
                                    <div style={{ width: 10, height: 10, borderRadius: 2, background: l.color, flexShrink: 0 }} />
                                    <span style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--text3)' }}>{l.label}</span>
                                </div>
                            ))}
                        </div>
                    </Card>
                )}

            </div>
        </div>
    );
}
