import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Icon from '../ui/Icon';

const LS_KEY = 'cc_onboarding_v1';

export function useOnboarding(totalResumes) {
    const [dismissed, setDismissed] = useState(
        () => localStorage.getItem(LS_KEY) === 'done'
    );

    const dismiss = () => {
        localStorage.setItem(LS_KEY, 'done');
        setDismissed(true);
    };

    const show = !dismissed && totalResumes === 0;
    return { show, dismiss };
}

const FEATURES = [
    {
        icon: 'file',
        color: '#3b82f6',
        title: 'Resume Analysis',
        desc: 'ATS score, skill gaps, and role predictions in seconds.',
    },
    {
        icon: 'target',
        color: '#22c55e',
        title: 'Job Matching',
        desc: 'Paste any job description and see your exact match score.',
    },
    {
        icon: 'mic',
        color: '#22d3ee',
        title: 'Interview Practice',
        desc: 'AI-powered mock sessions with per-category scoring.',
    },
];

export default function OnboardingWizard({ userName, onDismiss }) {
    const [step, setStep] = useState(0);
    const navigate = useNavigate();

    const handleUpload = () => {
        onDismiss();
        navigate('/upload');
    };

    return (
        <>
            {/* Backdrop */}
            <div
                onClick={onDismiss}
                style={{
                    position: 'fixed', inset: 0, zIndex: 200,
                    background: 'rgba(0,0,0,0.6)',
                    backdropFilter: 'blur(4px)',
                }}
            />

            {/* Modal */}
            <div style={{
                position: 'fixed', inset: 0, zIndex: 201,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                padding: 24, pointerEvents: 'none',
            }}>
                <div style={{
                    pointerEvents: 'auto',
                    width: '100%', maxWidth: 520,
                    background: 'var(--bg2)',
                    border: '1px solid rgba(147,51,234,0.3)',
                    borderRadius: 20,
                    padding: '36px 40px',
                    boxShadow: '0 24px 80px rgba(0,0,0,0.5)',
                    animation: 'fadeUp 0.3s ease',
                }}>

                    {/* Step dots */}
                    <div style={{ display: 'flex', justifyContent: 'center', gap: 8, marginBottom: 32 }}>
                        {[0, 1].map(i => (
                            <div key={i} style={{
                                width: i === step ? 20 : 8,
                                height: 8,
                                borderRadius: 4,
                                background: i === step ? '#9333ea' : 'rgba(255,255,255,0.1)',
                                transition: 'width 0.3s ease, background 0.3s ease',
                            }} />
                        ))}
                    </div>

                    {/* ── Step 0: Welcome ── */}
                    {step === 0 && (
                        <>
                            <div style={{ textAlign: 'center', marginBottom: 32 }}>
                                <div style={{
                                    width: 64, height: 64, borderRadius: 16,
                                    background: 'rgba(147,51,234,0.15)',
                                    border: '1px solid rgba(147,51,234,0.3)',
                                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                                    margin: '0 auto 20px',
                                }}>
                                    <Icon name="award" size={28} color="#9333ea" />
                                </div>
                                <h2 style={{ fontFamily: 'var(--font-display)', fontSize: 22, fontWeight: 700, color: 'white', marginBottom: 8 }}>
                                    Welcome, {userName}!
                                </h2>
                                <p style={{ fontSize: 14, color: 'var(--text3)', lineHeight: 1.6 }}>
                                    CareerCopilot uses AI to help you land your dream role. Here's what you can do:
                                </p>
                            </div>

                            {/* Feature cards */}
                            <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 32 }}>
                                {FEATURES.map(f => (
                                    <div key={f.title} style={{
                                        display: 'flex', alignItems: 'center', gap: 14,
                                        padding: '12px 16px',
                                        background: 'rgba(255,255,255,0.02)',
                                        border: '1px solid var(--border2)',
                                        borderRadius: 12,
                                    }}>
                                        <div style={{
                                            width: 38, height: 38, borderRadius: 9, flexShrink: 0,
                                            background: `${f.color}18`,
                                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                                        }}>
                                            <Icon name={f.icon} size={18} color={f.color} />
                                        </div>
                                        <div>
                                            <p style={{ fontSize: 13, fontWeight: 600, color: 'white', marginBottom: 2 }}>{f.title}</p>
                                            <p style={{ fontSize: 12, color: 'var(--text3)' }}>{f.desc}</p>
                                        </div>
                                    </div>
                                ))}
                            </div>

                            {/* Buttons */}
                            <div style={{ display: 'flex', gap: 10 }}>
                                <button
                                    onClick={onDismiss}
                                    style={{
                                        flex: 1, padding: '11px 0',
                                        background: 'transparent',
                                        border: '1px solid var(--border)',
                                        borderRadius: 10,
                                        color: 'var(--text3)',
                                        fontSize: 14,
                                        cursor: 'pointer',
                                        fontFamily: 'var(--font-body)',
                                    }}
                                >
                                    Skip for now
                                </button>
                                <button
                                    onClick={() => setStep(1)}
                                    style={{
                                        flex: 2, padding: '11px 0',
                                        background: 'linear-gradient(135deg, #7c3aed, #9333ea)',
                                        border: 'none',
                                        borderRadius: 10,
                                        color: 'white',
                                        fontSize: 14,
                                        fontWeight: 600,
                                        cursor: 'pointer',
                                        fontFamily: 'var(--font-body)',
                                    }}
                                >
                                    Get Started →
                                </button>
                            </div>
                        </>
                    )}

                    {/* ── Step 1: Upload CTA ── */}
                    {step === 1 && (
                        <>
                            <div style={{ textAlign: 'center', marginBottom: 28 }}>
                                <div style={{
                                    width: 64, height: 64, borderRadius: 16,
                                    background: 'rgba(59,130,246,0.12)',
                                    border: '1px solid rgba(59,130,246,0.25)',
                                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                                    margin: '0 auto 20px',
                                }}>
                                    <Icon name="upload" size={28} color="#3b82f6" />
                                </div>
                                <h2 style={{ fontFamily: 'var(--font-display)', fontSize: 22, fontWeight: 700, color: 'white', marginBottom: 8 }}>
                                    Start with your resume
                                </h2>
                                <p style={{ fontSize: 14, color: 'var(--text3)', lineHeight: 1.6 }}>
                                    Upload a PDF or DOCX and our AI will instantly generate your ATS score, detect your skills, identify gaps, and predict your best-fit roles.
                                </p>
                            </div>

                            {/* Upload checklist */}
                            <div style={{
                                padding: '16px 20px',
                                background: 'rgba(59,130,246,0.05)',
                                border: '1px solid rgba(59,130,246,0.15)',
                                borderRadius: 12,
                                marginBottom: 28,
                            }}>
                                {[
                                    'ATS compatibility score (0–100)',
                                    'Skill gap analysis + improvement tips',
                                    'Predicted role matches with percentages',
                                ].map(item => (
                                    <div key={item} style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
                                        <div style={{
                                            width: 18, height: 18, borderRadius: '50%',
                                            background: 'rgba(59,130,246,0.2)',
                                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                                            flexShrink: 0,
                                        }}>
                                            <Icon name="check" size={10} color="#3b82f6" />
                                        </div>
                                        <span style={{ fontSize: 13, color: 'var(--text2)' }}>{item}</span>
                                    </div>
                                ))}
                            </div>

                            {/* Buttons */}
                            <div style={{ display: 'flex', gap: 10 }}>
                                <button
                                    onClick={() => setStep(0)}
                                    style={{
                                        padding: '11px 20px',
                                        background: 'transparent',
                                        border: '1px solid var(--border)',
                                        borderRadius: 10,
                                        color: 'var(--text3)',
                                        fontSize: 14,
                                        cursor: 'pointer',
                                        fontFamily: 'var(--font-body)',
                                    }}
                                >
                                    ← Back
                                </button>
                                <button
                                    onClick={handleUpload}
                                    style={{
                                        flex: 1, padding: '11px 0',
                                        background: 'linear-gradient(135deg, #1d4ed8, #3b82f6)',
                                        border: 'none',
                                        borderRadius: 10,
                                        color: 'white',
                                        fontSize: 14,
                                        fontWeight: 600,
                                        cursor: 'pointer',
                                        fontFamily: 'var(--font-body)',
                                    }}
                                >
                                    Upload Resume Now →
                                </button>
                            </div>
                        </>
                    )}
                </div>
            </div>
        </>
    );
}
