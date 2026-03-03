import { useState, useRef } from 'react';
import Icon from '../ui/Icon';

export default function DropZone({ onFile, accept = '.pdf,.docx', maxSizeMB = 5, file = null, onError }) {
    const [isDragOver, setIsDragOver] = useState(false);
    const fileInputRef = useRef(null);

    const validateAndSelect = (selectedFile) => {
        if (!selectedFile) return;

        // Check size
        if (selectedFile.size > maxSizeMB * 1024 * 1024) {
            onError?.(`File must be under ${maxSizeMB}MB`);
            return;
        }

        // Check extension roughly
        const ext = selectedFile.name.split('.').pop().toLowerCase();
        const acceptedExts = accept.split(',').map(e => e.trim().replace('.', ''));

        if (!acceptedExts.includes(ext)) {
            onError?.(`Only ${acceptedExts.join(' and ').toUpperCase()} files are allowed`);
            return;
        }

        onFile(selectedFile);
    };

    const handleDrop = (e) => {
        e.preventDefault();
        setIsDragOver(false);
        if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
            validateAndSelect(e.dataTransfer.files[0]);
        }
    };

    const handleDragOver = (e) => {
        e.preventDefault();
        setIsDragOver(true);
    };

    const handleDragLeave = (e) => {
        e.preventDefault();
        setIsDragOver(false);
    };

    return (
        <div
            className={`drop-zone ${isDragOver ? 'drag-over' : ''} max-w-[680px] w-full mx-auto`}
            onClick={() => fileInputRef.current?.click()}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
        >
            <input
                type="file"
                ref={fileInputRef}
                onChange={(e) => validateAndSelect(e.target.files?.[0])}
                accept={accept}
                className="hidden"
            />

            {!file ? (
                <div className="flex flex-col items-center justify-center pointer-events-none">
                    <div className="w-[56px] h-[56px] rounded-full bg-[rgba(255,255,255,0.04)] border border-border2 flex items-center justify-center mb-16">
                        <Icon name="upload" size={28} className="text-text2" />
                    </div>
                    <p className="text-lg font-medium text-text mb-4">Click to upload or drag and drop</p>
                    <p className="text-sm text-text3 flex items-center gap-8">
                        <span className="font-mono bg-[rgba(255,255,255,0.05)] px-6 py-2 rounded text-[11px]">.PDF</span>
                        <span className="font-mono bg-[rgba(255,255,255,0.05)] px-6 py-2 rounded text-[11px]">.DOCX</span>
                        <span>(Max {maxSizeMB}MB)</span>
                    </p>
                </div>
            ) : (
                <div className="flex flex-col items-center justify-center pointer-events-none fade-up">
                    <span className="text-4xl mb-12">📄</span>
                    <p className="text-lg font-medium text-cyan mb-4 break-all max-w-full px-16">{file.name}</p>
                    <p className="text-sm text-text3 mb-16">{(file.size / 1024 / 1024).toFixed(2)} MB</p>
                    <p className="text-xs text-text2 underline">Click to change file</p>
                </div>
            )}
        </div>
    );
}
