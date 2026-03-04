import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
    LineChart, Line, XAxis, YAxis, CartesianGrid,
    Tooltip, ResponsiveContainer, ReferenceLine, Dot,
} from 'recharts';
import { getHistory } from '../api/resume';
import { useNotify } from '../hooks/useNotify';
import PageHeader from '../components/layout/PageHeader';
import Card from '../components/ui/Card';
import Spinner from '../components/ui/Spinner';
import EmptyState from '../components/ui/EmptyState';
import Button from '../components/ui/Button';

// ── Custom tooltip shown when hovering a chart point ─────────────────────────
function ChartTooltip({ active, payload }) {
    if (!active || !payload?.length) return null;
    const d = payload[0].payload;

    return (
        <div style={{
            background: '#16181d',
            border: '1px solid rgba(255,255,255,0.1)',
            borderRadius: 10,
            padding: '12px 16px',
            minWidth: 180,
        }}>
            <div style={{
                fontFamily: 'var(--font-mono)',
                fontSize: 11, color: 'var(--text3)',
                textTransform: 'uppercase', letterSpacing: 2,
                marginBottom: 6,
            }}>
                {d.version_label}
            </div>
            <div style={{
                fontFamily: 'var(--font-mono)',
                fontSize: 28, fontWeight: 700,
                color: scoreColor(d.ats_score),
                lineHeight: 1,
            }}>
                {d.ats_score ?? '—'}
                <span style={{ fontSize: 14, opacity: 0.5 }}>/100</span>
            </div>
            {d.delta !== null && d.delta !== undefined && (
                <div style={{
                    fontSize: 12, marginTop: 6,
                    color: d.delta >= 0 ? 'var(--green)' : 'var(--coral)',
                    fontFamily: 'var(--font-mono)',
                }}>
                    {d.delta >= 0 ? '▲' : '▼'} {Math.abs(d.delta)} pts vs previous
                </div>
            )}
            {d.new_skills?.length > 0 && (
                <div style={{ marginTop: 8 }}>
                    <div style={{ fontSize: 11, color: 'var(--text3)', marginBottom: 4 }}>
                        New skills detected:
                    </div>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
                        {d.new_skills.map(s => (
                            <span key={s} style={{
                                fontSize: 10, padding: '2px 8px',
                                background: 'rgba(0,255,136,0.12)',
                                color: 'var(--green)',
                                border: '1px solid rgba(0,255,136,0.2)',
                                borderRadius: 100,
                                fontFamily: 'var(--font-mono)',
                            }}>
                                {s}
                            </span>
                        ))}
                    </div>
                </div>
            )}
            <div style={{
                marginTop: 10, fontSize: 11,
                color: 'var(--text3)',
                fontFamily: 'var(--font-mono)',
            }}>
                {d.uploaded_at ? new Date(d.uploaded_at).toLocaleDateString('en-US', {
                    month: 'short', day: 'numeric', year: 'numeric',
                }) : '—'}
            </div>
        </div>
    );
}

// ── Custom active dot on the line chart ───────────────────────────────────────
function ActiveDot(props) {
    const { cx, cy, payload } = props;
    return (
        <circle
            cx={cx} cy={cy} r={6}
            fill={scoreColor(payload.ats_score)}
            stroke="#0a0a0a"
            strokeWidth={2}
        />
    );
}

function scoreColor(score) {
    if (score === null || score === undefined) return 'var(--text3)';
    if (score >= 75) return 'var(--green)';
    if (score >= 50) return '#f59e0b';
    return 'var(--coral)';
}

function deltaDisplay(delta) {
    if (delta === null || delta === undefined) return { text: '—', color: 'var(--text3)' };
    if (delta > 0) return { text: `▲ +${delta}`, color: 'var(--green)' };
    if (delta < 0) return { text: `▼ ${delta}`, color: 'var(--coral)' };
    return { text: '= 0', color: 'var(--text3)' };
}

