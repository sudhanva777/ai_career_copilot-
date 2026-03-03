import { useState, useEffect, useCallback } from 'react';
import { listResumes, deleteResume } from '../api/resume';
import { useNotify } from './useNotify';

export function useResumes() {
    const [resumes, setResumes] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const notify = useNotify();

    const fetchResumes = useCallback(async () => {
        setLoading(true);
        setError(null);
        try {
            const data = await listResumes();
            setResumes(data || []);
        } catch (err) {
            setError(err);
            notify(err.message || 'Failed to fetch resumes', 'error');
        } finally {
            setLoading(false);
        }
    }, [notify]);

    useEffect(() => {
        fetchResumes();
    }, [fetchResumes]);

    const remove = async (id) => {
        try {
            await deleteResume(id);
            notify('Resume deleted successfully', 'success');
            await fetchResumes();
        } catch (err) {
            notify(err.message || 'Failed to delete resume', 'error');
        }
    };

    return { resumes, loading, error, fetchResumes, remove };
}
