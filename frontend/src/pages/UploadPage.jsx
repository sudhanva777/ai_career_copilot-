import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { uploadResume, getAnalysis } from '../api/resume';
import { useNotify } from '../hooks/useNotify';
import PageHeader from '../components/layout/PageHeader';
import DropZone from '../components/common/DropZone';
import Button from '../components/ui/Button';
import Card from '../components/ui/Card';
import Icon from '../components/ui/Icon';

export default function UploadPage() {
    const [file, setFile] = useState(null);
    const [uploading, setUploading] = useState(false);

    const navigate = useNavigate();
    const notify = useNotify();

    // Helper for simulated delay as requested in specs
    const delay = (ms) => new Promise(res => setTimeout(res, ms));

    const handleFileSelect = (selectedFile) => {
        setFile(selectedFile);
    };

    const handleUpload = async () => {
        if (!file) return;

        setUploading(true);
        try {
            const uploadRes = await uploadResume(file);
            const resumeId = uploadRes.resume_id;

            if (!resumeId) throw new Error("No resume ID returned from upload");

            notify('Analyzing your resume. This may take a moment...', 'info');

            // Poll until analysis is written (usually instant — same request)
            const analysisResult = await pollAnalysis(resumeId);

            notify('Analysis complete!', 'success');
            // Pass analysis data via router state to avoid a redundant fetch
            navigate('/analysis', { state: { analysis: analysisResult } });
        } catch (err) {
            notify(err.message || 'Upload failed', 'error');
        } finally {
            setUploading(false);
        }
    };

    async function pollAnalysis(id) {
        const start = Date.now();
        while (Date.now() - start < 60000) { // 60s timeout
            try {
                const res = await getAnalysis(id);
                // Analysis is ready when we receive a valid analysis_id
                if (res && res.analysis_id !== undefined) {
                    return res;
                }
            } catch (e) {
                // 404 means analysis not written yet — keep polling
                if (e.status !== 404) throw e;
            }
            await delay(2000);
        }
        throw new Error('Analysis timed out. Please try again later.');
    }

    return (
        <div className="p-32 overflow-y-auto w-full h-full pb-64">
            <PageHeader
                eyebrow="RESUME PROCESSOR"
                title="Upload Resume"
                subtitle="Get your ATS score and AI-powered career insights"
            />

            <div className="flex flex-col gap-32 fade-up-1">
                <DropZone
                    file={file}
                    onFile={handleFileSelect}
                    onError={(msg) => notify(msg, 'error')}
                />

                {/* Pipeline Preview Card */}
                <div className="max-w-[680px] w-full mx-auto fade-up-2">
                    <h3 className="font-mono text-sm tracking-wider text-text2 uppercase mb-16 text-center">Analysis Pipeline</h3>
                    <Card className="grid grid-2 gap-24">

                        <div className="flex gap-16 items-start">
                            <div className="w-[40px] h-[40px] rounded-lg bg-cyan/10 border border-cyan/20 flex-shrink-0 flex items-center justify-center text-cyan">
                                <Icon name="file" size={20} />
                            </div>
                            <div className="flex flex-col gap-4">
                                <span className="font-medium text-text">Text Extraction</span>
                                <p className="text-text3 text-sm">Parses layout and extracts raw content.</p>
                            </div>
                        </div>

                        <div className="flex gap-16 items-start">
                            <div className="w-[40px] h-[40px] rounded-lg bg-gold/10 border border-gold/20 flex-shrink-0 flex items-center justify-center text-gold">
                                <Icon name="brain" size={20} />
                            </div>
                            <div className="flex flex-col gap-4">
                                <span className="font-medium text-text">NLP Processing</span>
                                <p className="text-text3 text-sm">Identifies skills and experiences.</p>
                            </div>
                        </div>

                        <div className="flex gap-16 items-start">
                            <div className="w-[40px] h-[40px] rounded-lg bg-green/10 border border-green/20 flex-shrink-0 flex items-center justify-center text-green">
                                <Icon name="award" size={20} />
                            </div>
                            <div className="flex flex-col gap-4">
                                <span className="font-medium text-text">ATS Scoring</span>
                                <p className="text-text3 text-sm">Validates against ATS passing rules.</p>
                            </div>
                        </div>

                        <div className="flex gap-16 items-start">
                            <div className="w-[40px] h-[40px] rounded-lg bg-coral/10 border border-coral/20 flex-shrink-0 flex items-center justify-center text-coral">
                                <Icon name="chart" size={20} />
                            </div>
                            <div className="flex flex-col gap-4">
                                <span className="font-medium text-text">Role Prediction</span>
                                <p className="text-text3 text-sm">Matches profile to career paths.</p>
                            </div>
                        </div>

                    </Card>
                </div>

                {/* Action Bar */}
                {file && (
                    <div className="max-w-[680px] w-full mx-auto flex items-center justify-end gap-16 fade-up">
                        <Button
                            variant="ghost"
                            onClick={() => setFile(null)}
                            disabled={uploading}
                        >
                            Clear
                        </Button>
                        <Button
                            variant="primary"
                            loading={uploading}
                            onClick={handleUpload}
                        >
                            Analyze Resume
                        </Button>
                    </div>
                )}
            </div>

        </div>
    );
}