export default function HistoryPage() {
    const [history, setHistory] = useState(null);
    const [loading, setLoading] = useState(true);
    const navigate = useNavigate();
    const notify = useNotify();

    useEffect(() => {
        getHistory()
            .then(data => setHistory(data))
            .catch(err => notify(err.message || 'Failed to load history', 'error'))
            .finally(() => setLoading(false));
    }, [notify]);

    if (loading) {
        return (
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%' }}>
                <Spinner size={40} />
            </div>
        );
    }

    // Filter to entries that have an ATS score (upload may not have analysis yet)
    const scored = (history || []).filter(r => r.ats_score !== null);

    if (!history || scored.length === 0) {
        return (
            <div style={{ padding: '32px 0' }}>
                <PageHeader
                    eyebrow="PROGRESS TRACKER"
                    title="Score History"
                    subtitle="Upload multiple resume versions to track your ATS score improvement over time."
                />
                <EmptyState
                    emoji="📈"
                    title="No History Yet"
                    description="Upload your first resume to start tracking your ATS score progress."
                    action={{ label: 'Upload Resume', onClick: () => navigate('/upload') }}
                />
            </div>
        );
    }

    const latest = scored[scored.length - 1];
    const first = scored[0];
    const totalGain = scored.length >= 2
        ? Math.round(latest.ats_score - first.ats_score)
        : null;
    const bestScore = Math.max(...scored.map(r => r.ats_score));

    return (
        <div style={{ padding: '0 0 64px' }}>
            <PageHeader
                eyebrow="PROGRESS TRACKER"
                title="Score History"
                subtitle={`${scored.length} version${scored.length > 1 ? 's' : ''} · tracking your ATS improvement`}
                rightSlot={
                    <Button variant="primary" onClick={() => navigate('/upload')}>
                        Upload New Version
                    </Button>
                }
            />

            {/* ── Summary stat strip ─────────────────────────────────── */}
            <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(4, 1fr)',
                gap: 16,
                marginBottom: 28,
            }}>
                {[
                    { label: 'Versions', value: scored.length, color: '#9333ea' },
                    { label: 'Latest Score', value: `${Math.round(latest.ats_score)}/100`, color: scoreColor(latest.ats_score) },
                    { label: 'Best Score', value: `${Math.round(bestScore)}/100`, color: 'var(--green)' },
                    {
                        label: 'Total Gain',
                        value: totalGain !== null
                            ? `${totalGain >= 0 ? '+' : ''}${totalGain} pts`
                            : '—',
                        color: totalGain >= 0 ? 'var(--green)' : 'var(--coral)',
                    },
                ].map(stat => (
                    <div key={stat.label} style={{
                        background: 'var(--bg2)',
                        border: '1px solid var(--border)',
                        borderRadius: 14,
                        padding: '20px 22px',
                    }}>
                        <p style={{ fontSize: 12, color: 'var(--text3)', marginBottom: 8 }}>
                            {stat.label}
                        </p>
                        <p style={{
                            fontFamily: 'var(--font-mono)',
                            fontSize: 26, fontWeight: 600,
                            color: stat.color,
                        }}>
                            {stat.value}
                        </p>
                    </div>
                ))}
            </div>

            {/* ── Line chart ─────────────────────────────────────────── */}
            <div style={{
                background: 'var(--bg2)',
                border: '1px solid var(--border)',
                borderRadius: 16,
                padding: '28px 24px',
                marginBottom: 28,
            }}>
                <div style={{
                    display: 'flex', justifyContent: 'space-between',
                    alignItems: 'center', marginBottom: 24,
                }}>
                    <div>
                        <h3 style={{
                            fontFamily: 'var(--font-display)',
                            fontSize: 16, fontWeight: 600, color: 'white',
                        }}>
                            ATS Score Over Time
                        </h3>
                        <p style={{ fontSize: 12, color: 'var(--text3)', marginTop: 4 }}>
                            Hover over a point for details
                        </p>
                    </div>
                    <div style={{ display: 'flex', gap: 20 }}>
                        {[
                            { label: '≥75 Excellent', color: 'var(--green)' },
                            { label: '50–74 Good', color: '#f59e0b' },
                            { label: '<50 Needs Work', color: 'var(--coral)' },
                        ].map(l => (
                            <div key={l.label} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                                <div style={{
                                    width: 8, height: 8, borderRadius: '50%',
                                    background: l.color, flexShrink: 0,
                                }} />
                                <span style={{ fontSize: 11, color: 'var(--text3)' }}>{l.label}</span>
                            </div>
                        ))}
                    </div>
                </div>

                <ResponsiveContainer width="100%" height={280}>
                    <LineChart
                        data={scored}
                        margin={{ top: 10, right: 20, left: 0, bottom: 0 }}
                    >
                        <CartesianGrid
                            strokeDasharray="3 3"
                            stroke="rgba(255,255,255,0.05)"
                            vertical={false}
                        />
                        <XAxis
                            dataKey="version_label"
                            tick={{ fill: 'var(--text3)', fontSize: 12, fontFamily: 'var(--font-mono)' }}
                            axisLine={{ stroke: 'rgba(255,255,255,0.08)' }}
                            tickLine={false}
                        />
                        <YAxis
                            domain={[0, 100]}
                            ticks={[0, 25, 50, 75, 100]}
                            tick={{ fill: 'var(--text3)', fontSize: 11, fontFamily: 'var(--font-mono)' }}
                            axisLine={false}
                            tickLine={false}
                            width={32}
                        />
                        {/* Threshold reference lines */}
                        <ReferenceLine
                            y={75} stroke="rgba(0,255,136,0.15)"
                            strokeDasharray="6 3"
                            label={{ value: 'Excellent', position: 'right', fill: 'rgba(0,255,136,0.4)', fontSize: 10 }}
                        />
                        <ReferenceLine
                            y={50} stroke="rgba(245,158,11,0.15)"
                            strokeDasharray="6 3"
                            label={{ value: 'Good', position: 'right', fill: 'rgba(245,158,11,0.4)', fontSize: 10 }}
                        />
                        <Tooltip content={<ChartTooltip />} cursor={{ stroke: 'rgba(255,255,255,0.08)', strokeWidth: 1 }} />
                        <Line
                            type="monotone"
                            dataKey="ats_score"
                            stroke="#9333ea"
                            strokeWidth={2.5}
                            dot={({ cx, cy, payload }) => (
                                <circle
                                    key={`dot-${payload.resume_id}`}
                                    cx={cx} cy={cy} r={5}
                                    fill={scoreColor(payload.ats_score)}
                                    stroke="#0a0a0a"
                                    strokeWidth={2}
                                />
                            )}
                            activeDot={<ActiveDot />}
                            connectNulls={false}
                        />
                    </LineChart>
                </ResponsiveContainer>
            </div>

            {/* ── Version table ──────────────────────────────────────── */}
            <div style={{
                background: 'var(--bg2)',
                border: '1px solid var(--border)',
                borderRadius: 16,
                overflow: 'hidden',
            }}>
                <div style={{ padding: '20px 24px', borderBottom: '1px solid var(--border)' }}>
                    <h3 style={{
                        fontFamily: 'var(--font-display)',
                        fontSize: 16, fontWeight: 600, color: 'white',
                    }}>
                        All Versions
                    </h3>
                </div>

                {/* Table header */}
                <div style={{
                    display: 'grid',
                    gridTemplateColumns: '72px 1fr 160px 100px 100px 120px',
                    padding: '10px 24px',
                    borderBottom: '1px solid var(--border)',
                }}>
                    {['Version', 'File', 'Date', 'Score', 'Change', ''].map(h => (
                        <span key={h} style={{
                            fontSize: 11, color: 'var(--text3)',
                            fontFamily: 'var(--font-mono)',
                            textTransform: 'uppercase', letterSpacing: 1.5,
                        }}>
                            {h}
                        </span>
                    ))}
                </div>

                {/* Table rows — newest first */}
                {[...history].reverse().map((row, idx) => {
                    const { text: deltaText, color: deltaColor } = deltaDisplay(row.delta);
                    const isLatest = row.resume_id === latest.resume_id;

                    return (
                        <div
                            key={row.resume_id}
                            onClick={() => navigate('/analysis', { state: { resumeId: row.resume_id } })}
                            style={{
                                display: 'grid',
                                gridTemplateColumns: '72px 1fr 160px 100px 100px 120px',
                                padding: '16px 24px',
                                borderBottom: idx < history.length - 1
                                    ? '1px solid var(--border2)' : 'none',
                                cursor: 'pointer',
                                transition: 'background 0.15s',
                                alignItems: 'center',
                            }}
                            onMouseEnter={e => {
                                e.currentTarget.style.background = 'rgba(147,51,234,0.05)';
                            }}
                            onMouseLeave={e => {
                                e.currentTarget.style.background = 'transparent';
                            }}
                        >
                            {/* Version badge */}
                            <div style={{
                                display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                                width: 40, height: 24,
                                background: isLatest
                                    ? 'rgba(147,51,234,0.2)'
                                    : 'rgba(255,255,255,0.06)',
                                border: `1px solid ${isLatest ? 'rgba(147,51,234,0.4)' : 'rgba(255,255,255,0.1)'}`,
                                borderRadius: 6,
                                fontFamily: 'var(--font-mono)',
                                fontSize: 11, fontWeight: 600,
                                color: isLatest ? '#a855f7' : 'var(--text2)',
                            }}>
                                {row.version_label}
                            </div>

                            {/* Filename */}
                            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                <span style={{
                                    fontSize: 14, color: 'white',
                                    maxWidth: 220,
                                    overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                                }}>
                                    {row.filename}
                                </span>
                                {isLatest && (
                                    <span style={{
                                        fontSize: 10, padding: '2px 7px',
                                        background: 'rgba(147,51,234,0.15)',
                                        color: '#a855f7',
                                        border: '1px solid rgba(147,51,234,0.25)',
                                        borderRadius: 100,
                                        fontFamily: 'var(--font-mono)',
                                        whiteSpace: 'nowrap',
                                    }}>
                                        Latest
                                    </span>
                                )}
                            </div>

                            {/* Date */}
                            <span style={{
                                fontSize: 13, color: 'var(--text3)',
                                fontFamily: 'var(--font-mono)',
                            }}>
                                {row.uploaded_at
                                    ? new Date(row.uploaded_at).toLocaleDateString('en-US', {
                                        month: 'short', day: 'numeric', year: 'numeric',
                                    })
                                    : '—'}
                            </span>

                            {/* Score */}
                            <span style={{
                                fontFamily: 'var(--font-mono)',
                                fontSize: 15, fontWeight: 600,
                                color: scoreColor(row.ats_score),
                            }}>
                                {row.ats_score !== null ? Math.round(row.ats_score) : '—'}
                            </span>

                            {/* Delta */}
                            <span style={{
                                fontFamily: 'var(--font-mono)',
                                fontSize: 13, fontWeight: 500,
                                color: deltaColor,
                            }}>
                                {deltaText}
                            </span>

                            {/* Action */}
                            <button
                                onClick={e => {
                                    e.stopPropagation();
                                    navigate('/analysis', { state: { resumeId: row.resume_id } });
                                }}
                                style={{
                                    fontSize: 12, padding: '5px 14px',
                                    background: 'rgba(147,51,234,0.1)',
                                    color: '#a855f7',
                                    border: '1px solid rgba(147,51,234,0.2)',
                                    borderRadius: 6, cursor: 'pointer',
                                    fontFamily: 'var(--font-body)',
                                    transition: 'all 0.15s',
                                    whiteSpace: 'nowrap',
                                }}
                                onMouseEnter={e => {
                                    e.currentTarget.style.background = 'rgba(147,51,234,0.2)';
                                }}
                                onMouseLeave={e => {
                                    e.currentTarget.style.background = 'rgba(147,51,234,0.1)';
                                }}
                            >
                                View Analysis
                            </button>
                        </div>
                    );
                })}
            </div>
        </div>
    );
}
