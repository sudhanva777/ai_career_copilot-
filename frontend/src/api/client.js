export const API_BASE = import.meta.env.VITE_API_BASE ?? 'http://localhost:8000/api/v1';

export async function apiFetch(path, options = {}) {
    const isFormData = options.body instanceof FormData;

    const headers = {
        ...(!isFormData && { 'Content-Type': 'application/json' }),
        ...options.headers,
    };

    let res;
    try {
        res = await fetch(`${API_BASE}${path}`, {
            ...options,
            headers,
            credentials: 'include',
            signal: AbortSignal.timeout(30_000),  // 30s timeout
        });
    } catch (err) {
        if (err.name === 'AbortError') {
            throw new Error('Request timed out. Please try again.');
        }
        throw new Error('Network error. Is the server running?');
    }

    // 204 No Content — return null
    if (res.status === 204) return null;

    // 401 — handle unauthorized
    if (res.status === 401) {
        // Prevent infinite loop: do not force redirect if calling an auth endpoint
        if (!path.startsWith('/auth/')) {
            window.location.href = '/login';
        }
        const err = new Error('Session expired. Please sign in again.');
        err.status = 401;
        throw err;
    }

    let data;
    try {
        data = await res.json();
    } catch {
        throw new Error(`Server returned an unexpected response (${res.status})`);
    }

    if (!res.ok) {
        const err = new Error(data?.detail ?? `Request failed with status ${res.status}`);
        err.status = res.status;
        err.data = data;
        throw err;
    }

    return data;
}
