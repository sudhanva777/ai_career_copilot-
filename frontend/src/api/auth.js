import { apiFetch } from './client';

export async function register(name, email, password) {
    return apiFetch('/auth/register', {
        method: 'POST',
        body: JSON.stringify({ name, email, password }),
    });
}

export async function login(email, password) {
    const data = await apiFetch('/auth/login', {
        method: 'POST',
        body: JSON.stringify({ email, password }),
    });
    return data;
}

export async function getMe() {
    return apiFetch('/auth/me');
}

export async function logout() {
    return apiFetch('/auth/logout', { method: 'POST' });
}
