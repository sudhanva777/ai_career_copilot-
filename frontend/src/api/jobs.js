import { apiFetch } from './client';

export const matchJob = (body) =>
    apiFetch('/jobs/match', {
        method: 'POST',
        body: JSON.stringify(body),
    });

export const getMatches = () =>
    apiFetch('/jobs/matches');
