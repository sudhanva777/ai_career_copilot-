import { createContext, useState, useEffect, useCallback } from 'react';
import { login as apiLogin, register as apiRegister, getMe, logout as apiLogout } from '../api/auth';

export const AuthContext = createContext(null);

export function AuthProvider({ children }) {
    const [user, setUser] = useState(null);
    const [isAuthed, setIsAuthed] = useState(false);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        // Restore session on mount via /auth/me
        getMe()
            .then((data) => {
                setUser({ name: data.name, email: data.email });
                setIsAuthed(true);
            })
            .catch(() => {
                setUser(null);
                setIsAuthed(false);
            })
            .finally(() => setLoading(false));
    }, []);

    const loginSuccess = useCallback((data) => {
        setUser({ name: data.name, email: data.email });
        setIsAuthed(true);
    }, []);

    const login = async (email, password) => {
        await apiLogin(email, password);
        // Immediately fetch user via HttpOnly cookie to populate state
        const data = await getMe();
        loginSuccess(data);
    };

    const register = async (name, email, password) => {
        await apiRegister(name, email, password);
    };

    const logout = useCallback(async () => {
        try {
            await apiLogout();
        } catch (e) {
            console.error(e);
        }
        setUser(null);
        setIsAuthed(false);
    }, []);

    if (loading) return null; // Wait for initial auth check

    return (
        <AuthContext.Provider value={{ user, isAuthed, login, register, logout, loginSuccess }}>
            {children}
        </AuthContext.Provider>
    );
}
