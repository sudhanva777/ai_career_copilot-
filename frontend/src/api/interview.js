import { apiFetch } from './client';

export const startSession = (targetRole, analysisId) =>
    apiFetch('/interview/start', {
        method: 'POST',
        body: JSON.stringify({ target_role: targetRole, analysis_id: analysisId }),
    });

export const submitAnswer = (sessionId, questionId, answer) =>
    apiFetch('/interview/answer', {
        method: 'POST',
        body: JSON.stringify({ session_id: sessionId, question_id: questionId, answer }),
    });
