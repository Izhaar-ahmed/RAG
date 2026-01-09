"use client";
import Sidebar from '@/components/Sidebar';
import FileUpload from '@/components/FileUpload';
import ChatWindow from '@/components/ChatWindow';
import { useState, useEffect } from 'react';

export default function Home() {
  const [modelStatus, setModelStatus] = useState<boolean>(false);

  useEffect(() => {
    const checkStatus = async () => {
      try {
        const res = await fetch('http://127.0.0.1:8000/');
        if (res.ok) {
          const data = await res.json();
          setModelStatus(data.model_loaded);
        }
      } catch (e) {
        // Silently fail
      }
    };

    checkStatus();
    const interval = setInterval(checkStatus, 5000);
    return () => clearInterval(interval);
  }, []);

  return (
    <main className="flex h-screen bg-slate-950 text-slate-100 overflow-hidden font-sans selection:bg-indigo-500/30">
      {/* Animated Background */}
      <div className="fixed inset-0 z-0 pointer-events-none overflow-hidden">
        {/* Gradient orbs */}
        <div className="absolute top-[-20%] left-[-10%] w-[600px] h-[600px] bg-indigo-600/10 rounded-full blur-[120px] animate-float" />
        <div className="absolute bottom-[-20%] right-[-10%] w-[500px] h-[500px] bg-purple-600/10 rounded-full blur-[120px]" style={{ animationDelay: '2s' }} />
        <div className="absolute top-[40%] right-[20%] w-[400px] h-[400px] bg-cyan-500/5 rounded-full blur-[100px] animate-float" style={{ animationDelay: '4s' }} />

        {/* Grid overlay */}
        <div className="absolute inset-0 bg-[linear-gradient(rgba(99,102,241,0.03)_1px,transparent_1px),linear-gradient(90deg,rgba(99,102,241,0.03)_1px,transparent_1px)] bg-[size:60px_60px]" />

        {/* Noise texture */}
        <div className="absolute inset-0 opacity-[0.015]" style={{ backgroundImage: 'url("data:image/svg+xml,%3Csvg viewBox="0 0 256 256" xmlns="http://www.w3.org/2000/svg"%3E%3Cfilter id="noise"%3E%3CfeTurbulence type="fractalNoise" baseFrequency="0.65" numOctaves="3" stitchTiles="stitch"/%3E%3C/filter%3E%3Crect width="100%" height="100%" filter="url(%23noise)"/%3E%3C/svg%3E")' }} />
      </div>

      {/* Sidebar */}
      <div className="z-10 flex-shrink-0 relative">
        <Sidebar />
      </div>

      {/* Main Content */}
      <div className="flex-1 flex flex-col h-full z-10 relative lg:flex-row">

        {/* Middle Column: Control Panel */}
        <div className="lg:w-80 glass border-r border-white/5 p-6 flex flex-col gap-6 overflow-y-auto">
          {/* Header */}
          <header className="space-y-1">
            <h2 className="text-2xl font-bold tracking-tight">
              <span className="gradient-text">Control</span>
              <span className="text-white/90"> Panel</span>
            </h2>
            <p className="text-xs text-slate-500 font-medium">
              Manage your knowledge base
            </p>
          </header>

          {/* Upload Section */}
          <section>
            <div className="flex items-center gap-2 mb-4">
              <div className="w-1.5 h-1.5 rounded-full bg-indigo-500" />
              <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
                Ingest Data
              </h3>
            </div>
            <FileUpload />
          </section>

          {/* System Status */}
          <section className="mt-auto">
            <div className="flex items-center gap-2 mb-4">
              <div className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
              <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
                System Status
              </h3>
            </div>

            <div className="glass-light rounded-2xl p-5 space-y-4">
              {/* LLM Status */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-purple-500/20 to-pink-500/20 flex items-center justify-center">
                    <svg className="w-4 h-4 text-purple-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                    </svg>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-white">Neural Engine</p>
                    <p className="text-[10px] text-slate-500">Phi-3 Mini (4K)</p>
                  </div>
                </div>
                <div className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full ${modelStatus ? 'bg-emerald-500/10' : 'bg-amber-500/10'
                  }`}>
                  <div className={`w-1.5 h-1.5 rounded-full ${modelStatus ? 'bg-emerald-400 animate-pulse' : 'bg-amber-400 animate-pulse'
                    }`} />
                  <span className={`text-[10px] font-semibold ${modelStatus ? 'text-emerald-400' : 'text-amber-400'
                    }`}>
                    {modelStatus ? 'Ready' : 'Loading'}
                  </span>
                </div>
              </div>

              {/* Vector DB Status */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-cyan-500/20 to-blue-500/20 flex items-center justify-center">
                    <svg className="w-4 h-4 text-cyan-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 7v10c0 2.21 3.582 4 8 4s8-1.79 8-4V7M4 7c0 2.21 3.582 4 8 4s8-1.79 8-4M4 7c0-2.21 3.582-4 8-4s8 1.79 8 4" />
                    </svg>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-white">Vector Store</p>
                    <p className="text-[10px] text-slate-500">FAISS Index</p>
                  </div>
                </div>
                <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-cyan-500/10">
                  <div className="w-1.5 h-1.5 rounded-full bg-cyan-400" />
                  <span className="text-[10px] font-semibold text-cyan-400">Active</span>
                </div>
              </div>

              {/* Privacy Badge */}
              <div className="pt-3 border-t border-white/5">
                <div className="flex items-center gap-2 text-slate-600">
                  <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                  </svg>
                  <span className="text-[10px] font-medium">Air-gapped • Zero telemetry</span>
                </div>
              </div>
            </div>
          </section>
        </div>

        {/* Right Column: Chat */}
        <div className="flex-1 h-full min-h-0">
          <ChatWindow />
        </div>

      </div>
    </main>
  );
}
