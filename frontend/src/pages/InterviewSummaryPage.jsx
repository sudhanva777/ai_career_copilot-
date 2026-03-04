import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
    RadarChart, Radar, PolarGrid, PolarAngleAxis, PolarRadiusAxis,
    ResponsiveContainer, Tooltip,
} from 'recharts';
import { getSessionSummary } from '../api/interview';
import { useNotify } from '../hooks/useNotify';
import Icon from '../components/ui/Icon';

const CATEGORY_COLORS = {
    'Technical':       '#22d3ee',
    'Behavioral':      '#22c55e',
    'Situational':     '#f59e0b',
    'Problem Solving': '#9333ea',
    'Communication':   '#3b82f6',
};

const ALL_CATEGORIES = ['Technical', 'Behavioral', 'Situational', 'Problem Solving', 'Communication'];

export default function InterviewSummaryPage() {
    const { sessionId } = useParams();
    const navigate = useNavigate();
    const notify = useNotify();
    const [summary, setSummary] = useState(null);
    const [loading, setLoading] = useState(true);
    const [openQA, setOpenQA] = useState(null);

    useEffect(() => {
        getSessionSummary(sessionId)
            .then(setSummary)
            .catch(err => notify(err.message || 'Failed to load summary', 'error'))
            .finally(() => setLoading(false));
    }, [sessionId]);

    if (loading) {
        return (
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', color: 'var(--text3)' }}>
                Loading summary...
            </div>
        );
    }

    if (!summary) {
        return (
            <div style={{ textAlign: 'center', padding: 64, color: 'var(--text3)' }}>
                Summary not found.{' '}
                <span style={{ color: '#a855f7', cursor: 'pointer' }} onClick={() => navigate('/interview')}>
                    Back to Interview →
                </span>
            </div>
        );
    }

    const chartData = ALL_CATEGORIES.map(cat => ({
        subject: cat,
        score: summary.per_category_scores[cat] ?? 0,
        fullMark: 10,
    }));

    const overallScore = summary.overall_score;
    const scoreColor = overallScore == null ? 'var(--text3)'
        : overallScore >= 7 ? 'var(--green)'
        : overallScore >= 5 ? 'var(--gold)'
        : 'var(--red)';

    return (
        <div className="fade-up" style={{ maxWidth: 900, margin: '0 auto', padding: '32px 24px 64px' }}>

            {/* Header */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 32 }}>
                <button
                    onClick={() => navigate('/interview')}
                    style={{
                        width: 36, height: 36,
                        borderRadius: 8,
                        background: 'var(--bg2)',
                        border: '1px solid var(--border)',
                        color: 'var(--text2)',
                        cursor: 'pointer',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                    }}
                >
                    <Icon name="chevron-left" size={16} />
                </button>
                <div>
                    <h1 style={{ fontSize: 22, fontWeight: 700, color: 'white', fontFamily: 'var(--font-display)' }}>
                        Session Summary
                    </h1>
                    <p style={{ fontSize: 13, color: 'var(--text3)', marginTop: 4, fontFamily: 'var(--font-mono)' }}>
                        {summary.target_role} · #{summary.session_id}
                        {summary.practice_mode && (
                            <span style={{ marginLeft: 8, color: '#9333ea' }}>· Practice Mode</span>
                        )}
                    </p>
                </div>
                <div style={{ marginLeft: 'auto', textAlign: 'right' }}>
                    <div style={{ fontFamily: 'var(--font-mono)', fontSize: 36, fontWeight: 700, color: scoreColor, lineHeight: 1 }}>
                        {overallScore != null ? overallScore : '—'}
                        <span style={{ fontSize: 16, opacity: 0.5 }}>/10</span>
                    </div>
                    <div style={{ fontSize: 11, color: 'var(--text3)', marginTop: 4 }}>Overall Score</div>
                </div>
            </div>

            {/* Two-column: Radar + Category scores */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20, marginBottom: 24 }}>

                {/* Radar chart */}
                <div style={{
                    background: 'var(--bg2)',
                    border: '1px solid var(--border)',
                    borderRadius: 14,
                    padding: '24px',
                }}>
                    <p style={{ fontSize: 13, fontWeight: 600, color: 'white', marginBottom: 20 }}>Performance by Category</p>
                    <ResponsiveContainer width="100%" height={260}>
                        <RadarChart data={chartData}>
                            <PolarGrid stroke="rgba(255,255,255,0.08)" />
                            <PolarAngleAxis
                                dataKey="subject"
                                tick={{ fill: 'var(--text2)', fontSize: 11, fontFamily: 'var(--font-mono)' }}
                            />
                            <PolarRadiusAxis
                                angle={30}
                                domain={[0, 10]}
                                tick={{ fill: 'var(--text3)', fontSize: 9 }}
                                tickCount={3}
                            />
                            <Radar
                                name="Score"
                                dataKey="score"
                                stroke="#9333ea"
                                fill="#9333ea"
                                fillOpacity={0.25}
                                strokeWidth={2}
                            />
                            <Tooltip
                                formatter={(val) => [`${val}/10`, 'Score']}
                                contentStyle={{
                                    background: 'var(--bg2)',
                                    border: '1px solid var(--border)',
                                    borderRadius: 8,
                                    fontSize: 12,
                                }}
                            />
                        </RadarChart>
                    </ResponsiveContainer>
                </div>

                {/* Category score bars */}
                <div style={{
                    background: 'var(--bg2)',
                    border: '1px solid var(--border)',
                    borderRadius: 14,
                    padding: '24px',
                }}>
                    <p style={{ fontSize: 13, fontWeight: 600, color: 'white', marginBottom: 20 }}>Category Scores</p>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                        {ALL_CATEGORIES.map(cat => {
                            const score = summary.per_category_scores[cat];
                            const color = CATEGORY_COLORS[cat];
                            return (
                                <div key={cat}>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                                        <span style={{ fontSize: 12, color: 'var(--text2)', fontFamily: 'var(--font-mono)' }}>{cat}</span>
                                        <span style={{ fontSize: 12, color: color, fontFamily: 'var(--font-mono)', fontWeight: 600 }}>
                                            {score != null ? `${score}/10` : '—'}
                                        </span>
                                    </div>
                                    <div style={{ height: 5, background: 'var(--bg3)', borderRadius: 3, overflow: 'hidden' }}>
                                        <div style={{
                                            height: '100%',
                                            width: score != null ? `${(score / 10) * 100}%` : '0%',
                                            background: color,
                                            borderRadius: 3,
                                            transition: 'width 1s var(--ease)',
                                        }} />
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>
            </div>

            {/* Q&A Breakdown */}
            <div style={{
                background: 'var(--bg2)',
                border: '1px solid var(--border)',
                borderRadius: 14,
                padding: '24px',
            }}>
                <p style={{ fontSize: 13, fontWeight: 600, color: 'white', marginBottom: 20 }}>Question Breakdown</p>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                    {summary.qa_list.map((qa, i) => {
                        const isOpen = openQA === i;
                        const catColor = CATEGORY_COLORS[qa.question_category] || '#22d3ee';
                        const score = qa.similarity_score;
                        const scoreColor = score == null ? 'var(--text3)'
                            : score >= 7 ? 'var(--green)'
                            : score >= 5 ? 'var(--gold)'
                            : 'var(--red)';

                        return (
                            <div key={qa.qa_id} style={{
                                border: '1px solid var(--border2)',
                                borderRadius: 10,
                                overflow: 'hidden',
                            }}>
                                {/* Accordion header */}
                                <button
                                    onClick={() => setOpenQA(isOpen ? null : i)}
                                    style={{
                                        width: '100%',
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'space-between',
                                        padding: '14px 16px',
                                        background: 'transparent',
                                        border: 'none',
                                        cursor: 'pointer',
                                        gap: 12,
                                        textAlign: 'left',
                                    }}
                                >
                                    <div style={{ display: 'flex', alignItems: 'center', gap: 10, flex: 1, minWidth: 0 }}>
                                        <span style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--text3)', flexShrink: 0 }}>
                                            Q{i + 1}
                                        </span>
                                        <span style={{
                                            fontSize: 10, padding: '2px 8px',
                                            borderRadius: 100,
                                            background: `${catColor}18`,
                                            color: catColor,
                                            border: `1px solid ${catColor}40`,
                                            fontFamily: 'var(--font-mono)',
                                            flexShrink: 0,
                                        }}>
                                            {qa.question_category}
                                        </span>
                                        <span style={{ fontSize: 13, color: 'white', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                            {qa.question_text}
                                        </span>
                                    </div>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexShrink: 0 }}>
                                        <span style={{ fontFamily: 'var(--font-mono)', fontSize: 13, color: scoreColor, fontWeight: 600 }}>
                                            {score != null ? `${score}/10` : 'N/A'}
                                        </span>
                                        <Icon name={isOpen ? 'chevron-up' : 'chevron-down'} size={14} color="var(--text3)" />
                                    </div>
                                </button>

                                {/* Accordion body */}
                                {isOpen && (
                                    <div style={{ padding: '0 16px 16px', borderTop: '1px solid var(--border2)' }}>
                                        {qa.user_answer && (
                                            <div style={{ marginTop: 14 }}>
                                                <p style={{ fontSize: 11, color: 'var(--text3)', fontFamily: 'var(--font-mono)', marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Your Answer</p>
                                                <p style={{ fontSize: 13, color: 'var(--text2)', lineHeight: 1.6 }}>{qa.user_answer}</p>
                                            </div>
                                        )}
                                        {qa.llm_feedback && (
                                            <div style={{ marginTop: 14, background: 'var(--bg3)', borderRadius: 8, padding: '12px 14px' }}>
                                                <p style={{ fontSize: 11, color: 'var(--text3)', fontFamily: 'var(--font-mono)', marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Feedback</p>
                                                <p style={{ fontSize: 13, color: 'var(--text)', lineHeight: 1.6 }}>{qa.llm_feedback}</p>
                                            </div>
                                        )}
                                        {qa.ideal_answer && qa.ideal_answer !== 'N/A' && (
                                            <div style={{ marginTop: 12, background: 'rgba(34,197,94,0.05)', border: '1px solid rgba(34,197,94,0.15)', borderRadius: 8, padding: '12px 14px' }}>
                                                <p style={{ fontSize: 11, color: '#22c55e', fontFamily: 'var(--font-mono)', marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Ideal Answer</p>
                                                <p style={{ fontSize: 13, color: 'var(--text2)', lineHeight: 1.6 }}>{qa.ideal_answer}</p>
                                            </div>
                                        )}
                                    </div>
                                )}
                            </div>
                        );
                    })}
                </div>
            </div>
        </div>
    );
}
