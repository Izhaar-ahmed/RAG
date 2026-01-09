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
    <aside style={{
      width: '260px',
      height: '100vh',
      backgroundColor: '#0f0f14',
      borderRight: '1px solid rgba(255,255,255,0.08)',
      display: 'flex',
      flexDirection: 'column',
      flexShrink: 0
    }}>
      {/* Header */}
      <div style={{ padding: '20px', borderBottom: '1px solid rgba(255,255,255,0.08)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          {/* Logo */}
          <div style={{
            width: '42px',
            height: '42px',
            borderRadius: '12px',
            background: 'linear-gradient(135deg, #6366f1, #8b5cf6, #22d3ee)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            flexShrink: 0
          }}>
            <svg style={{ width: '22px', height: '22px' }} viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2">
              <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </div>

          <div>
            <h1 style={{ margin: 0, fontSize: '18px', fontWeight: 700 }}>
              <span style={{
                background: 'linear-gradient(135deg, #6366f1, #8b5cf6, #22d3ee)',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent'
              }}>Nexus</span>
              <span style={{ color: 'white' }}>AI</span>
            </h1>
            <p style={{ margin: '2px 0 0 0', fontSize: '10px', color: '#52525b', textTransform: 'uppercase', letterSpacing: '0.1em' }}>
              {userRole === 'admin' ? 'Admin' : 'Knowledge Vault'}
            </p>
          </div>
        </div>
      </div>

      {/* Documents List */}
      <div style={{ flex: 1, overflow: 'auto', padding: '16px' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px' }}>
          <span style={{ fontSize: '11px', fontWeight: 600, color: '#71717a', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
            Documents
          </span>
          <span style={{
            padding: '2px 8px',
            borderRadius: '12px',
            fontSize: '10px',
            fontWeight: 600,
            backgroundColor: 'rgba(34,211,238,0.15)',
            color: '#22d3ee'
          }}>
            {documents.length}
          </span>
        </div>

        {documents.length === 0 ? (
          <div style={{
            padding: '20px',
            textAlign: 'center',
            backgroundColor: '#18181d',
            borderRadius: '12px',
            border: '1px solid rgba(255,255,255,0.06)'
          }}>
            <div style={{
              width: '40px',
              height: '40px',
              margin: '0 auto 12px',
              borderRadius: '10px',
              backgroundColor: 'rgba(99,102,241,0.1)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}>
              <svg style={{ width: '20px', height: '20px', color: '#71717a' }} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
            </div>
            <p style={{ margin: 0, fontSize: '13px', fontWeight: 500, color: '#a1a1aa' }}>No documents</p>
            <p style={{ margin: '4px 0 0 0', fontSize: '11px', color: '#52525b' }}>Upload files to begin</p>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
            {documents.map((doc) => (
              <div
                key={doc.id}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '10px',
                  padding: '10px 12px',
                  borderRadius: '8px',
                  backgroundColor: 'rgba(99,102,241,0.08)',
                  border: '1px solid rgba(99,102,241,0.15)',
                  cursor: 'pointer'
                }}
              >
                <div style={{
                  width: '32px',
                  height: '32px',
                  borderRadius: '8px',
                  backgroundColor: 'rgba(99,102,241,0.15)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexShrink: 0
                }}>
                  <svg style={{ width: '16px', height: '16px', color: '#818cf8' }} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                </div>
                <span style={{ fontSize: '13px', color: '#e4e4e7', fontWeight: 500, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {doc.name}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* User Section */}
      <div style={{ padding: '16px', borderTop: '1px solid rgba(255,255,255,0.08)' }}>
        <button
          onClick={handleAuthAction}
          style={{
            width: '100%',
            display: 'flex',
            alignItems: 'center',
            gap: '10px',
            padding: '10px 12px',
            borderRadius: '8px',
            backgroundColor: 'transparent',
            border: '1px solid rgba(255,255,255,0.08)',
            cursor: 'pointer',
            transition: 'background-color 0.2s'
          }}
          onMouseEnter={(e) => e.currentTarget.style.backgroundColor = 'rgba(255,255,255,0.05)'}
          onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
        >
          <div style={{
            width: '32px',
            height: '32px',
            borderRadius: '8px',
            backgroundColor: userRole ? 'rgba(16,185,129,0.15)' : 'rgba(99,102,241,0.15)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            flexShrink: 0
          }}>
            <svg style={{ width: '16px', height: '16px', color: userRole ? '#34d399' : '#818cf8' }} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              {userRole ? (
                <path strokeLinecap="round" strokeLinejoin="round" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
              ) : (
                <path strokeLinecap="round" strokeLinejoin="round" d="M11 16l-4-4m0 0l4-4m-4 4h14m-5 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h7a3 3 0 013 3v1" />
              )}
            </svg>
          </div>
          <div style={{ textAlign: 'left' }}>
            <p style={{ margin: 0, fontSize: '13px', fontWeight: 500, color: '#e4e4e7' }}>
              {userRole ? `@${userRole}` : 'Sign In'}
            </p>
            <p style={{ margin: '2px 0 0 0', fontSize: '10px', color: '#52525b' }}>
              {userRole ? 'Logout' : 'Admin access'}
            </p>
          </div>
        </button>
      </div>
    </aside>
  );
}
