import { useState, useCallback } from 'react';
import { startSession, submitAnswer } from '../api/interview';
import { useNotify } from './useNotify';

export function useInterview() {
    const [phase, setPhase] = useState('setup'); // 'setup' | 'session' | 'done'
    const [session, setSession] = useState(null);
    const [messages, setMessages] = useState([]);
    const [scores, setScores] = useState([]);
    const [currentQIdx, setCurrentQIdx] = useState(0);
    const [loading, setLoading] = useState(false);
    const [roleName, setRoleName] = useState('');
    const [overallScore, setOverallScore] = useState(null);

    const notify = useNotify();

    const startInterview = async (targetRole, analysisId, practiceMode = false) => {
        setLoading(true);
        try {
            const data = await startSession(targetRole, analysisId, practiceMode);
            setSession(data);
            setRoleName(targetRole);
            setOverallScore(null);

            const firstQ = data.questions?.[0];
            if (firstQ) {
                setMessages([
                    { role: 'ai', text: `Welcome to your mock interview for the ${targetRole} position! Let's get started. \n\n**${firstQ.text}**` }
                ]);
            }
            setCurrentQIdx(0);
            setScores([]);
            setPhase('session');
        } catch (err) {
            notify(err.message || 'Failed to start interview', 'error');
        } finally {
            setLoading(false);
        }
    };

    const sendAnswer = async (answerText) => {
        if (!session || !session.questions || currentQIdx >= session.questions.length) return;

        const currentQ = session.questions[currentQIdx];

        setMessages(prev => [...prev, { role: 'user', text: answerText }]);

        setLoading(true);
        try {
            const data = await submitAnswer(session.session_id, currentQ.id, answerText);

            setScores(prev => [...prev, {
                qNum: currentQIdx + 1,
                question: currentQ.text,
                category: currentQ.category || 'Technical',
                score: data.score,
                feedback: data.feedback,
                ideal: data.ideal_answer,
            }]);

            if (data.overall_score != null) {
                setOverallScore(data.overall_score);
            }

            const nextIdx = currentQIdx + 1;
            let aiResponseText = `**Score:** ${data.score}/10\n\n**Feedback:** ${data.feedback}\n\n`;

            if (nextIdx < session.questions.length) {
                const nextQ = session.questions[nextIdx];
                aiResponseText += `**Next Question:** ${nextQ.text}`;
                setMessages(prev => [...prev, { role: 'ai', text: aiResponseText, score: data.score }]);
                setCurrentQIdx(nextIdx);
            } else {
                aiResponseText += `That wraps up our interview for the ${roleName} role. Good job!`;
                setMessages(prev => [...prev, { role: 'ai', text: aiResponseText, score: data.score }]);
                setPhase('done');
            }
        } catch (err) {
            setMessages(prev => [...prev, { role: 'ai', text: "I'm having trouble connecting to evaluate your answer. Please try again or check your connection." }]);
            notify(err.message || 'Error submitting answer', 'error');
        } finally {
            setLoading(false);
        }
    };

    const reset = useCallback(() => {
        setPhase('setup');
        setSession(null);
        setMessages([]);
        setScores([]);
        setCurrentQIdx(0);
        setOverallScore(null);
    }, []);

    const totalScores = scores.reduce((sum, s) => sum + s.score, 0);
    const avgScore = scores.length > 0 ? Number((totalScores / scores.length).toFixed(1)) : 0;

    return {
        phase,
        session,
        messages,
        scores,
        currentQIdx,
        loading,
        roleName,
        avgScore,
        overallScore,
        startInterview,
        sendAnswer,
        reset,
        setPhase,
    };
}
