"use client";
import React, { useState, useRef, useEffect } from 'react';

interface Citation {
    document_name: string;
    page_number: number;
    text_snippet: string;
    score: number;
}

interface Message {
    role: 'user' | 'assistant';
    content: string;
    citations?: Citation[];
    timestamp?: string;
}

export default function ChatWindow() {
    const [messages, setMessages] = useState<Message[]>([
        {
            role: 'assistant',
            content: 'Welcome to NexusAI. I can analyze your documents and answer questions with precise citations. Upload some files to get started.',
            citations: [],
            timestamp: '' // Empty on server, set on client
        }
    ]);
    const [input, setInput] = useState('');
    const [loading, setLoading] = useState(false);
    const [mounted, setMounted] = useState(false);
    const scrollRef = useRef<HTMLDivElement>(null);

    // Set timestamp on client mount to avoid hydration mismatch
    useEffect(() => {
        setMounted(true);
        setMessages(prev => {
            const updated = [...prev];
            if (updated[0] && !updated[0].timestamp) {
                updated[0].timestamp = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
            }
            return updated;
        });
    }, []);

    useEffect(() => {
        scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' });
    }, [messages]);


    const sendMessage = async () => {
        if (!input.trim()) return;

        const userMsg = input;
        const timestamp = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

        setMessages(prev => [...prev, { role: 'user', content: userMsg, timestamp }]);
        setInput('');
        setLoading(true);

        try {
            setMessages(prev => [...prev, { role: 'assistant', content: '', citations: [], timestamp }]);

            const res = await fetch('http://127.0.0.1:8000/chat/stream', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ message: userMsg }),
            });

            if (!res.body) throw new Error("No body");

            const reader = res.body.getReader();
            const decoder = new TextDecoder();
            let buffer = '';

            while (true) {
                const { value, done } = await reader.read();
                if (done) break;

                const chunk = decoder.decode(value, { stream: true });
                buffer += chunk;

                const lines = buffer.split('\n\n');
                buffer = lines.pop() || '';

                for (const line of lines) {
                    if (line.trim().startsWith('event: citations')) {
                        const dataLine = line.split('\n')[1];
                        if (dataLine && dataLine.startsWith('data: ')) {
                            const citParams = JSON.parse(dataLine.replace('data: ', ''));
                            setMessages(prev => {
                                const newMsg = [...prev];
                                newMsg[newMsg.length - 1].citations = citParams;
                                return newMsg;
                            });
                        }
                    } else if (line.trim().startsWith('data: ')) {
                        try {
                            const jsonStr = line.replace('data: ', '');
                            const eventData = JSON.parse(jsonStr);

                            if (eventData.token) {
                                setMessages(prev => {
                                    const newMsg = [...prev];
                                    const lastMsgIndex = newMsg.length - 1;
                                    const updatedMsg = { ...newMsg[lastMsgIndex] };
                                    updatedMsg.content += eventData.token;
                                    newMsg[lastMsgIndex] = updatedMsg;
                                    return newMsg;
                                });
                            } else if (eventData.answer) {
                                setMessages(prev => {
                                    const newMsg = [...prev];
                                    newMsg[newMsg.length - 1].content = eventData.answer;
                                    return newMsg;
                                });
                            }
                        } catch (e) {
                            console.error("Parse error", e);
                        }
                    }
                }
            }

        } catch (error) {
            setMessages(prev => {
                const newMsg = [...prev];
                const last = newMsg[newMsg.length - 1];
                if (last.role === 'assistant' && !last.content) {
                    last.content = "Connection error. Please check if the backend is running.";
                }
                return newMsg;
            });
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="flex flex-col h-full relative">
            {/* Background effects */}
            <div className="absolute inset-0 pointer-events-none overflow-hidden">
                <div className="absolute top-1/4 right-1/4 w-96 h-96 bg-indigo-500/5 rounded-full blur-3xl" />
                <div className="absolute bottom-1/4 left-1/4 w-80 h-80 bg-purple-500/5 rounded-full blur-3xl" />
            </div>

            {/* Header */}
            <div className="relative z-10 px-8 py-5 border-b border-white/5 glass">
                <div className="flex items-center justify-between">
                    <div>
                        <h2 className="text-lg font-semibold text-white">Intelligence Hub</h2>
                        <p className="text-xs text-slate-500">Ask anything about your documents</p>
                    </div>
                    <div className="flex items-center gap-3">
                        <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-emerald-500/10">
                            <div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                            <span className="text-xs font-medium text-emerald-400">Online</span>
                        </div>
                    </div>
                </div>
            </div>

            {/* Messages */}
            <div className="relative z-10 flex-1 overflow-y-auto px-8 py-6 space-y-6" ref={scrollRef}>
                {messages.map((msg, idx) => (
                    <div
                        key={idx}
                        className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'} animate-fade-up`}
                        style={{ animationDelay: `${idx * 50}ms` }}
                    >
                        {msg.role === 'assistant' && (
                            <div className="flex-shrink-0 w-10 h-10 mr-4 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 p-[1px]">
                                <div className="w-full h-full rounded-xl bg-slate-900 flex items-center justify-center">
                                    <svg className="w-5 h-5 text-indigo-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                        <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5" strokeLinecap="round" strokeLinejoin="round" />
                                    </svg>
                                </div>
                            </div>
                        )}

                        <div className={`max-w-[75%] ${msg.role === 'user' ? 'order-first' : ''}`}>
                            <div className={`rounded-2xl p-5 ${msg.role === 'user'
                                ? 'bg-gradient-to-br from-indigo-600 to-purple-600 text-white rounded-br-sm'
                                : 'glass rounded-bl-sm'
                                }`}>
                                <p className={`text-sm leading-relaxed whitespace-pre-wrap ${msg.role === 'assistant' ? 'text-slate-200' : ''
                                    }`}>
                                    {msg.content}
                                </p>

                                {msg.citations && msg.citations.length > 0 && (
                                    <div className="mt-4 pt-4 border-t border-white/10">
                                        <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-3 flex items-center gap-2">
                                            <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
                                            </svg>
                                            Sources
                                        </p>
                                        <div className="space-y-2">
                                            {msg.citations.map((cit, cIdx) => (
                                                <div key={cIdx} className="group glass-light rounded-xl p-3 hover:bg-white/5 transition-all cursor-pointer">
                                                    <div className="flex items-center justify-between mb-1.5">
                                                        <span className="text-xs font-semibold text-cyan-400 group-hover:text-cyan-300 transition-colors">
                                                            {cit.document_name}
                                                        </span>
                                                        <span className="text-[10px] text-slate-600 bg-slate-800/50 px-2 py-0.5 rounded-full font-mono">
                                                            p.{cit.page_number}
                                                        </span>
                                                    </div>
                                                    <p className="text-xs text-slate-500 line-clamp-2 italic">
                                                        "{cit.text_snippet}"
                                                    </p>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                )}
                            </div>
                            <p className={`text-[10px] text-slate-600 mt-1.5 ${msg.role === 'user' ? 'text-right' : ''}`}>
                                {msg.timestamp}
                            </p>
                        </div>

                        {msg.role === 'user' && (
                            <div className="flex-shrink-0 w-10 h-10 ml-4 rounded-xl bg-gradient-to-br from-cyan-500 to-blue-600 flex items-center justify-center">
                                <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                                </svg>
                            </div>
                        )}
                    </div>
                ))}

                {loading && (
                    <div className="flex justify-start animate-fade-up">
                        <div className="w-10 h-10 mr-4 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 p-[1px]">
                            <div className="w-full h-full rounded-xl bg-slate-900 flex items-center justify-center">
                                <div className="flex gap-1">
                                    <span className="w-1.5 h-1.5 bg-indigo-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                                    <span className="w-1.5 h-1.5 bg-purple-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                                    <span className="w-1.5 h-1.5 bg-cyan-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                                </div>
                            </div>
                        </div>
                    </div>
                )}
            </div>

            {/* Input */}
            <div className="relative z-10 p-6 glass border-t border-white/5">
                <div className="max-w-4xl mx-auto">
                    <div className="relative group">
                        <div className="absolute -inset-0.5 bg-gradient-to-r from-indigo-500 via-purple-500 to-cyan-500 rounded-2xl opacity-20 group-hover:opacity-40 blur transition-opacity" />
                        <div className="relative flex items-center bg-slate-900 rounded-2xl">
                            <input
                                type="text"
                                className="flex-1 bg-transparent text-white text-sm py-4 px-6 placeholder-slate-600 focus:outline-none"
                                placeholder="Ask a question about your documents..."
                                value={input}
                                onChange={(e) => setInput(e.target.value)}
                                onKeyDown={(e) => e.key === 'Enter' && !loading && sendMessage()}
                                disabled={loading}
                            />
                            <button
                                onClick={sendMessage}
                                disabled={loading || !input.trim()}
                                className="m-2 p-3 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white rounded-xl transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
                                </svg>
                            </button>
                        </div>
                    </div>
                    <p className="text-center text-[11px] text-slate-600 mt-3">
                        Powered by <span className="gradient-text font-semibold">NexusAI</span> • 100% Offline • Your data never leaves this device
                    </p>
                </div>
            </div>
        </div>
    );
}
