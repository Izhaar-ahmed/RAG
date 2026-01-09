"use client";
import Sidebar from '@/components/Sidebar';
import FileUpload from '@/components/FileUpload';
import ChatWindow from '@/components/ChatWindow';
import Login from '@/components/Login';
import { useState, useEffect } from 'react';
import { AuthProvider, useAuth } from '@/context/AuthContext';

function Dashboard() {
  const [modelStatus, setModelStatus] = useState<boolean>(false);
  const { logout, user } = useAuth();

  useEffect(() => {
    const checkStatus = async () => {
      try {
        const res = await fetch('http://127.0.0.1:8000/');
        if (res.ok) {
          const data = await res.json();
          setModelStatus(data.model_loaded);
        }
      } catch (e) { }
    };

    checkStatus();
    const interval = setInterval(checkStatus, 5000);
    return () => clearInterval(interval);
  }, []);

  return (
    <main className="flex h-screen bg-bg-deepest text-gray-200 overflow-hidden">
      {/* Sidebar */}
      <Sidebar />

      {/* Main Content */}
      <div className="flex-1 flex h-full">

        {/* Control Panel */}
        <div className="w-[320px] bg-bg-primary border-r border-border-subtle p-6 flex flex-col gap-6 overflow-y-auto flex-shrink-0 custom-scrollbar">
          {/* Header */}
          <div className="flex justify-between items-start">
            <div>
              <h2 className="m-0 text-[22px] font-bold text-white">
                Control Panel
              </h2>
              <p className="mt-1.5 text-xs text-gray-500">
                Manage your knowledge base
              </p>
            </div>
            <button
              onClick={logout}
              className="text-xs text-red-400 hover:text-red-300 transition-colors font-medium px-2 py-1 hover:bg-red-500/10 rounded"
            >
              Logout
            </button>
          </div>

          {/* User Profile Badge */}
          {user && (
            <div className="p-3 rounded-xl bg-white/5 border border-white/10 flex items-center gap-3 hover:bg-white/10 transition-colors">
              <div className="w-8 h-8 rounded-full bg-accent-indigo/20 flex items-center justify-center text-accent-indigo font-bold text-xs ring-1 ring-accent-indigo/30">
                {user.full_name?.charAt(0) || user.email.charAt(0)}
              </div>
              <div className="overflow-hidden">
                <p className="text-sm font-medium text-white truncate">{user.full_name || 'User'}</p>
                <p className="text-[10px] text-gray-500 truncate">{user.email}</p>
              </div>
            </div>
          )}

          {/* Upload Section */}
          <div>
            <div className="flex items-center gap-2 mb-3">
              <span className="w-1.5 h-1.5 rounded-full bg-gradient-to-br from-accent-indigo to-accent-purple" />
              <span className="text-[11px] font-semibold text-gray-500 uppercase tracking-wider">
                Upload Documents
              </span>
            </div>
            <FileUpload />
          </div>

          {/* System Status */}
          <div className="mt-auto">
            <div className="flex items-center gap-2 mb-3">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.4)]" />
              <span className="text-[11px] font-semibold text-gray-500 uppercase tracking-wider">
                System Status
              </span>
            </div>

            <div className="bg-bg-tertiary rounded-xl border border-border-subtle p-4 space-y-3">
              {/* Neural Engine */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-lg bg-purple-500/15 flex items-center justify-center">
                    <svg className="w-4.5 h-4.5 text-purple-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                    </svg>
                  </div>
                  <div>
                    <p className="m-0 text-[13px] font-semibold text-white">Neural Engine</p>
                    <p className="mt-0.5 text-[10px] text-gray-500">Phi-3 Mini (4K)</p>
                  </div>
                </div>
                <span className={`
                  px-2.5 py-1 rounded-full text-[10px] font-semibold border
                  ${modelStatus
                    ? 'bg-emerald-500/15 text-emerald-400 border-emerald-500/20'
                    : 'bg-amber-500/15 text-amber-400 border-amber-500/20'}
                `}>
                  {modelStatus ? 'Ready' : 'Loading'}
                </span>
              </div>

              {/* Vector Store */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-lg bg-cyan-500/15 flex items-center justify-center">
                    <svg className="w-4.5 h-4.5 text-cyan-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M4 7v10c0 2.21 3.582 4 8 4s8-1.79 8-4V7M4 7c0 2.21 3.582 4 8 4s8-1.79 8-4M4 7c0-2.21 3.582-4 8-4s8 1.79 8 4" />
                    </svg>
                  </div>
                  <div>
                    <p className="m-0 text-[13px] font-semibold text-white">Vector Store</p>
                    <p className="mt-0.5 text-[10px] text-gray-500">FAISS Index</p>
                  </div>
                </div>
                <span className="px-2.5 py-1 rounded-full text-[10px] font-semibold bg-cyan-500/15 text-cyan-400 border border-cyan-500/20">
                  Active
                </span>
              </div>

              {/* Privacy Notice */}
              <div className="pt-3 border-t border-white/5">
                <div className="flex items-center gap-2 text-gray-500">
                  <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                  </svg>
                  <span className="text-[11px] font-medium">
                    Air-gapped • Zero telemetry
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Chat Area */}
        <div className="flex-1 h-full relative">
          <div className="absolute inset-0 bg-gradient-radial from-accent-indigo/5 to-transparent opacity-50 pointer-events-none" />
          <ChatWindow />
        </div>

      </div>
    </main>
  );
}

function MainLayout() {
  const { token, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="h-screen w-screen flex flex-col gap-4 items-center justify-center bg-bg-deepest text-white">
        <div className="w-8 h-8 border-2 border-accent-indigo border-t-transparent rounded-full animate-spin" />
        <p className="text-sm font-medium text-gray-400 animate-pulse">Initializing NexusAI...</p>
      </div>
    );
  }

  if (!token) {
    return <Login />;
  }

  return <Dashboard />;
}

export default function Home() {
  return (
    <AuthProvider>
      <MainLayout />
    </AuthProvider>
  );
}
