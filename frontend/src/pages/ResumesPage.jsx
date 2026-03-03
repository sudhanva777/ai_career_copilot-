import { useNavigate } from 'react-router-dom';
import { useResumes } from '../hooks/useResumes';
import PageHeader from '../components/layout/PageHeader';
import Button from '../components/ui/Button';
import Card from '../components/ui/Card';
import Icon from '../components/ui/Icon';
import EmptyState from '../components/ui/EmptyState';
import Spinner from '../components/ui/Spinner';

export default function ResumesPage() {
    const { resumes, loading, error, remove } = useResumes();
    const navigate = useNavigate();

    // Helper formatter
    const formatDate = (isoString) => {
        if (!isoString) return 'Unknown Date';
        return new Date(isoString).toLocaleDateString('en-US', {
            month: 'short', day: 'numeric', year: 'numeric'
        });
    };

    const handleViewAnalysis = (resume) => {
        // Note: getAnalysis is called within AnalysisPage 
        // or we can pass {resume_id} and let AnalysisPage fetch it
        // For simplicity following specs: navigate to /analysis 
        // and AnalysisPage will fetch the latest or we can pass state
        navigate('/analysis', { state: { resumeId: resume.id } }); // Using generalized state approach
    };

    return (
        <div className="p-32 overflow-y-auto w-full h-full pb-64">
            <PageHeader
                eyebrow="DOCUMENT VAULT"
                title="My Resumes"
                subtitle={`${resumes?.length || 0} document(s) in your vault`}
                rightSlot={<Button variant="primary" onClick={() => navigate('/upload')}>Upload New</Button>}
            />

            <div className="max-w-[800px] flex flex-col gap-12 fade-up-1">
                {loading && (
                    <div className="flex justify-center p-32">
                        <Spinner size={40} className="text-cyan" />
                    </div>
                )}

                {error && !loading && (
                    <div className="bg-coral/10 border border-coral/20 rounded-lg p-16 text-coral font-body text-sm flex gap-8 items-center">
                        <Icon name="info" size={16} /> Failed to load resumes.
                    </div>
                )}

                {!loading && resumes?.length === 0 && !error && (
                    <Card className="py-32 flex justify-center mt-16">
                        <EmptyState
                            emoji="📁"
                            title="No resumes yet"
                            description="Upload your first resume to get actionable AI feedback."
                            action={{ label: "Upload Resume", onClick: () => navigate('/upload') }}
                        />
                    </Card>
                )}

                {!loading && resumes?.length > 0 && resumes.map((resume) => (
                    <Card key={resume.id} padding="16" className="flex items-center justify-between gap-16 group hover:-translate-y-1 transition-transform">

                        <div className="flex items-center gap-16 min-w-0 pr-16 border-r border-border2/50 w-full">
                            <div className="w-[48px] h-[48px] rounded-lg bg-cyan/10 border border-cyan/20 flex-shrink-0 flex items-center justify-center text-cyan">
                                <Icon name="file" size={24} />
                            </div>
                            <div className="flex flex-col gap-4 min-w-0">
                                <span className="font-body text-[15px] font-medium text-text truncate">
                                    {resume.filename || `Resume_${resume.id}.pdf`}
                                </span>
                                <span className="font-mono text-[12px] text-text3 tracking-wide">
                                    ID: #{resume.id} &bull; {formatDate(resume.uploaded_at)}
                                </span>
                            </div>
                        </div>

                        <div className="flex items-center gap-16 flex-shrink-0 pl-8">
                            <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleViewAnalysis(resume)}
                                className="opacity-0 group-hover:opacity-100 transition-opacity"
                            >
                                View Analysis
                            </Button>
                            <Button
                                variant="danger"
                                size="sm"
                                onClick={() => remove(resume.id)}
                                icon={<Icon name="trash" size={16} />}
                            >
                                Delete
                            </Button>
                        </div>
                    </Card>
                ))}

            </div>
        </div>
    );
}
