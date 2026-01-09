"use client";
import React, { useState, useRef, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';

interface IngestionStatus {
    status: "idle" | "uploading" | "chunking" | "graph_building" | "indexing" | "processing" | "complete" | "ready" | "error";
    current_block?: number;
    total_blocks?: number;
    message: string;
    percent?: number;
    progress?: number;
}

export default function FileUpload() {
    const { token, user } = useAuth();
    const isAdmin = user?.role === 'admin';
    const [isDragging, setIsDragging] = useState(false);
    const [uploading, setUploading] = useState(false);
    const [status, setStatus] = useState<string | null>(null);
    const [progress, setProgress] = useState(0);
    const [progressMessage, setProgressMessage] = useState<string>('');
    const [isGraphBuilding, setIsGraphBuilding] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);
    const pollIntervalRef = useRef<NodeJS.Timeout | null>(null);

    useEffect(() => {
        return () => {
            if (pollIntervalRef.current) {
                clearInterval(pollIntervalRef.current);
            }
        };
    }, []);

    const pollIngestionStatus = () => {
        pollIntervalRef.current = setInterval(async () => {
            try {
                const res = await fetch('http://127.0.0.1:8000/ingestion/status');
                if (res.ok) {
                    const data: IngestionStatus = await res.json();
                    const progressValue = data.progress ?? data.percent ?? 0;

                    if (data.status === 'processing' || data.status === 'chunking') {
                        setProgress(progressValue);
                        setProgressMessage(data.message);
                    } else if (data.status === 'graph_building') {
                        setProgress(progressValue);
                        setProgressMessage(data.message || 'Building Knowledge Graph...');
                        setIsGraphBuilding(true);
                    } else if (data.status === 'complete' || data.status === 'ready') {
                        setProgress(100);
                        setProgressMessage('Complete!');
                        setIsGraphBuilding(false);
                    }
                }
            } catch (e) { }
        }, 1000);
    };

    const stopPolling = () => {
        if (pollIntervalRef.current) {
            clearInterval(pollIntervalRef.current);
            pollIntervalRef.current = null;
        }
    };

    const uploadFile = async (file: File) => {
        if (!token) return;
        setUploading(true);
        setStatus(null);
        setProgress(0);
        setProgressMessage('Starting upload...');
        setIsGraphBuilding(false);
        pollIngestionStatus();

        const formData = new FormData();
        formData.append('file', file);

        try {
            const res = await fetch(`http://127.0.0.1:8000/upload`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token}`
                },
                body: formData,
            });

            if (res.ok) {
                const data = await res.json();
                stopPolling();
                setProgress(50);
                setProgressMessage(`Indexed ${data.chunks} chunks. Starting Knowledge Graph...`);

                const pollUntilReady = setInterval(async () => {
                    try {
                        const statusRes = await fetch('http://127.0.0.1:8000/ingestion/status');
                        if (statusRes.ok) {
                            const statusData = await statusRes.json();
                            const progressValue = statusData.progress ?? statusData.percent ?? 50;

                            if (statusData.status === 'graph_building') {
                                setProgress(progressValue);
                                setProgressMessage(statusData.message || 'Building Knowledge Graph...');
                                setIsGraphBuilding(true);
                            } else if (statusData.status === 'ready') {
                                clearInterval(pollUntilReady);
                                stopPolling();
                                setProgress(100);
                                setProgressMessage('Complete!');
                                setIsGraphBuilding(false);
                                setStatus(`success:${data.chunks} chunks indexed. Knowledge Graph built.`);
                                setTimeout(() => {
                                    setStatus(null);
                                    setProgress(0);
                                    setProgressMessage('');
                                    setUploading(false);
                                }, 3000);
                            }
                        }
                    } catch (e) { }
                }, 1000);

                setTimeout(() => {
                    clearInterval(pollUntilReady);
                    stopPolling();
                    setUploading(false);
                }, 300000);

            } else {
                stopPolling();
                setStatus('error:Upload failed');
                setUploading(false);
            }
        } catch (error) {
            stopPolling();
            setStatus('error:Connection failed');
            setUploading(false);
        }
    };

    if (!isAdmin) {
        return (
            <div className="p-6 text-center bg-bg-tertiary rounded-xl border border-border-subtle">
                <div className="w-12 h-12 mx-auto mb-4 rounded-xl bg-gray-500/10 flex items-center justify-center">
                    <svg className="w-6 h-6 text-gray-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                    </svg>
                </div>
                <p className="m-0 text-sm font-semibold text-gray-400">Admin Access Required</p>
                <p className="mt-1.5 text-xs text-gray-600">Sign in to upload files</p>
            </div>
        );
    }

    return (
        <div
            onClick={() => fileInputRef.current?.click()}
            onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
            onDragLeave={() => setIsDragging(false)}
            onDrop={(e) => {
                e.preventDefault();
                setIsDragging(false);
                if (e.dataTransfer.files?.[0]) uploadFile(e.dataTransfer.files[0]);
            }}
            className={`
                p-8 text-center rounded-xl border-2 border-dashed cursor-pointer transition-all duration-200
                ${isDragging
                    ? 'bg-accent-indigo/10 border-accent-indigo'
                    : 'bg-bg-tertiary border-border-default hover:bg-bg-hover hover:border-accent-indigo/50'}
            `}
        >
            <input
                type="file"
                ref={fileInputRef}
                onChange={(e) => e.target.files?.[0] && uploadFile(e.target.files[0])}
                accept=".pdf,.docx,.txt"
                className="hidden"
            />

            <div className={`
                w-14 h-14 mx-auto mb-4 rounded-2xl flex items-center justify-center
                ${uploading ? 'bg-accent-indigo/20' : 'bg-accent-indigo/10'}
            `}>
                {uploading ? (
                    <div className="w-6 h-6 border-2 border-accent-indigo/30 border-t-accent-indigo rounded-full animate-spin" />
                ) : (
                    <svg className="w-7 h-7 text-accent-indigo" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                    </svg>
                )}
            </div>

            <p className="m-0 text-sm font-semibold text-white">
                {uploading ? 'Processing...' : 'Drop files here'}
            </p>
            <p className="mt-1.5 text-xs text-gray-500">
                {uploading ? progressMessage : 'PDF, DOCX, TXT supported'}
            </p>

            {uploading && (
                <div className="mt-4">
                    <div className="h-1 bg-accent-indigo/20 rounded-full overflow-hidden relative">
                        <div
                            className={`h-full transition-all duration-300 rounded-full ${isGraphBuilding ? 'bg-gradient-to-r from-accent-purple via-accent-cyan to-accent-purple bg-[length:200%_100%] animate-gradient-x' : 'bg-gradient-to-r from-accent-indigo to-accent-purple'}`}
                            style={{ width: `${progress}%` }}
                        />
                    </div>
                    <p className={`mt-2 text-[11px] font-medium ${isGraphBuilding ? 'text-accent-cyan' : 'text-gray-500'}`}>
                        {isGraphBuilding ? '🧠 ' : ''}{progressMessage} ({progress}%)
                    </p>
                </div>
            )}

            {status && (
                <div className={`
                    mt-4 px-4 py-2 rounded-full inline-block text-xs font-medium
                    ${status.startsWith('success')
                        ? 'bg-accent-emerald/15 text-accent-emerald'
                        : 'bg-red-500/15 text-red-400'}
                `}>
                    {status.split(':')[1]}
                </div>
            )}
        </div>
    );
}
