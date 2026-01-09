"use client";
import React, { useState, useCallback, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';

interface ProgressData {
    status: string;
    current_block: number;
    total_blocks: number;
    message: string;
    percent: number;
}

export default function FileUpload() {
    const { token } = useAuth();
    const [isDragging, setIsDragging] = useState(false);
    const [progress, setProgress] = useState<ProgressData | null>(null);
    const [error, setError] = useState('');

    const pollProgress = useCallback(async () => {
        try {
            const res = await fetch('http://127.0.0.1:8000/ingestion/status');
            const data = await res.json();
            setProgress(data);

            if (data.status === 'processing' || data.status === 'indexing') {
                setTimeout(pollProgress, 500);
            } else if (data.status === 'complete') {
                setTimeout(() => setProgress(null), 3000); // Clear after 3s
            }
        } catch (e) {
            // Ignore polling errors
        }
    }, []);

    const handleUpload = async (files: FileList | null) => {
        if (!files || files.length === 0) return;

        setError('');
        const file = files[0]; // Single file for now
        const formData = new FormData();
        formData.append('file', file);

        try {
            // Optimistic progress start
            setProgress({
                status: 'uploading',
                current_block: 0,
                total_blocks: 100,
                message: 'Uploading file...',
                percent: 10
            });

            const res = await fetch('http://127.0.0.1:8000/upload', {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token}`
                },
                body: formData
            });

            if (!res.ok) throw new Error('Upload failed');

            // Start polling for ingestion progress
            pollProgress();

        } catch (err: any) {
            setError(err.message);
            setProgress(null);
        }
    };

    const onDragOver = (e: React.DragEvent) => {
        e.preventDefault();
        setIsDragging(true);
    };

    const onDragLeave = (e: React.DragEvent) => {
        e.preventDefault();
        setIsDragging(false);
    };

    const onDrop = (e: React.DragEvent) => {
        e.preventDefault();
        setIsDragging(false);
        handleUpload(e.dataTransfer.files);
    };

    return (
        <div className="space-y-6">
            <div
                className={`border-2 border-dashed rounded-2xl p-12 text-center transition-all cursor-pointer ${isDragging
                        ? 'border-indigo-500 bg-indigo-500/10'
                        : 'border-zinc-800 bg-zinc-900/50 hover:bg-zinc-900 hover:border-zinc-700'
                    }`}
                onDragOver={onDragOver}
                onDragLeave={onDragLeave}
                onDrop={onDrop}
                onClick={() => document.getElementById('fileInput')?.click()}
            >
                <input
                    type="file"
                    id="fileInput"
                    className="hidden"
                    onChange={(e) => handleUpload(e.target.files)}
                    accept=".pdf,.docx,.txt,.csv,.xlsx,.xls,image/*"
                />

                <div className="w-16 h-16 mx-auto mb-4 bg-zinc-800 rounded-full flex items-center justify-center">
                    <svg className="w-8 h-8 text-indigo-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                    </svg>
                </div>
                <h3 className="text-lg font-semibold mb-2">Drop documents here</h3>
                <p className="text-zinc-500 text-sm">PDF, Excel, Images, Word</p>
                <p className="text-zinc-600 text-xs mt-4">Max file size 50MB</p>
            </div>

            {error && (
                <div className="p-4 bg-red-900/20 border border-red-900/50 rounded-lg text-red-300 text-sm flex items-center gap-2">
                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    {error}
                </div>
            )}

            {progress && (
                <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-5 shadow-lg">
                    <div className="flex justify-between items-center mb-3">
                        <span className="font-semibold text-sm text-zinc-200">Processing Status</span>
                        <span className="text-xs font-mono text-indigo-400">{progress.status.toUpperCase()}</span>
                    </div>

                    <div className="w-full bg-zinc-800 h-2 rounded-full overflow-hidden mb-3">
                        <div
                            className="bg-indigo-600 h-full transition-all duration-500 ease-out"
                            style={{ width: `${progress.percent}%` }}
                        />
                    </div>

                    <div className="flex justify-between text-xs text-zinc-500">
                        <span>{progress.message}</span>
                        <span>{progress.percent}%</span>
                    </div>
                </div>
            )}
        </div>
    );
}
