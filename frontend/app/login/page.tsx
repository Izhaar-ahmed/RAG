"use client";
import React, { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useRouter } from 'next/navigation';

export default function LoginPage() {
    const { login } = useAuth();
    const router = useRouter();
    const [isLogin, setIsLogin] = useState(true);

    // Form State
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [fullName, setFullName] = useState('');

    // UI State
    const [error, setError] = useState('');
    const [isLoading, setIsLoading] = useState(false);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        setIsLoading(true);

        try {
            const endpoint = isLogin ? 'http://127.0.0.1:8000/token' : 'http://127.0.0.1:8000/auth/register';

            // Prepare body based on endpoint requirement
            let body;
            let headers: HeadersInit = {};

            if (isLogin) {
                // OAuth2PasswordRequestForm expects form-data
                const formData = new URLSearchParams();
                formData.append('username', email);
                formData.append('password', password);
                body = formData;
                headers = { 'Content-Type': 'application/x-www-form-urlencoded' };
            } else {
                // Register expects JSON
                body = JSON.stringify({
                    email,
                    password,
                    full_name: fullName,
                    role: 'user'
                });
                headers = { 'Content-Type': 'application/json' };
            }

            const res = await fetch(endpoint, {
                method: 'POST',
                headers,
                body: isLogin ? body : (body as string),
            });

            const data = await res.json();

            if (!res.ok) {
                throw new Error(data.detail || 'Authentication failed');
            }

            if (isLogin) {
                login(data.access_token);
                // AuthContext handles redirect
            } else {
                // After register, switch to login view
                setIsLogin(true);
                setError('Account created! Please sign in.');
                setIsLoading(false);
            }

        } catch (err: any) {
            setError(err.message || 'An unexpected error occurred');
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="min-h-screen flex items-center justify-center bg-zinc-950 text-zinc-100 font-sans">

            {/* Background Gradients */}
            <div className="absolute inset-0 overflow-hidden pointer-events-none">
                <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-indigo-900/20 rounded-full blur-[100px]" />
                <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-purple-900/20 rounded-full blur-[100px]" />
            </div>

            <div className="relative w-full max-w-sm p-8 bg-zinc-900 border border-zinc-800 rounded-2xl shadow-2xl">

                {/* Header */}
                <div className="text-center mb-8">
                    <h1 className="text-2xl font-bold tracking-tight mb-1">NexusAI</h1>
                    <p className="text-xs text-zinc-500 uppercase tracking-widest">Enterprise Access</p>
                </div>

                {/* Form */}
                <form onSubmit={handleSubmit} className="space-y-4">
                    {!isLogin && (
                        <div>
                            <label className="block text-xs font-semibold text-zinc-400 uppercase mb-1">Full Name</label>
                            <input
                                type="text"
                                required
                                value={fullName}
                                onChange={(e) => setFullName(e.target.value)}
                                className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-4 py-2.5 text-sm focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 outline-none transition-all"
                                placeholder="John Doe"
                            />
                        </div>
                    )}

                    <div>
                        <label className="block text-xs font-semibold text-zinc-400 uppercase mb-1">Email</label>
                        <input
                            type="email"
                            required
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-4 py-2.5 text-sm focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 outline-none transition-all"
                            placeholder="name@company.com"
                        />
                    </div>

                    <div>
                        <label className="block text-xs font-semibold text-zinc-400 uppercase mb-1">Password</label>
                        <input
                            type="password"
                            required
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-4 py-2.5 text-sm focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 outline-none transition-all"
                            placeholder="••••••••"
                        />
                    </div>

                    {error && (
                        <div className="p-3 rounded-lg bg-red-900/20 border border-red-900/50 text-red-200 text-xs text-center">
                            {error}
                        </div>
                    )}

                    <button
                        type="submit"
                        disabled={isLoading}
                        className="w-full py-3 bg-indigo-600 hover:bg-indigo-500 md:hover:scale-[1.02] active:scale-[0.98] text-white font-semibold rounded-lg transition-all flex justify-center items-center disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        {isLoading ? (
                            <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                        ) : (
                            isLogin ? 'Sign In' : 'Create Account'
                        )}
                    </button>
                </form>

                {/* Footer Toggle */}
                <div className="mt-6 text-center pt-6 border-t border-zinc-800">
                    <p className="text-xs text-zinc-500">
                        {isLogin ? "New to platform?" : "Already have an account?"}
                        <button
                            onClick={() => setIsLogin(!isLogin)}
                            className="ml-2 text-indigo-400 hover:text-indigo-300 font-medium hover:underline"
                        >
                            {isLogin ? 'Register' : 'Login'}
                        </button>
                    </p>
                </div>
            </div>
        </div>
    );
}
