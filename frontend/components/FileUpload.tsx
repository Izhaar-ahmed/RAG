"use client";
import React, { useState, useRef, useEffect } from 'react';

interface IngestionStatus {
    status: string;
    current_block: number;
    total_blocks: number;
    message: string;
    percent: number;
}

export default function FileUpload() {
    const [isDragging, setIsDragging] = useState(false);
    const [uploading, setUploading] = useState(false);
    const [status, setStatus] = useState<string | null>(null);
    const [progress, setProgress] = useState(0);
    const [progressMessage, setProgressMessage] = useState<string>('');
    const [isAdmin, setIsAdmin] = useState(false);
    const [token, setToken] = useState<string | null>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);
    const pollIntervalRef = useRef<NodeJS.Timeout | null>(null);

    useEffect(() => {
        const role = localStorage.getItem('user_role');
        const storedToken = localStorage.getItem('user_token');
        setIsAdmin(role === 'admin');
        setToken(storedToken);

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
                    if (data.status === 'processing') {
                        setProgress(data.percent);
                        setProgressMessage(data.message);
                    } else if (data.status === 'complete') {
                        setProgress(100);
                        setProgressMessage('Complete!');
                    }
                }
            } catch (e) { }
        }, 500);
    };

    const stopPolling = () => {
        if (pollIntervalRef.current) {
            clearInterval(pollIntervalRef.current);
            pollIntervalRef.current = null;
        }
    };

    const uploadFile = async (file: File) => {
        if (!isAdmin || !token) return;
        setUploading(true);
        setStatus(null);
        setProgress(0);
        setProgressMessage('Starting...');
        pollIngestionStatus();

        const formData = new FormData();
        formData.append('file', file);

        try {
            const res = await fetch(`http://127.0.0.1:8000/upload?user_token=${token}`, {
                method: 'POST',
                body: formData,
            });

            stopPolling();
            setProgress(100);

            if (res.ok) {
                const data = await res.json();
                setStatus(`success:${data.chunks} chunks indexed`);
                setTimeout(() => {
                    setStatus(null);
                    setProgress(0);
                    setProgressMessage('');
                }, 3000);
            } else {
                setStatus('error:Upload failed');
            }
        } catch (error) {
            stopPolling();
            setStatus('error:Connection failed');
        } finally {
            setUploading(false);
        }
    };

    if (!isAdmin) {
        return (
            <div style={{
                padding: '24px',
                textAlign: 'center',
                backgroundColor: '#18181d',
                borderRadius: '12px',
                border: '1px solid rgba(255,255,255,0.08)'
            }}>
                <div style={{
                    width: '48px',
                    height: '48px',
                    margin: '0 auto 16px',
                    borderRadius: '12px',
                    backgroundColor: 'rgba(113,113,122,0.15)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center'
                }}>
                    <svg style={{ width: '24px', height: '24px', color: '#71717a' }} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                    </svg>
                </div>
                <p style={{ margin: 0, fontSize: '14px', fontWeight: 600, color: '#a1a1aa' }}>Admin Access Required</p>
                <p style={{ margin: '6px 0 0 0', fontSize: '12px', color: '#52525b' }}>Sign in to upload files</p>
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
            style={{
                padding: '32px 24px',
                textAlign: 'center',
                backgroundColor: isDragging ? 'rgba(99,102,241,0.1)' : '#18181d',
                borderRadius: '12px',
                border: `2px dashed ${isDragging ? '#6366f1' : 'rgba(255,255,255,0.15)'}`,
                cursor: 'pointer',
                transition: 'all 0.2s'
            }}
        >
            <input
                type="file"
                ref={fileInputRef}
                onChange={(e) => e.target.files?.[0] && uploadFile(e.target.files[0])}
                accept=".pdf,.docx,.txt"
                style={{ display: 'none' }}
            />

            <div style={{
                width: '56px',
                height: '56px',
                margin: '0 auto 16px',
                borderRadius: '16px',
                backgroundColor: uploading ? 'rgba(99,102,241,0.2)' : 'rgba(99,102,241,0.1)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
            }}>
                {uploading ? (
                    <div style={{
                        width: '24px',
                        height: '24px',
                        border: '2px solid rgba(99,102,241,0.3)',
                        borderTopColor: '#6366f1',
                        borderRadius: '50%',
                        animation: 'spin 1s linear infinite'
                    }} />
                ) : (
                    <svg style={{ width: '28px', height: '28px', color: '#818cf8' }} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                    </svg>
                )}
            </div>

            <p style={{ margin: 0, fontSize: '14px', fontWeight: 600, color: 'white' }}>
                {uploading ? 'Processing...' : 'Drop files here'}
            </p>
            <p style={{ margin: '6px 0 0 0', fontSize: '12px', color: '#71717a' }}>
                {uploading ? progressMessage : 'PDF, DOCX, TXT supported'}
            </p>

            {uploading && (
                <div style={{ marginTop: '16px' }}>
                    <div style={{ height: '4px', backgroundColor: 'rgba(99,102,241,0.2)', borderRadius: '2px', overflow: 'hidden' }}>
                        <div style={{
                            height: '100%',
                            width: `${progress}%`,
                            background: 'linear-gradient(90deg, #6366f1, #8b5cf6)',
                            borderRadius: '2px',
                            transition: 'width 0.3s'
                        }} />
                    </div>
                    <p style={{ margin: '8px 0 0 0', fontSize: '11px', color: '#52525b' }}>{progress}%</p>
                </div>
            )}

            {status && (
                <div style={{
                    marginTop: '16px',
                    padding: '8px 16px',
                    borderRadius: '20px',
                    display: 'inline-block',
                    backgroundColor: status.startsWith('success') ? 'rgba(16,185,129,0.15)' : 'rgba(239,68,68,0.15)',
                    color: status.startsWith('success') ? '#34d399' : '#f87171',
                    fontSize: '12px',
                    fontWeight: 500
                }}>
                    {status.split(':')[1]}
                </div>
            )}
        </div>
    );
}
