import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { matchJob, getMatches } from '../api/jobs';
import { listResumes } from '../api/resume';
import { useNotify } from '../hooks/useNotify';

// ── Helpers ───────────────────────────────────────────────────────────────

function scoreColor(score) {
    if (score >= 70) return '#22c55e';
    if (score >= 40) return '#f59e0b';
    return '#ef4444';
}

function scoreLabel(score) {
    if (score >= 70) return 'Strong Match';
    if (score >= 40) return 'Partial Match';
    return 'Weak Match';
}

function bulletForSkill(skill) {
    const templates = [
        `• Built and deployed a production system using ${skill}, improving reliability and cutting manual effort.`,
        `• Integrated ${skill} into the core workflow, enabling the team to ship features 30% faster.`,
        `• Applied ${skill} to solve a high-priority technical challenge, delivering measurable business impact.`,
        `• Designed a scalable solution leveraging ${skill}, adopted across the engineering organisation.`,
        `• Led migration to ${skill}, reducing infrastructure costs and improving system observability.`,
    ];
    // deterministic selection based on skill name length
    return templates[skill.length % templates.length];
}

function formatDate(iso) {
    if (!iso) return '—';
    return new Date(iso).toLocaleDateString('en-US', {
        month: 'short', day: 'numeric', year: 'numeric',
    });
}

// ── Sub-components ────────────────────────────────────────────────────────

function SkillBadge({ label, variant }) {
    const isMatch = variant === 'match';
    return (
        <span style={{
            display: 'inline-flex', alignItems: 'center',
            padding: '4px 12px',
            borderRadius: 100,
            fontSize: 12,
            fontFamily: 'var(--font-mono)',
            background: isMatch ? 'rgba(34,197,94,0.12)' : 'rgba(239,68,68,0.12)',
            color: isMatch ? '#22c55e' : '#ef4444',
            border: `1px solid ${isMatch ? 'rgba(34,197,94,0.25)' : 'rgba(239,68,68,0.25)'}`,
        }}>
            {isMatch ? '✓ ' : '✗ '}{label}
        </span>
    );
}

function CopyButton({ text }) {
    const [copied, setCopied] = useState(false);
    const handle = async () => {
        try {
            await navigator.clipboard.writeText(text);
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
        } catch { /* clipboard unavailable */ }
    };
    return (
        <button
            onClick={handle}
            style={{
                padding: '3px 10px', fontSize: 11,
                background: copied ? 'rgba(34,197,94,0.12)' : 'rgba(255,255,255,0.06)',
                border: `1px solid ${copied ? 'rgba(34,197,94,0.25)' : 'rgba(255,255,255,0.1)'}`,
                borderRadius: 6, cursor: 'pointer',
                color: copied ? '#22c55e' : 'var(--text3)',
                fontFamily: 'var(--font-mono)',
                flexShrink: 0,
                transition: 'all 0.15s',
            }}
        >
            {copied ? '✓ Copied' : 'Copy'}
        </button>
    );
}

// ── Main page ─────────────────────────────────────────────────────────────

