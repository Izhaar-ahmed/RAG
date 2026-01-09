"use client";
import React, { useState, useRef, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';

interface Citation {
    document_name: string;
    page_number: number;
    text_snippet: string;
    score: number;
    upload_date?: string;
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
            timestamp: ''
        }
    ]);
    const [input, setInput] = useState('');
    const [loading, setLoading] = useState(false);
    const scrollRef = useRef<HTMLDivElement>(null);
    const { token } = useAuth();

    useEffect(() => {
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
        if (!input.trim() || !token) return;

        const userMsg = input;
        const timestamp = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

        setMessages(prev => [...prev, { role: 'user', content: userMsg, timestamp }]);
        setInput('');
        setLoading(true);

        try {
            setMessages(prev => [...prev, { role: 'assistant', content: '', citations: [], timestamp }]);

            const res = await fetch('http://127.0.0.1:8000/chat/stream', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
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
        <div className="flex flex-col h-full bg-bg-deepest">
            {/* Header */}
            <div className="px-6 py-5 border-b border-border-subtle flex justify-between items-center bg-bg-primary">
                <div>
                    <h2 className="text-lg font-semibold text-white leading-none">
                        Intelligence Hub
                    </h2>
                    <p className="text-xs text-gray-500 mt-1">
                        Ask questions about your documents
                    </p>
                </div>
                <div className="flex items-center gap-2 px-3 py-1 bg-accent-emerald/10 rounded-full border border-accent-emerald/20">
                    <span className="w-1.5 h-1.5 rounded-full bg-accent-emerald animate-pulse" />
                    <span className="text-[11px] font-semibold text-accent-emerald">Online</span>
                </div>
            </div>

            {/* Messages */}
            <div
                ref={scrollRef}
                className="flex-1 overflow-y-auto p-6 flex flex-col gap-6 custom-scrollbar"
            >
                {messages.map((msg, idx) => (
                    <div
                        key={idx}
                        className={`flex gap-3 ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
                    >
                        {/* Assistant Avatar */}
                        {msg.role === 'assistant' && (
                            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-accent-indigo to-accent-purple flex items-center justify-center flex-shrink-0 shadow-lg shadow-indigo-500/20">
                                <svg className="w-4.5 h-4.5 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                    <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5" strokeLinecap="round" strokeLinejoin="round" />
                                </svg>
                            </div>
                        )}

                        {/* Message Bubble */}
                        <div className={`max-w-[70%] ${msg.role === 'user' ? 'text-right' : ''}`}>
                            <div className={`
                                px-5 py-3.5 shadow-md
                                ${msg.role === 'user'
                                    ? 'bg-gradient-to-br from-accent-indigo to-accent-purple text-white rounded-2xl rounded-tr-sm shadow-glow-indigo'
                                    : 'bg-bg-tertiary border border-border-subtle text-gray-200 rounded-2xl rounded-tl-none'}
                            `}>
                                <p className="text-[14px] leading-relaxed whitespace-pre-wrap">
                                    {msg.content}
                                    {loading && msg.role === 'assistant' && idx === messages.length - 1 && !msg.content && (
                                        <span className="inline-flex gap-1 ml-2">
                                            <span className="w-1 h-1 rounded-full bg-accent-indigo animate-bounce" />
                                            <span className="w-1 h-1 rounded-full bg-accent-purple animate-bounce delay-100" />
                                            <span className="w-1 h-1 rounded-full bg-accent-cyan animate-bounce delay-200" />
                                        </span>
                                    )}
                                </p>

                                {/* Citations */}
                                {msg.citations && msg.citations.length > 0 && (
                                    <div className="mt-3 pt-3 border-t border-white/10">
                                        <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider mb-2">
                                            Sources
                                        </p>
                                        <div className="grid gap-2">
                                            {msg.citations.map((cit, cIdx) => (
                                                <div key={cIdx} className="p-2.5 rounded-lg bg-black/20 border border-white/5 text-left">
                                                    <div className="flex justify-between items-center mb-1">
                                                        <span className="text-[11px] font-medium text-accent-cyan truncate max-w-[150px]">
                                                            {cit.document_name}
                                                        </span>
                                                        <div className="flex items-center gap-2">
                                                            {cit.upload_date && (
                                                                <span className="text-[9px] text-accent-emerald font-mono">
                                                                    {new Date(cit.upload_date).toLocaleDateString()}
                                                                </span>
                                                            )}
                                                            <span className="text-[10px] text-gray-400 font-mono">p.{cit.page_number}</span>
                                                        </div>
                                                    </div>
                                                    <p className="text-[11px] text-gray-400 italic line-clamp-2">
                                                        {cit.text_snippet}
                                                    </p>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                )}
                            </div>
                            <p className="text-[10px] text-gray-500 mt-1.5 opacity-70">
                                {msg.timestamp}
                            </p>
                        </div>

                        {/* User Avatar */}
                        {msg.role === 'user' && (
                            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-accent-cyan to-blue-500 flex items-center justify-center flex-shrink-0 shadow-lg shadow-cyan-500/20">
                                <svg className="w-4.5 h-4.5 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                                </svg>
                            </div>
                        )}
                    </div>
                ))}
            </div>

            {/* Input Area */}
            <div className="p-5 border-t border-border-subtle bg-bg-primary">
                <div className="flex items-center gap-3 bg-bg-tertiary rounded-xl border border-border-default p-1.5 focus-within:border-accent-indigo focus-within:ring-1 focus-within:ring-accent-indigo/50 transition-all shadow-inner">
                    <input
                        type="text"
                        className="flex-1 bg-transparent border-none outline-none px-4 py-2.5 text-sm text-white placeholder-gray-500"
                        placeholder="Ask a question about your documents..."
                        value={input}
                        onChange={(e) => setInput(e.target.value)}
                        onKeyDown={(e) => e.key === 'Enter' && !loading && sendMessage()}
                        disabled={loading}
                    />
                    <button
                        onClick={sendMessage}
                        disabled={loading || !input.trim()}
                        className={`
                            p-2.5 rounded-lg flex items-center justify-center transition-all duration-200
                            ${loading || !input.trim()
                                ? 'bg-gray-800 text-gray-500 cursor-not-allowed'
                                : 'bg-gradient-to-r from-accent-indigo to-accent-purple text-white shadow-lg shadow-indigo-500/30 hover:shadow-indigo-500/50 hover:scale-105 active:scale-95'}
                        `}
                    >
                        <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M6 12L3.269 3.126A59.768 59.768 0 0121.485 12 59.77 59.77 0 013.27 20.876L5.999 12zm0 0h7.5" />
                        </svg>
                    </button>
                </div>
                <p className="text-center text-[10px] text-gray-500 mt-3 font-medium flex items-center justify-center gap-1.5">
                    <svg className="w-3 h-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                    </svg>
                    Secure Enterprise Environment • Zero Data Leakage
                </p>
            </div>
        </div>
    );
}
