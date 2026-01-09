"use client";
import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';

export default function Login() {
    const { login } = useAuth();
    const [isLogin, setIsLogin] = useState(true);
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [fullName, setFullName] = useState('');
    const [error, setError] = useState('');
    const [isLoading, setIsLoading] = useState(false);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        setIsLoading(true);

        try {
            const endpoint = isLogin ? 'http://127.0.0.1:8000/token' : 'http://127.0.0.1:8000/auth/register';

            const formData = new URLSearchParams();
            formData.append('username', email);
            formData.append('password', password);

            const body = isLogin ? formData : JSON.stringify({
                email,
                password,
                full_name: fullName
            });

            const headers: HeadersInit = isLogin
                ? { 'Content-Type': 'application/x-www-form-urlencoded' }
                : { 'Content-Type': 'application/json' };

            const res = await fetch(endpoint, {
                method: 'POST',
                headers,
                body: isLogin ? formData : body,
            });

            const data = await res.json();

            if (!res.ok) {
                throw new Error(data.detail || 'Authentication failed');
            }

            if (isLogin) {
                login(data.access_token);
            } else {
                setIsLogin(true);
                setError('Registration successful! Please login.');
                setIsLoading(false);
                return;
            }

        } catch (err: any) {
            setError(err.message);
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="min-h-screen flex items-center justify-center bg-zinc-950 text-white font-sans selection:bg-indigo-500/30">

            {/* Ambient Background Effects */}
            <div className="fixed inset-0 pointer-events-none overflow-hidden">
                <div className="absolute top-0 left-1/4 w-96 h-96 bg-indigo-500/10 rounded-full blur-3xl" />
                <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-purple-500/10 rounded-full blur-3xl" />
            </div>

            <div className="relative w-full max-w-sm mx-4">
                <div className="bg-zinc-900/50 backdrop-blur-xl border border-zinc-800 rounded-2xl shadow-2xl p-8">

                    {/* Header Section */}
                    <div className="text-center mb-8">
                        <div className="w-16 h-16 mx-auto mb-6 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-2xl flex items-center justify-center shadow-lg transform transition-transform hover:scale-105 active:scale-95 duration-200">
                            <svg className="w-8 h-8 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                <path strokeLinecap="round" strokeLinejoin="round" d="M12 11c0 3.517-1.009 6.799-2.753 9.571m-3.44-2.04l.054-.09A13.916 13.916 0 008 11a4 4 0 118 0c0 1.017-.07 2.019-.203 3m-2.118 6.844A21.88 21.88 0 0015.171 17m3.839 1.132c.645-2.266.99-4.659.99-7.132A8 8 0 008 4.07M3 15.364c.64-1.319 1-2.8 1-4.364 0-1.457.2-2.85.577-4.147" />
                            </svg>
                        </div>
                        <h2 className="text-2xl font-bold tracking-tight text-white mb-2">NexusAI</h2>
                        <p className="text-xs text-zinc-500 font-medium uppercase tracking-wider">Enterprise Knowledge Platform</p>
                    </div>

                    {/* Form Section */}
                    <form onSubmit={handleSubmit} className="space-y-5">
                        {!isLogin && (
                            <div className="space-y-2">
                                <label className="text-[11px] font-semibold text-zinc-400 uppercase tracking-wider pl-1">Full Name</label>
                                <input
                                    type="text"
                                    required
                                    className="w-full px-4 py-2.5 bg-zinc-950/50 border border-zinc-800 rounded-lg text-sm text-zinc-200 placeholder-zinc-600 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500/50 transition-all duration-200"
                                    placeholder="John Doe"
                                    value={fullName}
                                    onChange={(e) => setFullName(e.target.value)}
                                />
                            </div>
                        )}

                        <div className="space-y-2">
                            <label className="text-[11px] font-semibold text-zinc-400 uppercase tracking-wider pl-1">Email Address</label>
                            <input
                                type="email"
                                required
                                className="w-full px-4 py-2.5 bg-zinc-950/50 border border-zinc-800 rounded-lg text-sm text-zinc-200 placeholder-zinc-600 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500/50 transition-all duration-200"
                                placeholder="name@company.com"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                            />
                        </div>

                        <div className="space-y-2">
                            <label className="text-[11px] font-semibold text-zinc-400 uppercase tracking-wider pl-1">Password</label>
                            <input
                                type="password"
                                required
                                className="w-full px-4 py-2.5 bg-zinc-950/50 border border-zinc-800 rounded-lg text-sm text-zinc-200 placeholder-zinc-600 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500/50 transition-all duration-200"
                                placeholder="••••••••"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                            />
                        </div>

                        {error && (
                            <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-lg text-center">
                                <p className="text-xs text-red-400 font-medium">{error}</p>
                            </div>
                        )}

                        <button
                            type="submit"
                            disabled={isLoading}
                            className="w-full py-3 mt-2 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white text-sm font-semibold rounded-lg shadow-lg shadow-indigo-500/20 hover:shadow-indigo-500/30 active:scale-[0.98] transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
                        >
                            {isLoading ? (
                                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                            ) : (
                                isLogin ? 'Sign In' : 'Create Account'
                            )}
                        </button>
                    </form>

                    {/* Footer Section */}
                    <div className="mt-6 pt-6 border-t border-zinc-800 text-center">
                        <p className="text-xs text-zinc-500">
                            {isLogin ? "Don't have an account?" : "Already have an account?"}
                            <button
                                onClick={() => setIsLogin(!isLogin)}
                                className="ml-2 text-indigo-400 hover:text-indigo-300 font-medium transition-colors hover:underline"
                            >
                                {isLogin ? 'Register' : 'Login'}
                            </button>
                        </p>
                    </div>
                </div>

                <div className="mt-8 text-center">
                    <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-zinc-900/50 border border-zinc-800">
                        <svg className="w-3 h-3 text-zinc-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                        </svg>
                        <span className="text-[10px] text-zinc-600 font-medium tracking-wide">Enterprise Grade Encryption</span>
                    </div>
                </div>
            </div>
        </div>
    );
}
