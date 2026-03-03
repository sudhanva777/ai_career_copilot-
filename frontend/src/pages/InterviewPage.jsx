import { useState, useRef, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { useInterview } from '../hooks/useInterview';
import Icon from '../components/ui/Icon';
import Button from '../components/ui/Button';
import Card from '../components/ui/Card';
import ChatBubble from '../components/common/ChatBubble';

export default function InterviewPage() {
    const {
        phase,
        messages,
        scores,
        currentQIdx,
        loading,
        roleName,
        avgScore,
        startInterview,
        sendAnswer,
        reset,
        session
    } = useInterview();

    const [selectedRole, setSelectedRole] = useState('Software Engineer');
    const [inputText, setInputText] = useState('');

    const chatRef = useRef(null);
    const location = useLocation();
    const initialAnalysis = location.state?.analysis || null;
    const analysisId = initialAnalysis?.analysis_id || 1; // Fallback to 1 if testing without DB

    const roles = [
        'Software Engineer', 'Full Stack Developer', 'Data Scientist',
        'Data Engineer', 'DevOps Engineer', 'Backend Engineer', 'ML Engineer'
    ];

    // Auto-scroll chat
    useEffect(() => {
        if (chatRef.current) {
            chatRef.current.scrollTo({
                top: chatRef.current.scrollHeight,
                behavior: 'smooth'
            });
        }
    }, [messages, isThinking()]);

    // Helper because hook 'loading' is generic
    function isThinking() {
        // If loading and last message is user, AI is thinking
        return loading && messages.length > 0 && messages[messages.length - 1].role === 'user';
    }

    const handleStart = () => {
        startInterview(selectedRole, analysisId);
    };

    const handleSubmit = () => {
        if (!inputText.trim() || loading) return;
        sendAnswer(inputText);
        setInputText('');
    };

    const handleKeyDown = (e) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            handleSubmit();
        }
    };

    // --------------------------------------------------------------------------
    // PHASE: SETUP
    // --------------------------------------------------------------------------
    if (phase === 'setup') {
        return (
            <div className="flex-1 overflow-y-auto p-32 pb-64 flex items-center justify-center">
                <Card className="w-full max-w-[600px] flex flex-col items-center text-center gap-32 fade-up">

                    <div className="flex flex-col items-center gap-16">
                        <div className="w-[72px] h-[72px] rounded-[20px] bg-cyan/10 border border-cyan/20 flex flex-col items-center justify-center text-cyan">
                            <Icon name="mic" size={32} />
                        </div>
                        <div>
                            <h2 className="font-display font-bold text-2xl mb-4">Configure Your Session</h2>
                            <p className="font-body text-text3 text-sm">Questions tailored to your role and skills</p>
                        </div>
                    </div>

                    <div className="w-full text-left">
                        <label className="font-mono text-xs tracking-wider text-text2 uppercase block mb-12">Target Role</label>
                        <div className="grid grid-2 gap-12">
                            {roles.map(r => {
                                const isSelected = selectedRole === r;
                                return (
                                    <button
                                        key={r}
                                        onClick={() => setSelectedRole(r)}
                                        className={`nav-item justify-start ${isSelected ? 'active border-cyan/30 bg-cyan/10' : 'border border-border2 bg-transparent'}`}
                                    >
                                        {isSelected && <Icon name="check" size={16} className="text-cyan -ml-4" />}
                                        {r}
                                    </button>
                                );
                            })}
                        </div>
                    </div>

                    <div className="w-full flex items-center justify-center gap-24 py-16 px-24 bg-bg2 rounded-xl border border-border2 font-mono text-xs text-text2">
                        <span className="flex items-center gap-8"><Icon name="file" size={14} /> 5 Questions</span>
                        <div className="w-1 h-1 rounded-full bg-border2" />
                        <span className="flex items-center gap-8"><Icon name="brain" size={14} /> Llama 3</span>
                        <div className="w-1 h-1 rounded-full bg-border2" />
                        <span className="flex items-center gap-8"><Icon name="target" size={14} /> 0-10 Scoring</span>
                    </div>

                    <Button fullWidth loading={loading} onClick={handleStart} size="lg">
                        Start Interview
                    </Button>

                </Card>
            </div>
        );
    }

    // --------------------------------------------------------------------------
    // PHASE: SESSION
    // --------------------------------------------------------------------------
    if (phase === 'session') {
        return (
            <div className="flex flex-col h-full fade-up">
                {/* Sticky Header */}
                <header className="flex items-center justify-between px-32 py-20 bg-[rgba(7,7,15,0.8)] backdrop-blur-md border-b border-border2 sticky top-0 z-20">
                    <div className="flex flex-col">
                        <h2 className="font-display font-bold text-lg">{roleName}</h2>
                        <div className="flex items-center gap-12 font-mono text-xs text-text2 mt-4">
                            <span>Session #{session?.session_id || 'X'}</span>
                            <span className="text-border2">•</span>
                            <span className="text-cyan">Q{Math.min(currentQIdx + 1, 5)}/5</span>
                        </div>
                    </div>

                    <div className="flex items-center gap-16">
                        {avgScore > 0 && (
                            <span className={`px-12 py-6 rounded-full font-mono text-xs border ${avgScore >= 7 ? 'score-pill-high' : avgScore >= 5 ? 'score-pill-mid' : 'score-pill-low'}`}>
                                AVG: {avgScore}/10
                            </span>
                        )}
                    </div>
                </header>

                {/* Chat Area */}
                <div ref={chatRef} className="flex-1 overflow-y-auto p-32 pb-48 scroll-smooth" style={{ scrollBehavior: 'smooth' }}>
                    <div className="max-w-[800px] mx-auto w-full flex flex-col">
                        {messages.map((msg, i) => (
                            <ChatBubble key={i} role={msg.role} message={msg.text} score={msg.score} />
                        ))}
                        {isThinking() && <ChatBubble role="ai" isThinking={true} />}
                    </div>
                </div>

                {/* Sticky Input Bar */}
                <div className="p-24 bg-bg border-t border-border2 shrink-0 z-20 relative">
                    <div className="max-w-[800px] mx-auto relative flex gap-12 items-end">
                        <div className="relative flex-1">
                            <textarea
                                value={inputText}
                                onChange={(e) => setInputText(e.target.value)}
                                onKeyDown={handleKeyDown}
                                placeholder="Type your answer here... (Enter to send, Shift+Enter for new line)"
                                className="w-full bg-bg1 border border-border2 rounded-xl p-16 font-body text-[15px] resize-none outline-none focus:border-cyan focus:ring-1 focus:ring-cyan transition-all max-h-[150px]"
                                rows={2}
                                disabled={loading}
                            />
                        </div>
                        <Button
                            onClick={handleSubmit}
                            disabled={!inputText.trim() || loading}
                            className="h-[54px] w-[54px] p-0 flex-shrink-0 !rounded-xl"
                            icon={<Icon name="send" size={20} className={inputText.trim() && !loading ? 'text-bg' : 'text-text3'} />}
                        />
                    </div>
                </div>
            </div>
        );
    }

    // --------------------------------------------------------------------------
    // PHASE: RESULTS
    // --------------------------------------------------------------------------
    return (
        <div className="flex-1 overflow-y-auto p-32 pb-64">
            <div className="max-w-[800px] mx-auto w-full flex flex-col gap-32 fade-up">

                <div className="text-center flex flex-col items-center gap-16 mt-32 mb-16">
                    <h1 className="font-display font-extrabold text-3xl">Interview Complete! 🎯</h1>

                    <div className="flex flex-col items-center mt-12 mb-8">
                        <span
                            className={`font-mono font-medium text-[64px] leading-none ${avgScore >= 7 ? 'text-green' : avgScore >= 5 ? 'text-gold' : 'text-coral'}`}
                        >
                            {avgScore}
                        </span>
                        <span className="font-mono text-xs text-text3 tracking-wider uppercase mt-8">Overall Performance Score</span>
                    </div>

                    <Button variant="primary" onClick={reset} className="mt-8">
                        New Interview
                    </Button>
                </div>

                <div className="flex flex-col gap-24">
                    <h3 className="font-mono text-sm tracking-wider text-text2 uppercase mb-4 border-b border-border2 pb-16">Question Breakdown</h3>

                    {scores.map((s, i) => {
                        const variantClass = s.score >= 7 ? 'score-pill-high' : s.score >= 5 ? 'score-pill-mid' : 'score-pill-low';

                        return (
                            <Card key={i} className="flex flex-col gap-16" padding="24">
                                <div className="flex items-start justify-between border-b border-border2 pb-16">
                                    <span className="font-mono text-sm text-text2">Question #{s.qNum}</span>
                                    <span className={`px-12 py-4 rounded-full font-mono text-xs border ${variantClass}`}>
                                        Score: {s.score}/10
                                    </span>
                                </div>

                                <h4 className="font-body font-bold text-[15px] leading-relaxed">
                                    {s.question.replace(/^\*\*.*?\*\*/, '')} {/* Strip markdown bolding if present */}
                                </h4>

                                <div className="flex flex-col gap-12 mt-4">
                                    <div className="bg-bg1 rounded-lg p-16 border border-border2">
                                        <span className="font-mono text-xs text-text2 mb-8 block uppercase tracking-wider">Feedback</span>
                                        <p className="font-body text-sm text-text leading-relaxed">
                                            {s.feedback}
                                        </p>
                                    </div>
                                </div>
                            </Card>
                        );
                    })}
                </div>
            </div>
        </div>
    );
}
