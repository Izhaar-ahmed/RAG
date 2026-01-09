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
      } catch (e) { }
    };

    checkStatus();
    const interval = setInterval(checkStatus, 5000);
    return () => clearInterval(interval);
  }, []);

  return (
    <main style={{
      display: 'flex',
      height: '100vh',
      backgroundColor: '#0a0a0d',
      color: '#e4e4e7',
      overflow: 'hidden'
    }}>
      {/* Sidebar */}
      <Sidebar />

      {/* Main Content */}
      <div style={{ flex: 1, display: 'flex', height: '100%' }}>

        {/* Control Panel */}
        <div style={{
          width: '320px',
          backgroundColor: '#0f0f14',
          borderRight: '1px solid rgba(255,255,255,0.08)',
          padding: '24px',
          display: 'flex',
          flexDirection: 'column',
          gap: '24px',
          overflow: 'auto',
          flexShrink: 0
        }}>
          {/* Header */}
          <div>
            <h2 style={{ margin: 0, fontSize: '22px', fontWeight: 700, color: 'white' }}>
              Control Panel
            </h2>
            <p style={{ margin: '6px 0 0 0', fontSize: '12px', color: '#71717a' }}>
              Manage your knowledge base
            </p>
          </div>

          {/* Upload Section */}
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px' }}>
              <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: 'linear-gradient(135deg, #6366f1, #8b5cf6)' }} />
              <span style={{ fontSize: '11px', fontWeight: 600, color: '#71717a', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                Upload Documents
              </span>
            </div>
            <FileUpload />
          </div>

          {/* System Status */}
          <div style={{ marginTop: 'auto' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px' }}>
              <span style={{ width: '6px', height: '6px', borderRadius: '50%', backgroundColor: '#10b981' }} />
              <span style={{ fontSize: '11px', fontWeight: 600, color: '#71717a', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                System Status
              </span>
            </div>

            <div style={{
              backgroundColor: '#18181d',
              borderRadius: '12px',
              border: '1px solid rgba(255,255,255,0.08)',
              padding: '16px'
            }}>
              {/* Neural Engine */}
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <div style={{
                    width: '36px',
                    height: '36px',
                    borderRadius: '10px',
                    backgroundColor: 'rgba(168,85,247,0.15)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center'
                  }}>
                    <svg style={{ width: '18px', height: '18px', color: '#a855f7' }} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                    </svg>
                  </div>
                  <div>
                    <p style={{ margin: 0, fontSize: '13px', fontWeight: 600, color: 'white' }}>Neural Engine</p>
                    <p style={{ margin: '2px 0 0 0', fontSize: '10px', color: '#52525b' }}>Phi-3 Mini (4K)</p>
                  </div>
                </div>
                <span style={{
                  padding: '4px 10px',
                  borderRadius: '20px',
                  fontSize: '11px',
                  fontWeight: 600,
                  backgroundColor: modelStatus ? 'rgba(16,185,129,0.15)' : 'rgba(245,158,11,0.15)',
                  color: modelStatus ? '#34d399' : '#fbbf24'
                }}>
                  {modelStatus ? 'Ready' : 'Loading'}
                </span>
              </div>

              {/* Vector Store */}
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <div style={{
                    width: '36px',
                    height: '36px',
                    borderRadius: '10px',
                    backgroundColor: 'rgba(6,182,212,0.15)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center'
                  }}>
                    <svg style={{ width: '18px', height: '18px', color: '#22d3ee' }} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M4 7v10c0 2.21 3.582 4 8 4s8-1.79 8-4V7M4 7c0 2.21 3.582 4 8 4s8-1.79 8-4M4 7c0-2.21 3.582-4 8-4s8 1.79 8 4" />
                    </svg>
                  </div>
                  <div>
                    <p style={{ margin: 0, fontSize: '13px', fontWeight: 600, color: 'white' }}>Vector Store</p>
                    <p style={{ margin: '2px 0 0 0', fontSize: '10px', color: '#52525b' }}>FAISS Index</p>
                  </div>
                </div>
                <span style={{
                  padding: '4px 10px',
                  borderRadius: '20px',
                  fontSize: '11px',
                  fontWeight: 600,
                  backgroundColor: 'rgba(6,182,212,0.15)',
                  color: '#22d3ee'
                }}>
                  Active
                </span>
              </div>

              {/* Privacy Notice */}
              <div style={{ paddingTop: '12px', borderTop: '1px solid rgba(255,255,255,0.06)' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <svg style={{ width: '14px', height: '14px', color: '#52525b' }} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                  </svg>
                  <span style={{ fontSize: '11px', color: '#52525b', fontWeight: 500 }}>
                    Air-gapped • Zero telemetry
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Chat Area */}
        <div style={{ flex: 1, height: '100%' }}>
          <ChatWindow />
        </div>

      </div>

      {/* Add spin animation */}
      <style jsx global>{`
        @keyframes spin {
          to { transform: rotate(360deg); }
        }
        @keyframes bounce {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(-4px); }
        }
      `}</style>
    </main>
  );
}
