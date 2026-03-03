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
