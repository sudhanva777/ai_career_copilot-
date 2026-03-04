import { apiFetch } from './client';

export const uploadResume = (file) => {
    const fd = new FormData();
    fd.append('file', file);
    return apiFetch('/resume/upload', { method: 'POST', body: fd });
};

export const listResumes = () => apiFetch('/resume/list');

export const deleteResume = (id) =>
    apiFetch(`/resume/${id}`, { method: 'DELETE' });

export const getAnalysis = (id) =>
    apiFetch(`/resume/analysis/${id}`);

export const getRewrite = (resumeId) =>
    apiFetch(`/resume/rewrite/${resumeId}`);

export const generateRewrite = (resumeId) =>
    apiFetch(`/resume/rewrite/${resumeId}`, { method: 'POST' });

export const getHistory = () =>
    apiFetch('/resume/history');

export const previewUpdatedResume = (resumeId, appliedIndices) =>
    apiFetch(`/resume/preview/${resumeId}`, {
        method: 'POST',
        body: JSON.stringify({ applied_indices: appliedIndices }),
    });

export const exportUpdatedResume = (resumeId, appliedIndices) => {
    const ids = appliedIndices.join(',');
    return `/api/v1/resume/export-updated/${resumeId}?applied_ids=${ids}`;
};
