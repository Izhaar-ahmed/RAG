"use client";
import React, { useState } from 'react';
import { useRouter } from 'next/navigation';

export default function LoginPage() {
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);
    const router = useRouter();

    const handleLogin = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        setLoading(true);

        try {
            const res = await fetch('http://127.0.0.1:8000/auth/login', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ username, password }),
            });

            if (res.ok) {
                const data = await res.json();
                localStorage.setItem('user_token', data.token);
                localStorage.setItem('user_role', data.role);
                router.push('/');
            } else {
                setError('Invalid credentials');
            }
        } catch (err) {
            setError('Connection failed');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div style={{
            minHeight: '100vh',
            backgroundColor: '#0a0a0d',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '24px'
        }}>
            {/* Login Card */}
            <div style={{
                width: '100%',
                maxWidth: '400px',
                backgroundColor: '#0f0f14',
                borderRadius: '20px',
                border: '1px solid rgba(255,255,255,0.08)',
                padding: '40px',
                boxShadow: '0 25px 50px rgba(0,0,0,0.5)'
            }}>
                {/* Logo */}
                <div style={{ textAlign: 'center', marginBottom: '32px' }}>
                    <div style={{
                        width: '56px',
                        height: '56px',
                        margin: '0 auto 20px',
                        borderRadius: '16px',
                        background: 'linear-gradient(135deg, #6366f1, #8b5cf6, #22d3ee)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        boxShadow: '0 0 40px rgba(99,102,241,0.3)'
                    }}>
                        <svg style={{ width: '28px', height: '28px' }} viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2">
                            <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5" strokeLinecap="round" strokeLinejoin="round" />
                        </svg>
                    </div>
                    <h1 style={{ margin: '0 0 8px 0', fontSize: '28px', fontWeight: 700 }}>
                        <span style={{
                            background: 'linear-gradient(135deg, #6366f1, #8b5cf6, #22d3ee)',
                            WebkitBackgroundClip: 'text',
                            WebkitTextFillColor: 'transparent'
                        }}>Nexus</span>
                        <span style={{ color: 'white' }}>AI</span>
                    </h1>
                    <p style={{ margin: 0, fontSize: '13px', color: '#71717a' }}>
                        Enter your credentials to access the knowledge vault
                    </p>
                </div>

                {/* Form */}
                <form onSubmit={handleLogin}>
                    {/* Username */}
                    <div style={{ marginBottom: '20px' }}>
                        <label style={{
                            display: 'block',
                            marginBottom: '8px',
                            fontSize: '11px',
                            fontWeight: 600,
                            color: '#71717a',
                            textTransform: 'uppercase',
                            letterSpacing: '0.05em'
                        }}>
                            Username
                        </label>
                        <input
                            type="text"
                            value={username}
                            onChange={(e) => setUsername(e.target.value)}
                            placeholder="Enter username"
                            style={{
                                width: '100%',
                                padding: '14px 16px',
                                backgroundColor: '#18181d',
                                border: '1px solid rgba(255,255,255,0.1)',
                                borderRadius: '12px',
                                fontSize: '14px',
                                color: '#ffffff',
                                outline: 'none',
                                boxSizing: 'border-box'
                            }}
                        />
                    </div>

                    {/* Password */}
                    <div style={{ marginBottom: '20px' }}>
                        <label style={{
                            display: 'block',
                            marginBottom: '8px',
                            fontSize: '11px',
                            fontWeight: 600,
                            color: '#71717a',
                            textTransform: 'uppercase',
                            letterSpacing: '0.05em'
                        }}>
                            Password
                        </label>
                        <input
                            type="password"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            placeholder="Enter password"
                            style={{
                                width: '100%',
                                padding: '14px 16px',
                                backgroundColor: '#18181d',
                                border: '1px solid rgba(255,255,255,0.1)',
                                borderRadius: '12px',
                                fontSize: '14px',
                                color: '#ffffff',
                                outline: 'none',
                                boxSizing: 'border-box'
                            }}
                        />
                    </div>

                    {/* Error */}
                    {error && (
                        <div style={{
                            padding: '12px 16px',
                            marginBottom: '20px',
                            borderRadius: '10px',
                            backgroundColor: 'rgba(239,68,68,0.1)',
                            border: '1px solid rgba(239,68,68,0.2)',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '10px'
                        }}>
                            <svg style={{ width: '16px', height: '16px', color: '#f87171', flexShrink: 0 }} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                            </svg>
                            <span style={{ fontSize: '13px', color: '#f87171' }}>{error}</span>
                        </div>
                    )}

                    {/* Submit Button */}
                    <button
                        type="submit"
                        disabled={loading}
                        style={{
                            width: '100%',
                            padding: '14px',
                            border: 'none',
                            borderRadius: '12px',
                            background: 'linear-gradient(135deg, #6366f1, #8b5cf6)',
                            color: 'white',
                            fontSize: '14px',
                            fontWeight: 600,
                            cursor: loading ? 'not-allowed' : 'pointer',
                            opacity: loading ? 0.7 : 1,
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            gap: '8px',
                            transition: 'opacity 0.2s'
                        }}
                    >
                        {loading ? (
                            <div style={{
                                width: '18px',
                                height: '18px',
                                border: '2px solid rgba(255,255,255,0.3)',
                                borderTopColor: 'white',
                                borderRadius: '50%',
                                animation: 'spin 1s linear infinite'
                            }} />
                        ) : (
                            <>
                                Access Vault
                                <svg style={{ width: '16px', height: '16px' }} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M14 5l7 7m0 0l-7 7m7-7H3" />
                                </svg>
                            </>
                        )}
                    </button>
                </form>

                {/* Demo Credentials */}
                <div style={{
                    marginTop: '28px',
                    paddingTop: '20px',
                    borderTop: '1px solid rgba(255,255,255,0.06)',
                    textAlign: 'center'
                }}>
                    <p style={{ margin: '0 0 10px 0', fontSize: '11px', color: '#52525b' }}>
                        Demo credentials
                    </p>
                    <div style={{ display: 'flex', justifyContent: 'center', gap: '12px' }}>
                        <code style={{
                            fontSize: '11px',
                            color: '#71717a',
                            backgroundColor: '#18181d',
                            padding: '6px 12px',
                            borderRadius: '8px',
                            fontFamily: 'monospace'
                        }}>
                            admin / admin
                        </code>
                        <code style={{
                            fontSize: '11px',
                            color: '#71717a',
                            backgroundColor: '#18181d',
                            padding: '6px 12px',
                            borderRadius: '8px',
                            fontFamily: 'monospace'
                        }}>
                            user / user
                        </code>
                    </div>
                </div>
            </div>

            {/* Footer */}
            <p style={{
                position: 'fixed',
                bottom: '24px',
                left: '50%',
                transform: 'translateX(-50%)',
                fontSize: '11px',
                color: '#52525b',
                margin: 0
            }}>
                100% Offline • Air-gapped • Zero data transmission
            </p>

            {/* Spin animation */}
            <style jsx global>{`
                @keyframes spin {
                    to { transform: rotate(360deg); }
                }
            `}</style>
        </div>
    );
}
