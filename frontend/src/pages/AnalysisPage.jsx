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
        async function fetchLatestAnalysis() {
            try {
                const resumes = await listResumes();
                if (resumes && resumes.length > 0) {
                    const latest = await getAnalysis(resumes[0].id);
                    setAnalysis(latest);
                }
            } catch (err) {
                notify(err.message || 'Failed to load analysis', 'error');
            } finally {
                setLoading(false);
            }
        }

        // Determine target analysis
        if (location.state?.analysis) {
            setAnalysis(location.state.analysis);
            setLoading(false);
        } else {
            fetchLatestAnalysis();
        }
    }, [location, notify]);

    const startInterview = () => {
        navigate('/interview', { state: { analysis } });
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
                rightSlot={<Button variant="primary" onClick={startInterview}>Start Interview</Button>}
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
                                        <Tag key={idx} label={skill} variant="skill" />
                                    ))
                                ) : (
                                    <span className="text-text3 text-sm italic">No skills detected.</span>
                                )}
                            </div>
                        </Card>

                        <Card className="flex flex-col gap-16">
                            <h3 className="font-mono text-sm tracking-wider text-text2 uppercase flex items-center gap-12">
                                Skill Gaps <Badge label="Focus Areas" variant="warning" />
                            </h3>
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

            </div>
        </div>
    );
}
