import { apiFetch } from './client';

export const startSession = (targetRole, analysisId, practiceMode = false) =>
    apiFetch('/interview/start', {
        method: 'POST',
        body: JSON.stringify({ target_role: targetRole, analysis_id: analysisId, practice_mode: practiceMode }),
    });

export const submitAnswer = (sessionId, questionId, answer) =>
    apiFetch('/interview/answer', {
        method: 'POST',
        body: JSON.stringify({ session_id: sessionId, question_id: questionId, answer }),
    });

export const getSessionSummary = (sessionId) =>
    apiFetch(`/interview/session/${sessionId}/summary`);

export const getInterviewStats = () =>
    apiFetch('/interview/stats');
