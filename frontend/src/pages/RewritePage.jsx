import { useEffect, useState, useCallback, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { getRewrite, generateRewrite, previewUpdatedResume, exportUpdatedResume } from '../api/resume';
import { useNotify } from '../hooks/useNotify';
import PageHeader from '../components/layout/PageHeader';
import Card from '../components/ui/Card';
import Badge from '../components/ui/Badge';
import Button from '../components/ui/Button';
import Spinner from '../components/ui/Spinner';
import EmptyState from '../components/ui/EmptyState';

const SEVERITY_CONFIG = {
    high:   { label: 'High Impact',    variant: 'error'   },
    medium: { label: 'Medium Impact',  variant: 'warning' },
    low:    { label: 'Nice to Have',   variant: 'info'    },
};

const SECTION_COLORS = {
    Experience: 'text-cyan',
    Projects:   'text-green',
    Skills:     'text-gold',
    Summary:    'text-coral',
    Education:  'text-text2',
};

function SuggestionCard({ suggestion, index, applied, onToggleApplied }) {
    const [copied, setCopied] = useState(false);
    const severityCfg = SEVERITY_CONFIG[suggestion.severity] || SEVERITY_CONFIG.medium;
    const sectionColor = SECTION_COLORS[suggestion.section] || 'text-text2';

    const handleCopy = async () => {
        try {
            await navigator.clipboard.writeText(suggestion.improved);
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
        } catch {
            // clipboard API may be unavailable in some contexts
        }
    };

    return (
        <div
            className={`glass-card fade-up-${Math.min(index + 1, 5)} transition-opacity`}
            style={{
                padding: '24px',
                opacity: applied ? 0.55 : 1,
            }}
        >
            {/* Card header */}
            <div className="flex items-center justify-between mb-16" style={{ flexWrap: 'wrap', gap: '8px' }}>
                <div className="flex items-center gap-12">
                    <span className={`font-mono text-xs tracking-wider uppercase font-semibold ${sectionColor}`}>
                        {suggestion.section}
                    </span>
                    <Badge label={severityCfg.label} variant={severityCfg.variant} />
                    {applied && (
                        <Badge label="Applied ✓" variant="success" />
                    )}
                </div>
            </div>

            {/* Reason */}
            <p className="font-body text-[13px] text-text3 italic mb-20" style={{ lineHeight: '1.6' }}>
                {suggestion.reason}
            </p>

            {/* Diff row */}
            <div
                className="flex gap-16 mb-20"
                style={{ flexWrap: 'wrap' }}
            >
                {/* Current (red) */}
                <div className="flex-1" style={{ minWidth: '220px' }}>
                    <div
                        className="font-mono text-[10px] tracking-widest uppercase mb-8"
                        style={{ color: 'var(--coral)' }}
                    >
                        Current
                    </div>
                    <div
                        className="font-body text-[13px] text-text2 rounded-xl p-16"
                        style={{
                            background: 'rgba(255, 90, 90, 0.06)',
                            border: '1px solid rgba(255, 90, 90, 0.25)',
                            lineHeight: '1.65',
                            minHeight: '72px',
                            whiteSpace: 'pre-wrap',
                        }}
                    >
                        {suggestion.current}
                    </div>
                </div>

                {/* Arrow */}
                <div
                    className="flex items-center justify-center flex-shrink-0"
                    style={{ paddingTop: '28px', color: 'var(--text3)', fontSize: '18px' }}
                >
                    →
                </div>

                {/* Improved (green) */}
                <div className="flex-1" style={{ minWidth: '220px' }}>
                    <div
                        className="font-mono text-[10px] tracking-widest uppercase mb-8"
                        style={{ color: 'var(--green)' }}
                    >
                        Improved
                    </div>
                    <div
                        className="font-body text-[13px] text-text rounded-xl p-16"
                        style={{
                            background: 'rgba(0, 255, 136, 0.06)',
                            border: '1px solid rgba(0, 255, 136, 0.25)',
                            lineHeight: '1.65',
                            minHeight: '72px',
                            whiteSpace: 'pre-wrap',
                        }}
                    >
                        {suggestion.improved}
                    </div>
                </div>
            </div>

            {/* Action row */}
            <div className="flex items-center justify-end gap-12">
                <button
                    onClick={handleCopy}
                    className="btn btn-ghost btn-sm"
                    style={{ minWidth: '90px' }}
                >
                    {copied ? '✓ Copied' : 'Copy'}
                </button>
                <button
                    onClick={() => onToggleApplied(index)}
                    className={`btn btn-sm ${applied ? 'btn-ghost' : 'btn-secondary'}`}
                >
                    {applied ? 'Undo' : 'Mark Applied'}
                </button>
            </div>
        </div>
    );
}

export default function RewritePage() {
    const { resumeId } = useParams();
    const navigate = useNavigate();
    const notify = useNotify();

    const [suggestions, setSuggestions] = useState(null);   // null = not loaded yet
    const [aiAvailable, setAiAvailable] = useState(true);
    const [loading, setLoading] = useState(true);
    const [generating, setGenerating] = useState(false);
    const [applied, setApplied] = useState(new Set());      // indices of applied suggestions

    // Preview & export state
    const [checkedIndices, setCheckedIndices] = useState(new Set());
    const [previewText, setPreviewText] = useState('');
    const [previewLoading, setPreviewLoading] = useState(false);
    const previewAbortRef = useRef(null);

    const loadExisting = useCallback(async () => {
        setLoading(true);
        try {
            const data = await getRewrite(resumeId);
            // status="not_generated" means POST /rewrite has never been called
            if (data.status === 'not_generated') {
                setSuggestions(null);
            } else {
                setSuggestions(data.suggestions);
                setAiAvailable(data.ai_available ?? true);
            }
        } catch (err) {
            // 404 = resume or analysis not found (not a race condition)
            if (err.status === 404) {
                notify(err.message || 'Resume not found', 'error');
            } else {
                notify(err.message || 'Failed to load suggestions', 'error');
            }
        } finally {
            setLoading(false);
        }
    }, [resumeId, notify]);

    useEffect(() => {
        loadExisting();
    }, [loadExisting]);

    // Initialise checked state when suggestions load: HIGH+MEDIUM checked, LOW unchecked
    useEffect(() => {
        if (!suggestions) return;
        const initial = new Set(
            suggestions
                .map((s, i) => ({ s, i }))
                .filter(({ s }) => s.severity === 'high' || s.severity === 'medium')
                .map(({ i }) => i)
        );
        setCheckedIndices(initial);
        setPreviewText('');
    }, [suggestions]);

    // Fetch preview whenever checked selection changes
    useEffect(() => {
        if (!suggestions || suggestions.length === 0) return;

        // Cancel any in-flight request
        const token = {};
        previewAbortRef.current = token;

        const indices = [...checkedIndices];
        if (indices.length === 0) {
            setPreviewText('');
            return;
        }

        setPreviewLoading(true);
        previewUpdatedResume(resumeId, indices)
            .then((data) => {
                if (previewAbortRef.current !== token) return;
                setPreviewText(data.preview_text || '');
            })
            .catch(() => {
                if (previewAbortRef.current !== token) return;
                setPreviewText('');
            })
            .finally(() => {
                if (previewAbortRef.current === token) setPreviewLoading(false);
            });
    }, [checkedIndices, suggestions, resumeId]);

    const handleGenerate = async () => {
        setGenerating(true);
        try {
            const data = await generateRewrite(resumeId);
            setSuggestions(data.suggestions);
            setAiAvailable(data.ai_available ?? true);
            setApplied(new Set());
            setPreviewText('');
            if (!data.ai_available) {
                notify('AI service offline — showing template suggestions', 'warning');
            }
        } catch (err) {
            notify(err.message || 'Failed to generate suggestions', 'error');
        } finally {
            setGenerating(false);
        }
    };

    const handleToggleApplied = (index) => {
        setApplied(prev => {
            const next = new Set(prev);
            if (next.has(index)) {
                next.delete(index);
            } else {
                next.add(index);
            }
            return next;
        });
    };

    const appliedCount = applied.size;
    const totalCount = suggestions?.length ?? 0;

    // ── Loading state ──────────────────────────────────────────────
    if (loading) {
        return (
            <div className="flex-1 flex items-center justify-center h-full">
                <Spinner size={40} className="text-cyan" />
            </div>
        );
    }

    // ── Not yet generated ──────────────────────────────────────────
    if (!suggestions) {
        return (
            <div className="p-32 overflow-y-auto w-full h-full pb-64">
                <PageHeader
                    eyebrow="AI RESUME COACH"
                    title="Rewrite Suggestions"
                    subtitle="Get concrete, copy-paste-ready improvements for each skill gap in your resume."
                    rightSlot={
                        <Button variant="ghost" onClick={() => navigate(-1)}>
                            ← Back
                        </Button>
                    }
                />
                <div className="flex items-center justify-center" style={{ minHeight: '320px' }}>
                    <EmptyState
                        emoji="✍️"
                        title="No Suggestions Yet"
                        description="The AI will analyse your resume, identify every gap skill, and generate ready-to-paste bullet points and section improvements."
                        action={{
                            label: generating ? 'Generating…' : 'Generate Suggestions',
                            onClick: handleGenerate,
                        }}
                    />
                </div>
            </div>
        );
    }

    // ── Suggestions loaded ─────────────────────────────────────────
    return (
        <div className="p-32 overflow-y-auto w-full h-full pb-64">
            <PageHeader
                eyebrow="AI RESUME COACH"
                title="Rewrite Suggestions"
                subtitle={
                    <>
                        {totalCount} suggestions
                        {appliedCount > 0 && (
                            <> · <span className="text-green font-medium">{appliedCount} applied</span></>
                        )}
                        {!aiAvailable && (
                            <> · <span className="text-gold"> Template mode (AI offline)</span></>
                        )}
                    </>
                }
                rightSlot={
                    <div className="flex gap-12">
                        <Button
                            variant="ghost"
                            loading={generating}
                            onClick={handleGenerate}
                        >
                            Regenerate
                        </Button>
                        <Button variant="ghost" onClick={() => navigate(-1)}>
                            ← Back
                        </Button>
                    </div>
                }
            />

            {/* Progress indicator */}
            {totalCount > 0 && (
                <div
                    className="glass-card mb-32 fade-up-1"
                    style={{ padding: '16px 24px' }}
                >
                    <div className="flex items-center justify-between mb-10">
                        <span className="font-body text-sm text-text2">
                            Progress — {appliedCount} of {totalCount} suggestions applied
                        </span>
                        <span className="font-mono text-xs text-cyan">
                            {totalCount > 0 ? Math.round((appliedCount / totalCount) * 100) : 0}%
                        </span>
                    </div>
                    <div
                        className="rounded-full overflow-hidden"
                        style={{ height: '6px', background: 'var(--bg2)' }}
                    >
                        <div
                            className="h-full rounded-full transition-all"
                            style={{
                                width: `${totalCount > 0 ? (appliedCount / totalCount) * 100 : 0}%`,
                                background: 'var(--green)',
                            }}
                        />
                    </div>
                </div>
            )}

            {/* Suggestion cards */}
            <div className="flex flex-col gap-24">
                {suggestions.map((suggestion, index) => (
                    <SuggestionCard
                        key={index}
                        suggestion={suggestion}
                        index={index}
                        applied={applied.has(index)}
                        onToggleApplied={handleToggleApplied}
                    />
                ))}
            </div>

            {/* ── Updated Resume Preview & Export ─────────────────── */}
            {suggestions.length > 0 && (
                <div className="glass-card mt-40 fade-up-5" style={{ padding: '28px 32px' }}>
                    <div className="mb-24">
                        <h2 className="font-display font-bold text-lg text-text mb-4">
                            Your Updated Resume
                        </h2>
                        <p className="font-body text-sm text-text3">
                            Select which improvements to apply, then download your improved resume as a PDF.
                        </p>
                    </div>

                    {/* Checklist */}
                    <div className="flex flex-col gap-10 mb-28">
                        {suggestions.map((s, i) => {
                            const severityCfg = SEVERITY_CONFIG[s.severity] || SEVERITY_CONFIG.medium;
                            const checked = checkedIndices.has(i);
                            return (
                                <label
                                    key={i}
                                    className="flex items-center gap-12 cursor-pointer"
                                    style={{ userSelect: 'none' }}
                                >
                                    <input
                                        type="checkbox"
                                        checked={checked}
                                        onChange={() => {
                                            setCheckedIndices(prev => {
                                                const next = new Set(prev);
                                                if (next.has(i)) next.delete(i);
                                                else next.add(i);
                                                return next;
                                            });
                                        }}
                                        style={{ width: '16px', height: '16px', accentColor: 'var(--purple)', cursor: 'pointer' }}
                                    />
                                    <span className="font-body text-sm text-text2">
                                        <span className={`font-semibold ${SECTION_COLORS[s.section] || 'text-text2'}`}>
                                            {s.section}
                                        </span>
                                        {' — '}
                                        <Badge label={severityCfg.label} variant={severityCfg.variant} />
                                    </span>
                                </label>
                            );
                        })}
                    </div>

                    {/* Preview panel */}
                    <div className="mb-24">
                        <span
                            className="font-mono text-[10px] tracking-widest uppercase mb-8 block"
                            style={{ color: 'var(--text3)' }}
                        >
                            Preview
                        </span>
                        <div
                            style={{
                                background: '#fff',
                                color: '#111',
                                fontFamily: 'monospace',
                                fontSize: '12px',
                                lineHeight: '1.6',
                                padding: '20px',
                                border: '1px solid #333',
                                borderRadius: '8px',
                                minHeight: '180px',
                                maxHeight: '400px',
                                overflowY: 'auto',
                                whiteSpace: 'pre-wrap',
                            }}
                        >
                            {previewLoading ? (
                                <div className="flex items-center justify-center" style={{ minHeight: '120px' }}>
                                    <Spinner size={28} className="text-cyan" />
                                </div>
                            ) : checkedIndices.size === 0 ? (
                                <span style={{ color: '#999' }}>
                                    Select suggestions above to see your updated resume
                                </span>
                            ) : (
                                previewText
                            )}
                        </div>
                    </div>

                    {/* Download button */}
                    <Button
                        variant="primary"
                        disabled={checkedIndices.size === 0}
                        onClick={() => window.open(exportUpdatedResume(resumeId, [...checkedIndices]), '_blank')}
                        style={checkedIndices.size === 0 ? { opacity: 0.45, cursor: 'not-allowed' } : {}}
                    >
                        Download Updated Resume ({checkedIndices.size} improvement{checkedIndices.size === 1 ? '' : 's'} applied)
                    </Button>
                </div>
            )}

            {/* Bottom CTA */}
            <div
                className="glass-card mt-40"
                style={{ padding: '28px 32px' }}
            >
                <div className="flex items-center justify-between" style={{ flexWrap: 'wrap', gap: '16px' }}>
                    <div className="flex flex-col gap-6">
                        <span className="font-display font-bold text-lg text-text">
                            Made your changes?
                        </span>
                        <span className="font-body text-sm text-text3">
                            Upload your updated resume to see your new ATS score.
                            {appliedCount > 0 && ` You've applied ${appliedCount} suggestion${appliedCount > 1 ? 's' : ''} — expect a meaningful score increase.`}
                        </span>
                    </div>
                    <Button
                        variant="primary"
                        onClick={() => navigate('/upload')}
                    >
                        Upload Updated Resume →
                    </Button>
                </div>
            </div>
        </div>
    );
}
