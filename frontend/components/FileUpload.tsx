"use client";
import React, { useState, useRef, useEffect } from 'react';

export default function FileUpload() {
    const [isDragging, setIsDragging] = useState(false);
    const [uploading, setUploading] = useState(false);
    const [status, setStatus] = useState<string | null>(null);
    const [progress, setProgress] = useState(0);
    const [isAdmin, setIsAdmin] = useState(false);
    const [token, setToken] = useState<string | null>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
        const role = localStorage.getItem('user_role');
        const storedToken = localStorage.getItem('user_token');
        setIsAdmin(role === 'admin');
        setToken(storedToken);
    }, []);

    const handleDragOver = (e: React.DragEvent) => {
        if (!isAdmin) return;
        e.preventDefault();
        setIsDragging(true);
    };

    const handleDragLeave = () => {
        setIsDragging(false);
    };

    const uploadFile = async (file: File) => {
        if (!isAdmin || !token) return;
        setUploading(true);
        setStatus(null);
        setProgress(0);

        // Simulate progress
        const progressInterval = setInterval(() => {
            setProgress(prev => Math.min(prev + 10, 90));
        }, 200);

        const formData = new FormData();
        formData.append('file', file);

        try {
            const res = await fetch(`http://127.0.0.1:8000/upload?user_token=${token}`, {
                method: 'POST',
                body: formData,
            });

            clearInterval(progressInterval);
            setProgress(100);

            if (res.ok) {
                const data = await res.json();
                setStatus(`✓ Indexed ${data.chunks} chunks`);
                setTimeout(() => {
                    setStatus(null);
                    setProgress(0);
                }, 3000);
            } else {
                setStatus('Upload failed');
            }
        } catch (error) {
            clearInterval(progressInterval);
            console.error(error);
            setStatus('Connection failed');
        } finally {
            setUploading(false);
        }
    };

    const handleDrop = (e: React.DragEvent) => {
        e.preventDefault();
        setIsDragging(false);
        if (isAdmin && e.dataTransfer.files && e.dataTransfer.files[0]) {
            uploadFile(e.dataTransfer.files[0]);
        }
    };

    if (!isAdmin) {
        return (
            <div className="glass-light rounded-2xl p-8 text-center opacity-60">
                <div className="w-14 h-14 mx-auto mb-4 rounded-2xl bg-slate-800/50 flex items-center justify-center">
                    <svg className="w-7 h-7 text-slate-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                    </svg>
                </div>
                <p className="text-sm font-semibold text-slate-500">Restricted Access</p>
                <p className="text-xs text-slate-600 mt-1">Sign in as admin to upload</p>
            </div>
        );
    }

    return (
        <div
            className={`relative group cursor-pointer transition-all duration-500 neon-border rounded-2xl overflow-hidden ${isDragging ? 'scale-[1.02]' : ''
                }`}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            onClick={() => fileInputRef.current?.click()}
        >
            {/* Animated gradient background */}
            <div className={`absolute inset-0 bg-gradient-to-br from-indigo-500/10 via-purple-500/5 to-cyan-500/10 transition-opacity duration-500 ${isDragging ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'
                }`} />

            {/* Progress bar */}
            {uploading && (
                <div className="absolute bottom-0 left-0 h-1 bg-gradient-to-r from-indigo-500 via-purple-500 to-cyan-500 transition-all duration-300"
                    style={{ width: `${progress}%` }} />
            )}

            <div className="relative glass-light p-8 flex flex-col items-center justify-center text-center">
                <input
                    type="file"
                    className="hidden"
                    ref={fileInputRef}
                    onChange={(e) => e.target.files && uploadFile(e.target.files[0])}
                    accept=".pdf,.docx,.txt"
                />

                <div className={`w-16 h-16 mb-4 rounded-2xl bg-gradient-to-br from-indigo-500/20 to-purple-500/20 flex items-center justify-center transition-all duration-500 ${uploading ? 'animate-pulse scale-110' : 'group-hover:scale-110 group-hover:from-indigo-500/30 group-hover:to-purple-500/30'
                    }`}>
                    {uploading ? (
                        <svg className="w-8 h-8 text-indigo-400 animate-spin" fill="none" viewBox="0 0 24 24">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" />
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                        </svg>
                    ) : (
                        <svg className="w-8 h-8 text-indigo-400 transition-transform group-hover:-translate-y-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                        </svg>
                    )}
                </div>

                <p className="text-base font-semibold text-white mb-1">
                    {uploading ? 'Processing...' : 'Drop files here'}
                </p>
                <p className="text-xs text-slate-500">
                    {uploading ? `${progress}% complete` : 'PDF, DOCX, TXT supported'}
                </p>

                {status && (
                    <div className={`mt-4 px-4 py-2 rounded-full text-xs font-medium animate-fade-up ${status.includes('✓')
                            ? 'bg-emerald-500/20 text-emerald-400'
                            : 'bg-rose-500/20 text-rose-400'
                        }`}>
                        {status}
                    </div>
                )}
            </div>
        </div>
    );
}
