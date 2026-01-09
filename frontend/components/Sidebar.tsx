"use client";
import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '../context/AuthContext';

interface Document {
  id: string;
  name: string;
}

export default function Sidebar() {
  const { token, user, logout } = useAuth();
  const [documents, setDocuments] = useState<Document[]>([]);
  const [toast, setToast] = useState<{ message: string, type: 'success' | 'error' } | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const router = useRouter();

  const fetchDocuments = async () => {
    if (!token) return;
    try {
      const res = await fetch('http://127.0.0.1:8000/documents', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setDocuments(data);
      }
    } catch (error) {
      // Silently fail
    }
  };

  useEffect(() => {
    if (token) {
      fetchDocuments();
      const interval = setInterval(fetchDocuments, 5000);
      return () => clearInterval(interval);
    }
  }, [token]);

  const handleAuthAction = () => {
    if (token) {
      logout();
    } else {
      router.push('/login');
    }
  };

  const handleDeleteDocument = async (docId: string, docName: string) => {
    if (!confirm(`Delete "${docName}" permanently?\n\nThis will remove all associated data (vectors, graph nodes, and file).`)) {
      return;
    }

    if (!token) {
      setToast({ message: 'Authentication required', type: 'error' });
      return;
    }

    if (user?.role !== 'admin') {
      setToast({ message: 'Admin access required', type: 'error' });
      return;
    }

    setDeletingId(docId);
    try {
      const res = await fetch(`http://127.0.0.1:8000/api/documents/${docId}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      });

      if (res.ok) {
        setToast({ message: 'Document and associated memory deleted successfully', type: 'success' });
        fetchDocuments(); // Refresh list
      } else {
        const error = await res.json();
        setToast({ message: error.detail || 'Delete failed', type: 'error' });
      }
    } catch (error) {
      setToast({ message: 'Connection failed', type: 'error' });
    } finally {
      setDeletingId(null);
      setTimeout(() => setToast(null), 3000);
    }
  };

  return (
    <aside className="w-[260px] h-screen bg-bg-primary border-r border-border-subtle flex flex-col flex-shrink-0">
      {/* Header */}
      <div className="p-5 border-b border-border-subtle">
        <div className="flex items-center gap-3">
          {/* Logo */}
          <div className="w-[42px] h-[42px] rounded-xl bg-gradient-to-br from-accent-indigo via-accent-purple to-accent-cyan flex items-center justify-center flex-shrink-0 shadow-glow-indigo">
            <svg className="w-[22px] h-[22px] text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </div>

          <div>
            <h1 className="m-0 text-lg font-bold leading-tight">
              <span className="bg-gradient-to-r from-accent-indigo via-accent-purple to-accent-cyan bg-clip-text text-transparent">Nexus</span>
              <span className="text-white">AI</span>
            </h1>
            <p className="mt-0.5 text-[10px] text-gray-500 uppercase tracking-widest font-medium">
              {user?.role === 'admin' ? 'Admin' : 'Knowledge Vault'}
            </p>
          </div>
        </div>
      </div>

      {/* Documents List */}
      <div className="flex-1 overflow-y-auto p-4 custom-scrollbar">
        <div className="flex items-center justify-between mb-3">
          <span className="text-[11px] font-semibold text-gray-500 uppercase tracking-wider">
            Documents
          </span>
          <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-accent-cyan/15 text-accent-cyan border border-accent-cyan/20">
            {documents.length}
          </span>
        </div>

        {documents.length === 0 ? (
          <div className="p-5 text-center bg-bg-tertiary rounded-xl border border-border-subtle border-dashed">
            <div className="w-10 h-10 mx-auto mb-3 rounded-lg bg-accent-indigo/10 flex items-center justify-center">
              <svg className="w-5 h-5 text-gray-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
            </div>
            <p className="text-[13px] font-medium text-gray-400">No documents</p>
            <p className="mt-1 text-[11px] text-gray-500">Upload files to begin</p>
          </div>
        ) : (
          <div className="flex flex-col gap-1">
            {documents.map((doc) => (
              <div
                key={doc.id}
                className={`flex items-center gap-2.5 p-2.5 rounded-lg border transition-all duration-200 group ${deletingId === doc.id
                    ? 'bg-red-500/10 border-red-500/20 opacity-50'
                    : 'bg-bg-tertiary border-border-subtle hover:border-border-default hover:bg-bg-hover'
                  }`}
              >
                <div className="w-8 h-8 rounded-lg bg-accent-indigo/15 flex items-center justify-center flex-shrink-0 group-hover:shadow-glow-indigo transition-shadow">
                  <svg className="w-4 h-4 text-accent-indigo" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                </div>
                <span className="flex-1 text-[13px] text-gray-200 font-medium truncate">
                  {doc.name}
                </span>

                {/* Delete Button - Admin Only */}
                {user?.role === 'admin' && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleDeleteDocument(doc.id, doc.name);
                    }}
                    disabled={deletingId === doc.id}
                    className="p-1 rounded-md text-gray-500 opacity-0 group-hover:opacity-100 hover:text-red-400 hover:bg-red-500/10 transition-all duration-200 focus:opacity-100"
                    title="Delete document"
                  >
                    {deletingId === doc.id ? (
                      <svg className="w-3.5 h-3.5 animate-spin" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                      </svg>
                    ) : (
                      <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                      </svg>
                    )}
                  </button>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* User Section */}
      <div className="p-4 border-t border-border-subtle">
        <button
          onClick={handleAuthAction}
          className="w-full flex items-center gap-2.5 p-2.5 rounded-lg border border-border-subtle hover:bg-bg-hover hover:border-border-default transition-all duration-200 group text-left"
        >
          <div className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 transition-shadow ${user?.role ? 'bg-accent-emerald/15 shadow-glow-emerald' : 'bg-accent-indigo/15'
            }`}>
            <svg
              className={`w-4 h-4 ${user?.role ? 'text-accent-emerald' : 'text-accent-indigo'}`}
              viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"
            >
              {user?.role ? (
                <path strokeLinecap="round" strokeLinejoin="round" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
              ) : (
                <path strokeLinecap="round" strokeLinejoin="round" d="M11 16l-4-4m0 0l4-4m-4 4h14m-5 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h7a3 3 0 013 3v1" />
              )}
            </svg>
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-[13px] font-medium text-gray-200 truncate group-hover:text-white">
              {user?.role ? `@${user?.role}` : 'Sign In'}
            </p>
            <p className="text-[10px] text-gray-500">
              {user?.role ? 'Click to Logout' : 'Admin Access'}
            </p>
          </div>
        </button>
      </div>

      {/* Toast Notification */}
      {toast && (
        <div className={`
           fixed bottom-5 left-1/2 -translate-x-1/2 px-5 py-3 rounded-lg shadow-glass z-50 animate-fade-in
           flex items-center gap-2 text-[13px] font-medium text-white
           ${toast.type === 'success' ? 'bg-accent-emerald/95' : 'bg-red-500/95'}
        `}>
          <span>{toast.type === 'success' ? '✓' : '⚠'}</span>
          {toast.message}
        </div>
      )}
    </aside>
  );
}
