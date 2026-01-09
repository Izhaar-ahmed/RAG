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
            timestamp: ''
        }
    ]);
    const [input, setInput] = useState('');
    const [loading, setLoading] = useState(false);
    const scrollRef = useRef<HTMLDivElement>(null);

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
        <div style={{
            display: 'flex',
            flexDirection: 'column',
            height: '100%',
            backgroundColor: '#0a0a0d'
        }}>
            {/* Header */}
            <div style={{
                padding: '20px 24px',
                borderBottom: '1px solid rgba(255,255,255,0.08)',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                backgroundColor: '#0f0f14'
            }}>
                <div>
                    <h2 style={{ fontSize: '18px', fontWeight: 600, color: 'white', margin: 0 }}>
                        Intelligence Hub
                    </h2>
                    <p style={{ fontSize: '12px', color: '#71717a', margin: '4px 0 0 0' }}>
                        Ask questions about your documents
                    </p>
                </div>
                <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                    padding: '4px 12px',
                    backgroundColor: 'rgba(16,185,129,0.15)',
                    borderRadius: '20px',
                    fontSize: '11px',
                    fontWeight: 600,
                    color: '#34d399'
                }}>
                    <span style={{ width: '6px', height: '6px', borderRadius: '50%', backgroundColor: '#34d399' }} />
                    Online
                </div>
            </div>

            {/* Messages */}
            <div
                ref={scrollRef}
                style={{
                    flex: 1,
                    overflowY: 'auto',
                    padding: '24px',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '16px'
                }}
            >
                {messages.map((msg, idx) => (
                    <div
                        key={idx}
                        style={{
                            display: 'flex',
                            gap: '12px',
                            justifyContent: msg.role === 'user' ? 'flex-end' : 'flex-start'
                        }}
                    >
                        {/* Assistant Avatar */}
                        {msg.role === 'assistant' && (
                            <div style={{
                                width: '36px',
                                height: '36px',
                                borderRadius: '10px',
                                background: 'linear-gradient(135deg, #6366f1, #8b5cf6)',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                flexShrink: 0
                            }}>
                                <svg style={{ width: '18px', height: '18px' }} viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2">
                                    <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5" strokeLinecap="round" strokeLinejoin="round" />
                                </svg>
                            </div>
                        )}

                        {/* Message */}
                        <div style={{ maxWidth: '70%' }}>
                            <div style={{
                                padding: '14px 18px',
                                borderRadius: msg.role === 'user' ? '18px 18px 4px 18px' : '18px 18px 18px 4px',
                                backgroundColor: msg.role === 'user' ? '#6366f1' : '#18181d',
                                border: msg.role === 'assistant' ? '1px solid rgba(255,255,255,0.08)' : 'none',
                                color: 'white'
                            }}>
                                <p style={{ margin: 0, fontSize: '14px', lineHeight: 1.6, whiteSpace: 'pre-wrap' }}>
                                    {msg.content}
                                    {loading && msg.role === 'assistant' && idx === messages.length - 1 && !msg.content && (
                                        <span style={{ display: 'inline-flex', gap: '4px', marginLeft: '4px' }}>
                                            <span style={{ width: '4px', height: '4px', borderRadius: '50%', backgroundColor: '#6366f1', animation: 'bounce 1s infinite' }} />
                                            <span style={{ width: '4px', height: '4px', borderRadius: '50%', backgroundColor: '#8b5cf6', animation: 'bounce 1s infinite 0.1s' }} />
                                            <span style={{ width: '4px', height: '4px', borderRadius: '50%', backgroundColor: '#22d3ee', animation: 'bounce 1s infinite 0.2s' }} />
                                        </span>
                                    )}
                                </p>

                                {/* Citations */}
                                {msg.citations && msg.citations.length > 0 && (
                                    <div style={{ marginTop: '12px', paddingTop: '12px', borderTop: '1px solid rgba(255,255,255,0.1)' }}>
                                        <p style={{ fontSize: '10px', fontWeight: 600, color: '#71717a', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '8px' }}>
                                            Sources
                                        </p>
                                        {msg.citations.map((cit, cIdx) => (
                                            <div key={cIdx} style={{
                                                padding: '10px',
                                                borderRadius: '8px',
                                                backgroundColor: '#111116',
                                                border: '1px solid rgba(255,255,255,0.06)',
                                                marginBottom: '6px'
                                            }}>
                                                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                                                    <span style={{ fontSize: '11px', fontWeight: 500, color: '#22d3ee' }}>{cit.document_name}</span>
                                                    <span style={{ fontSize: '10px', color: '#52525b', fontFamily: 'monospace' }}>p.{cit.page_number}</span>
                                                </div>
                                                <p style={{ fontSize: '11px', color: '#71717a', margin: 0, fontStyle: 'italic' }}>{cit.text_snippet}</p>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                            <p style={{ fontSize: '10px', color: '#52525b', margin: '6px 0 0 0', textAlign: msg.role === 'user' ? 'right' : 'left' }}>
                                {msg.timestamp}
                            </p>
                        </div>

                        {/* User Avatar */}
                        {msg.role === 'user' && (
                            <div style={{
                                width: '36px',
                                height: '36px',
                                borderRadius: '10px',
                                background: 'linear-gradient(135deg, #06b6d4, #3b82f6)',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                flexShrink: 0
                            }}>
                                <svg style={{ width: '18px', height: '18px' }} viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2">
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                                </svg>
                            </div>
                        )}
                    </div>
                ))}
            </div>

            {/* Input */}
            <div style={{
                padding: '20px 24px',
                borderTop: '1px solid rgba(255,255,255,0.08)',
                backgroundColor: '#0f0f14'
            }}>
                <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '12px',
                    backgroundColor: '#18181d',
                    borderRadius: '12px',
                    border: '1px solid rgba(255,255,255,0.1)',
                    padding: '4px'
                }}>
                    <input
                        type="text"
                        style={{
                            flex: 1,
                            backgroundColor: 'transparent',
                            border: 'none',
                            outline: 'none',
                            padding: '12px 16px',
                            fontSize: '14px',
                            color: '#ffffff',
                            caretColor: '#6366f1'
                        }}
                        placeholder="Ask a question about your documents..."
                        value={input}
                        onChange={(e) => setInput(e.target.value)}
                        onKeyDown={(e) => e.key === 'Enter' && !loading && sendMessage()}
                        disabled={loading}
                    />
                    <button
                        onClick={sendMessage}
                        disabled={loading || !input.trim()}
                        style={{
                            padding: '12px',
                            borderRadius: '10px',
                            border: 'none',
                            background: 'linear-gradient(135deg, #6366f1, #8b5cf6)',
                            cursor: loading || !input.trim() ? 'not-allowed' : 'pointer',
                            opacity: loading || !input.trim() ? 0.5 : 1,
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center'
                        }}
                    >
                        <svg style={{ width: '20px', height: '20px' }} viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
                        </svg>
                    </button>
                </div>
                <p style={{ textAlign: 'center', fontSize: '11px', color: '#52525b', marginTop: '12px' }}>
                    100% Offline • Your data never leaves this device
                </p>
            </div>
        </div>
    );
}