export default function JobMatchPage() {
    const navigate = useNavigate();
    const notify = useNotify();

    const [resumes, setResumes] = useState([]);
    const [selectedResumeId, setSelectedResumeId] = useState('');
    const [mode, setMode] = useState('text');   // 'text' | 'url'
    const [jdText, setJdText] = useState('');
    const [jdUrl, setJdUrl] = useState('');
    const [result, setResult] = useState(null);
    const [history, setHistory] = useState([]);
    const [submitting, setSubmitting] = useState(false);
    const [pageLoading, setPageLoading] = useState(true);

    useEffect(() => {
        Promise.all([listResumes(), getMatches()])
            .then(([r, m]) => {
                const resumeList = r || [];
                setResumes(resumeList);
                if (resumeList.length > 0) setSelectedResumeId(String(resumeList[0].id));
                setHistory(m || []);
            })
            .catch(err => notify(err.message || 'Failed to load data', 'error'))
            .finally(() => setPageLoading(false));
    }, [notify]);

    const handleSubmit = async () => {
        if (!selectedResumeId) {
            notify('Select a resume first', 'error');
            return;
        }
        const body = { resume_id: Number(selectedResumeId) };
        if (mode === 'url') {
            if (!jdUrl.trim()) { notify('Enter a URL', 'error'); return; }
            body.jd_url = jdUrl.trim();
        } else {
            if (jdText.trim().length < 20) { notify('Paste a job description (at least 20 characters)', 'error'); return; }
            body.jd_text = jdText.trim();
        }

        setSubmitting(true);
        try {
            const data = await matchJob(body);
            setResult(data);
            // Prepend to history without refetching
            const preview = mode === 'text'
                ? (jdText.trim().split('\n').find(l => l.trim()) || '').slice(0, 80)
                : jdUrl;
            setHistory(prev => [{
                ...data,
                jd_preview: preview,
                matched_skills: data.matched_skills,
                missing_skills: data.missing_skills,
            }, ...prev]);
        } catch (err) {
            notify(err.message || 'Match failed', 'error');
        } finally {
            setSubmitting(false);
        }
    };

    if (pageLoading) {
        return (
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '60vh' }}>
                <span style={{ color: 'var(--text3)', fontFamily: 'var(--font-mono)', fontSize: 14 }}>
                    Loading…
                </span>
            </div>
        );
    }

    return (
        <div style={{ paddingBottom: 64 }}>

            {/* ── Page header ───────────────────────────────────────── */}
            <div style={{ marginBottom: 28 }}>
                <span style={{
                    fontFamily: 'var(--font-mono)', fontSize: 11,
                    color: 'var(--cyan)', letterSpacing: 3,
                    textTransform: 'uppercase', display: 'block', marginBottom: 6,
                }}>
                    CAREER MATCHER
                </span>
                <h1 style={{
                    fontFamily: 'var(--font-display)', fontSize: 32,
                    fontWeight: 800, color: 'white', margin: 0,
                }}>
                    Job Description Match
                </h1>
                <p style={{ color: 'var(--text3)', fontSize: 14, marginTop: 6 }}>
                    Paste a job description or URL to see how well your resume matches — and exactly what to add.
                </p>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 340px', gap: 24, alignItems: 'start' }}>

                {/* ── Left column: input + results ──────────────────── */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>

                    {/* Input card */}
                    <div style={{
                        background: 'var(--bg2)', border: '1px solid var(--border)',
                        borderRadius: 16, padding: 28,
                    }}>
                        <h3 style={{
                            fontFamily: 'var(--font-display)', fontSize: 16,
                            fontWeight: 600, color: 'white', marginBottom: 20,
                        }}>
                            Match Settings
                        </h3>

                        {/* Resume selector */}
                        <div style={{ marginBottom: 18 }}>
                            <label style={{
                                display: 'block', fontSize: 12,
                                color: 'var(--text3)', fontFamily: 'var(--font-mono)',
                                textTransform: 'uppercase', letterSpacing: 1.5, marginBottom: 8,
                            }}>
                                Resume
                            </label>
                            {resumes.length === 0 ? (
                                <div style={{
                                    padding: '12px 16px', borderRadius: 10,
                                    background: 'var(--bg3)',
                                    border: '1px solid var(--border)',
                                    color: 'var(--text3)', fontSize: 14,
                                }}>
                                    No resumes uploaded.{' '}
                                    <span
                                        onClick={() => navigate('/upload')}
                                        style={{ color: '#9333ea', cursor: 'pointer' }}
                                    >
                                        Upload one →
                                    </span>
                                </div>
                            ) : (
                                <select
                                    value={selectedResumeId}
                                    onChange={e => setSelectedResumeId(e.target.value)}
                                    style={{
                                        width: '100%', padding: '10px 14px',
                                        background: 'var(--bg3)',
                                        border: '1px solid var(--border)',
                                        borderRadius: 10, color: 'white',
                                        fontFamily: 'var(--font-body)', fontSize: 14,
                                        cursor: 'pointer', outline: 'none',
                                    }}
                                >
                                    {resumes.map(r => (
                                        <option key={r.id} value={r.id}>
                                            {r.filename}
                                        </option>
                                    ))}
                                </select>
                            )}
                        </div>

                        {/* Mode toggle */}
                        <div style={{ marginBottom: 18 }}>
                            <label style={{
                                display: 'block', fontSize: 12,
                                color: 'var(--text3)', fontFamily: 'var(--font-mono)',
                                textTransform: 'uppercase', letterSpacing: 1.5, marginBottom: 8,
                            }}>
                                Input Mode
                            </label>
                            <div style={{ display: 'flex', gap: 8 }}>
                                {[
                                    { key: 'text', label: 'Paste Text' },
                                    { key: 'url', label: 'Paste URL' },
                                ].map(({ key, label }) => (
                                    <button
                                        key={key}
                                        onClick={() => setMode(key)}
                                        style={{
                                            padding: '8px 20px', borderRadius: 8,
                                            fontFamily: 'var(--font-body)', fontSize: 13,
                                            cursor: 'pointer', transition: 'all 0.15s',
                                            background: mode === key ? 'rgba(147,51,234,0.2)' : 'var(--bg3)',
                                            border: `1px solid ${mode === key ? 'rgba(147,51,234,0.5)' : 'var(--border)'}`,
                                            color: mode === key ? '#a855f7' : 'var(--text2)',
                                            fontWeight: mode === key ? 500 : 400,
                                        }}
                                    >
                                        {label}
                                    </button>
                                ))}
                            </div>
                        </div>

                        {/* JD input */}
                        {mode === 'text' ? (
                            <div style={{ marginBottom: 20 }}>
                                <label style={{
                                    display: 'block', fontSize: 12,
                                    color: 'var(--text3)', fontFamily: 'var(--font-mono)',
                                    textTransform: 'uppercase', letterSpacing: 1.5, marginBottom: 8,
                                }}>
                                    Job Description
                                </label>
                                <textarea
                                    value={jdText}
                                    onChange={e => setJdText(e.target.value)}
                                    placeholder="Paste the full job description here…"
                                    rows={10}
                                    style={{
                                        width: '100%', padding: '12px 14px',
                                        background: 'var(--bg3)',
                                        border: '1px solid var(--border)',
                                        borderRadius: 10, color: 'white',
                                        fontFamily: 'var(--font-body)', fontSize: 14,
                                        resize: 'vertical', outline: 'none',
                                        lineHeight: 1.6, boxSizing: 'border-box',
                                    }}
                                    onFocus={e => { e.target.style.borderColor = 'rgba(147,51,234,0.5)'; }}
                                    onBlur={e => { e.target.style.borderColor = 'var(--border)'; }}
                                />
                                <p style={{ fontSize: 11, color: 'var(--text3)', marginTop: 6 }}>
                                    {jdText.length} characters · longer descriptions give more accurate results
                                </p>
                            </div>
                        ) : (
                            <div style={{ marginBottom: 20 }}>
                                <label style={{
                                    display: 'block', fontSize: 12,
                                    color: 'var(--text3)', fontFamily: 'var(--font-mono)',
                                    textTransform: 'uppercase', letterSpacing: 1.5, marginBottom: 8,
                                }}>
                                    Job Posting URL
                                </label>
                                <div style={{ display: 'flex', gap: 10 }}>
                                    <input
                                        type="url"
                                        value={jdUrl}
                                        onChange={e => setJdUrl(e.target.value)}
                                        placeholder="https://jobs.example.com/senior-engineer"
                                        style={{
                                            flex: 1, padding: '10px 14px',
                                            background: 'var(--bg3)',
                                            border: '1px solid var(--border)',
                                            borderRadius: 10, color: 'white',
                                            fontFamily: 'var(--font-body)', fontSize: 14,
                                            outline: 'none',
                                        }}
                                        onFocus={e => { e.target.style.borderColor = 'rgba(147,51,234,0.5)'; }}
                                        onBlur={e => { e.target.style.borderColor = 'var(--border)'; }}
                                    />
                                </div>
                                <p style={{ fontSize: 11, color: 'var(--text3)', marginTop: 6 }}>
                                    The backend fetches and parses the page — works on most job boards
                                </p>
                            </div>
                        )}

                        <button
                            onClick={handleSubmit}
                            disabled={submitting || resumes.length === 0}
                            style={{
                                width: '100%', padding: '12px 24px',
                                background: submitting ? 'rgba(147,51,234,0.3)' : 'rgba(147,51,234,0.9)',
                                border: '1px solid rgba(147,51,234,0.6)',
                                borderRadius: 10, color: 'white',
                                fontFamily: 'var(--font-body)', fontSize: 14,
                                fontWeight: 600, cursor: submitting ? 'not-allowed' : 'pointer',
                                transition: 'all 0.2s',
                            }}
                        >
                            {submitting ? 'Analysing…' : 'Analyse Match'}
                        </button>
                    </div>

                    {/* Results card */}
                    {result && (
                        <div style={{
                            background: 'var(--bg2)', border: '1px solid var(--border)',
                            borderRadius: 16, padding: 28,
                        }}>
                            {/* Score hero */}
                            <div style={{
                                display: 'flex', alignItems: 'center',
                                gap: 24, marginBottom: 28,
                                paddingBottom: 24,
                                borderBottom: '1px solid var(--border)',
                            }}>
                                <div style={{
                                    width: 100, height: 100, borderRadius: '50%',
                                    background: `${scoreColor(result.match_score)}18`,
                                    border: `3px solid ${scoreColor(result.match_score)}`,
                                    display: 'flex', flexDirection: 'column',
                                    alignItems: 'center', justifyContent: 'center',
                                    flexShrink: 0,
                                }}>
                                    <span style={{
                                        fontFamily: 'var(--font-mono)', fontSize: 26,
                                        fontWeight: 700, color: scoreColor(result.match_score),
                                        lineHeight: 1,
                                    }}>
                                        {Math.round(result.match_score)}
                                    </span>
                                    <span style={{ fontSize: 11, color: 'var(--text3)', marginTop: 2 }}>
                                        /100
                                    </span>
                                </div>
                                <div>
                                    <div style={{
                                        fontFamily: 'var(--font-display)', fontSize: 20,
                                        fontWeight: 700, color: scoreColor(result.match_score),
                                        marginBottom: 6,
                                    }}>
                                        {scoreLabel(result.match_score)}
                                    </div>
                                    <div style={{ fontSize: 14, color: 'var(--text2)' }}>
                                        {result.matched_skills.length} of{' '}
                                        {result.matched_skills.length + result.missing_skills.length} required skills found in your resume
                                    </div>
                                    {result.missing_skills.length === 0 && (
                                        <div style={{ fontSize: 13, color: '#22c55e', marginTop: 6 }}>
                                            Your resume covers all detected skills for this role.
                                        </div>
                                    )}
                                </div>
                            </div>

                            {/* Matched skills */}
                            {result.matched_skills.length > 0 && (
                                <div style={{ marginBottom: 24 }}>
                                    <p style={{
                                        fontSize: 12, color: 'var(--text3)',
                                        fontFamily: 'var(--font-mono)',
                                        textTransform: 'uppercase', letterSpacing: 1.5,
                                        marginBottom: 12,
                                    }}>
                                        Skills You Have ({result.matched_skills.length})
                                    </p>
                                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                                        {result.matched_skills.map(s => (
                                            <SkillBadge key={s} label={s} variant="match" />
                                        ))}
                                    </div>
                                </div>
                            )}

                            {/* Missing skills */}
                            {result.missing_skills.length > 0 && (
                                <div style={{ marginBottom: 24 }}>
                                    <p style={{
                                        fontSize: 12, color: 'var(--text3)',
                                        fontFamily: 'var(--font-mono)',
                                        textTransform: 'uppercase', letterSpacing: 1.5,
                                        marginBottom: 12,
                                    }}>
                                        Skills to Add ({result.missing_skills.length})
                                    </p>
                                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                                        {result.missing_skills.map(s => (
                                            <SkillBadge key={s} label={s} variant="missing" />
                                        ))}
                                    </div>
                                </div>
                            )}

                            {/* What to add */}
                            {result.missing_skills.length > 0 && (
                                <div style={{
                                    marginTop: 8, padding: 20,
                                    background: 'var(--bg3)',
                                    borderRadius: 12,
                                    border: '1px solid var(--border)',
                                }}>
                                    <p style={{
                                        fontSize: 12, color: 'var(--text3)',
                                        fontFamily: 'var(--font-mono)',
                                        textTransform: 'uppercase', letterSpacing: 1.5,
                                        marginBottom: 16,
                                    }}>
                                        Ready-to-Paste Bullet Points
                                    </p>
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                                        {result.missing_skills.map(skill => {
                                            const bullet = bulletForSkill(skill);
                                            return (
                                                <div key={skill} style={{
                                                    padding: '12px 16px',
                                                    background: 'rgba(239,68,68,0.05)',
                                                    border: '1px solid rgba(239,68,68,0.15)',
                                                    borderRadius: 8,
                                                }}>
                                                    <div style={{
                                                        display: 'flex',
                                                        justifyContent: 'space-between',
                                                        alignItems: 'flex-start',
                                                        gap: 12,
                                                    }}>
                                                        <div>
                                                            <span style={{
                                                                fontFamily: 'var(--font-mono)',
                                                                fontSize: 11, color: '#ef4444',
                                                                textTransform: 'uppercase',
                                                                letterSpacing: 1.5,
                                                                display: 'block', marginBottom: 6,
                                                            }}>
                                                                {skill}
                                                            </span>
                                                            <p style={{
                                                                fontSize: 13, color: 'var(--text)',
                                                                fontFamily: 'var(--font-body)',
                                                                lineHeight: 1.6, margin: 0,
                                                            }}>
                                                                {bullet}
                                                            </p>
                                                        </div>
                                                        <CopyButton text={bullet} />
                                                    </div>
                                                </div>
                                            );
                                        })}
                                    </div>
                                </div>
                            )}
                        </div>
                    )}
                </div>

                {/* ── Right column: history ──────────────────────────── */}
                <div style={{
                    background: 'var(--bg2)', border: '1px solid var(--border)',
                    borderRadius: 16, padding: 24,
                    position: 'sticky', top: 20,
                }}>
                    <h3 style={{
                        fontFamily: 'var(--font-display)', fontSize: 15,
                        fontWeight: 600, color: 'white', marginBottom: 18,
                    }}>
                        Recent Matches
                    </h3>

                    {history.length === 0 ? (
                        <div style={{
                            textAlign: 'center', padding: '32px 0',
                            color: 'var(--text3)', fontSize: 13,
                        }}>
                            No matches yet. Run your first analysis above.
                        </div>
                    ) : (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                            {history.slice(0, 5).map((m, i) => (
                                <div
                                    key={m.match_id ?? i}
                                    style={{
                                        padding: '14px 16px',
                                        background: 'var(--bg3)',
                                        border: '1px solid var(--border)',
                                        borderRadius: 10,
                                        cursor: 'default',
                                    }}
                                >
                                    <div style={{
                                        display: 'flex',
                                        justifyContent: 'space-between',
                                        alignItems: 'flex-start',
                                        gap: 8, marginBottom: 6,
                                    }}>
                                        <span style={{
                                            fontFamily: 'var(--font-mono)', fontSize: 22,
                                            fontWeight: 700,
                                            color: scoreColor(m.match_score),
                                            lineHeight: 1,
                                        }}>
                                            {Math.round(m.match_score)}%
                                        </span>
                                        <span style={{
                                            fontSize: 11, color: 'var(--text3)',
                                            fontFamily: 'var(--font-mono)',
                                        }}>
                                            {formatDate(m.created_at)}
                                        </span>
                                    </div>
                                    {m.jd_preview && (
                                        <p style={{
                                            fontSize: 12, color: 'var(--text2)',
                                            fontFamily: 'var(--font-body)',
                                            lineHeight: 1.4, margin: '0 0 8px',
                                            overflow: 'hidden',
                                            display: '-webkit-box',
                                            WebkitLineClamp: 2,
                                            WebkitBoxOrient: 'vertical',
                                        }}>
                                            {m.jd_preview}
                                        </p>
                                    )}
                                    <div style={{
                                        display: 'flex', gap: 8, flexWrap: 'wrap',
                                    }}>
                                        <span style={{
                                            fontSize: 11, padding: '2px 8px',
                                            background: 'rgba(34,197,94,0.1)',
                                            color: '#22c55e',
                                            border: '1px solid rgba(34,197,94,0.2)',
                                            borderRadius: 100,
                                            fontFamily: 'var(--font-mono)',
                                        }}>
                                            {(m.matched_skills || []).length} matched
                                        </span>
                                        <span style={{
                                            fontSize: 11, padding: '2px 8px',
                                            background: 'rgba(239,68,68,0.1)',
                                            color: '#ef4444',
                                            border: '1px solid rgba(239,68,68,0.2)',
                                            borderRadius: 100,
                                            fontFamily: 'var(--font-mono)',
                                        }}>
                                            {(m.missing_skills || []).length} missing
                                        </span>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
