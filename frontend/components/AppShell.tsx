"use client";
import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import ChatWindow from './ChatWindow';
import FileUpload from './FileUpload';

export default function AppShell() {
    const { logout, user } = useAuth();
    const [activeTab, setActiveTab] = useState<'chat' | 'documents'>('chat');

    return (
        <div className="flex h-screen bg-zinc-950 text-zinc-100 overflow-hidden">

            {/* Sidebar */}
            <aside className="w-64 bg-zinc-900 border-r border-zinc-800 flex flex-col">
                <div className="p-4 border-b border-zinc-800 flex items-center gap-3">
                    <div className="w-8 h-8 bg-indigo-600 rounded-lg flex items-center justify-center">
                        <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                        </svg>
                    </div>
                    <span className="font-bold text-lg tracking-tight">NexusAI</span>
                </div>

                <nav className="flex-1 p-4 space-y-1">
                    <button
                        onClick={() => setActiveTab('chat')}
                        className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${activeTab === 'chat' ? 'bg-zinc-800 text-white' : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800/50'}`}
                    >
                        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
                        </svg>
                        Intelligence Hub
                    </button>
                    {user?.role === 'admin' && (
                        <button
                            onClick={() => setActiveTab('documents')}
                            className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${activeTab === 'documents' ? 'bg-zinc-800 text-white' : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800/50'}`}
                        >
                            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                            </svg>
                            Knowledge Base
                        </button>
                    )}
                </nav>

                <div className="p-4 border-t border-zinc-800">
                    <div className="flex items-center gap-3 mb-4 px-2">
                        <div className="w-8 h-8 rounded-full bg-zinc-800 flex items-center justify-center text-xs font-bold text-zinc-400">
                            {user?.email?.[0].toUpperCase() || 'U'}
                        </div>
                        <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium truncate">{user?.full_name || 'User'}</p>
                            <p className="text-xs text-zinc-500 truncate">{user?.email}</p>
                        </div>
                    </div>
                    <button
                        onClick={logout}
                        className="w-full flex items-center justify-center gap-2 px-3 py-2 rounded-lg border border-zinc-800 hover:bg-zinc-800 text-xs font-medium text-zinc-400 transition-colors"
                    >
                        Sign Out
                    </button>
                </div>
            </aside>

            {/* Main Content */}
            <main className="flex-1 flex flex-col min-w-0 bg-zinc-950">
                {activeTab === 'chat' || user?.role !== 'admin' ? (
                    <ChatWindow />
                ) : (
                    <div className="p-8 max-w-4xl mx-auto w-full">
                        <h2 className="text-2xl font-bold mb-6">Knowledge Ingestion</h2>
                        <FileUpload />
                    </div>
                )}
            </main>
        </div>
    );
}
