"use client";
import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';

interface Document {
  id: string;
  name: string;
}

export default function Sidebar() {
  const [documents, setDocuments] = useState<Document[]>([]);
  const [userRole, setUserRole] = useState<string | null>(null);
  const [isExpanded, setIsExpanded] = useState(true);
  const router = useRouter();

  const fetchDocuments = async () => {
    try {
      const res = await fetch('http://127.0.0.1:8000/documents');
      if (res.ok) {
        const data = await res.json();
        setDocuments(data);
      }
    } catch (error) {
      // Silently fail
    }
  };

  useEffect(() => {
    fetchDocuments();
    const role = localStorage.getItem('user_role');
    setUserRole(role);

    const interval = setInterval(fetchDocuments, 5000);
    return () => clearInterval(interval);
  }, []);

  const handleAuthAction = () => {
    if (userRole) {
      localStorage.removeItem('user_token');
      localStorage.removeItem('user_role');
      setUserRole(null);
      window.location.reload();
    } else {
      router.push('/login');
    }
  };

  return (
    <div className={`${isExpanded ? 'w-72' : 'w-20'} h-full glass border-r border-white/5 flex flex-col transition-all duration-500 ease-out`}>
      {/* Brand Header */}
      <div className="h-24 flex items-center px-6 border-b border-white/5 relative overflow-hidden">
        {/* Animated background orb */}
        <div className="absolute -top-10 -left-10 w-32 h-32 bg-indigo-500/20 rounded-full blur-3xl animate-float" />

        <div className="relative flex items-center gap-4">
          {/* Logo */}
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-indigo-500 via-purple-500 to-cyan-400 p-[2px] animate-pulse-glow">
            <div className="w-full h-full rounded-2xl bg-slate-900 flex items-center justify-center">
              <svg className="w-6 h-6 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </div>
          </div>

          {isExpanded && (
            <div className="animate-fade-up">
              <h1 className="text-xl font-bold tracking-tight">
                <span className="gradient-text">Nexus</span>
                <span className="text-white/90">AI</span>
              </h1>
              <p className="text-[10px] text-slate-400 font-medium tracking-[0.2em] uppercase">
                {userRole === 'admin' ? 'Command Center' : 'Knowledge Vault'}
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Toggle Button */}
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="absolute top-20 -right-3 w-6 h-6 rounded-full bg-slate-800 border border-white/10 flex items-center justify-center hover:bg-indigo-600 transition-colors z-50"
      >
        <svg className={`w-3 h-3 text-white transition-transform ${isExpanded ? 'rotate-0' : 'rotate-180'}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
        </svg>
      </button>

      {/* Documents Section */}
      <div className="flex-1 overflow-y-auto py-6 px-4">
        {isExpanded && (
          <div className="flex items-center gap-2 mb-4 px-2">
            <div className="w-2 h-2 rounded-full bg-cyan-400 animate-pulse shadow-lg shadow-cyan-400/50" />
            <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
              Knowledge Base
            </span>
            <span className="ml-auto text-[10px] text-slate-600 bg-slate-800/50 px-2 py-0.5 rounded-full">
              {documents.length}
            </span>
          </div>
        )}

        {documents.length === 0 ? (
          isExpanded && (
            <div className="glass-light rounded-2xl p-6 text-center animate-fade-up">
              <div className="w-12 h-12 mx-auto mb-3 rounded-xl bg-slate-800/50 flex items-center justify-center">
                <svg className="w-6 h-6 text-slate-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                </svg>
              </div>
              <p className="text-sm text-slate-400 font-medium">No documents yet</p>
              <p className="text-xs text-slate-600 mt-1">Upload files to begin</p>
            </div>
          )
        ) : (
          <div className="space-y-1">
            {documents.map((doc, idx) => (
              <button
                key={doc.id}
                className="w-full group flex items-center gap-3 p-3 rounded-xl hover:bg-white/5 transition-all duration-300 animate-fade-up"
                style={{ animationDelay: `${idx * 50}ms` }}
              >
                <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-indigo-500/20 to-purple-500/20 flex items-center justify-center group-hover:from-indigo-500/30 group-hover:to-purple-500/30 transition-all">
                  <svg className="w-4 h-4 text-indigo-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                </div>
                {isExpanded && (
                  <span className="text-sm text-slate-300 font-medium truncate group-hover:text-white transition-colors">
                    {doc.name}
                  </span>
                )}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* User Section */}
      <div className="p-4 border-t border-white/5">
        <button
          className="w-full flex items-center gap-3 p-3 rounded-xl hover:bg-white/5 transition-all group"
          onClick={handleAuthAction}
        >
          <div className={`w-9 h-9 rounded-lg flex items-center justify-center transition-all ${userRole
              ? 'bg-gradient-to-br from-emerald-500/20 to-cyan-500/20 group-hover:from-rose-500/20 group-hover:to-orange-500/20'
              : 'bg-gradient-to-br from-indigo-500/20 to-purple-500/20'
            }`}>
            {userRole ? (
              <svg className="w-4 h-4 text-emerald-400 group-hover:text-rose-400 transition-colors" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
              </svg>
            ) : (
              <svg className="w-4 h-4 text-indigo-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 16l-4-4m0 0l4-4m-4 4h14m-5 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h7a3 3 0 013 3v1" />
              </svg>
            )}
          </div>
          {isExpanded && (
            <div className="text-left">
              <p className="text-sm font-medium text-slate-300 group-hover:text-white transition-colors">
                {userRole ? `@${userRole}` : 'Sign In'}
              </p>
              <p className="text-[10px] text-slate-500">
                {userRole ? 'Click to logout' : 'Admin access'}
              </p>
            </div>
          )}
        </button>
      </div>
    </div>
  );
}
