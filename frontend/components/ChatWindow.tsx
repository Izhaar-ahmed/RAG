"use client";
import React, { useState, useRef, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';

interface Citation {
    document_name: string;
    page_number: int;
    text_snippet: string;
    score: number;
    upload_date?: string;
}

interface Message {
    role: 'user' | 'assistant';
    content: string;
    citations?: Citation[];
}

export default function ChatWindow() {
    const { token } = useAuth();
    const [messages, setMessages] = useState<Message[]>([
        { role: 'assistant', content: 'Hello. I am your secure offline intelligence. How can I assist you with your documents today?' }
    ]);
    const [input, setInput] = useState('');
    const [isStreaming, setIsStreaming] = useState(false);
    const bottomRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!input.trim() || isStreaming) return;

        const userMsg = input.trim();
        setInput('');
        setMessages(prev => [...prev, { role: 'user', content: userMsg }]);
        setIsStreaming(true);

        try {
            const res = await fetch('http://127.0.0.1:8000/chat/stream', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({ message: userMsg })
            });

            if (!res.ok) throw new Error('Failed to start stream');

            const reader = res.body?.getReader();
            const decoder = new TextDecoder();

            // Temporary message for streaming response
            setMessages(prev => [...prev, { role: 'assistant', content: '' }]);

            if (reader) {
                let accumulatedText = "";
                let accumulatedCitations: Citation[] = [];

                while (true) {
                    const { done, value } = await reader.read();
                    if (done) break;

                    const chunk = decoder.decode(value);
                    const lines = chunk.split('\n');

                    for (const line of lines) {
                        if (line.startsWith('data: ')) {
                            try {
                                const jsonStr = line.replace('data: ', '');
                                const data = JSON.parse(jsonStr);

                                if (data.token) {
                                    accumulatedText += data.token;
                                    setMessages(prev => {
                                        const newMsgs = [...prev];
                                        const last = newMsgs[newMsgs.length - 1];
                                        if (last.role === 'assistant') {
                                            last.content = accumulatedText;
                                        }
                                        return newMsgs;
                                    });
                                }
                                if (data.citations) {
                                    accumulatedCitations = data.citations;
                                }
                            } catch (e) {
                                // console.error("Parse error", e);
                            }
                        }
                    }
                }

                // Attach citations at the end
                if (accumulatedCitations.length > 0) {
                    setMessages(prev => {
                        const newMsgs = [...prev];
                        const last = newMsgs[newMsgs.length - 1];
                        if (last.role === 'assistant') {
                            last.citations = accumulatedCitations;
                        }
                        return newMsgs;
                    });
                }
            }

        } catch (error) {
            setMessages(prev => [...prev, { role: 'assistant', content: 'Connection error. Please try again.' }]);
        } finally {
            setIsStreaming(false);
        }
    };

    return (
        <div className="flex flex-col h-full relative">
            {/* Messages Area */}
            <div className="flex-1 overflow-y-auto p-6 space-y-6">
                {messages.map((msg, idx) => (
                    <div key={idx} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                        <div className={`max-w-[80%] rounded-2xl px-5 py-4 ${msg.role === 'user'
                                ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-500/10'
                                : 'bg-zinc-900 border border-zinc-800 text-zinc-200'
                            }`}>
                            <div className="whitespace-pre-wrap leading-relaxed">{msg.content}</div>

                            {/* Citations */}
                            {msg.citations && msg.citations.length > 0 && (
                                <div className="mt-4 pt-4 border-t border-zinc-800/50">
                                    <p className="text-[10px] uppercase font-bold text-zinc-500 mb-2">Sources</p>
                                    <div className="flex flex-wrap gap-2">
                                        {msg.citations.map((cit, cIdx) => (
                                            <div key={cIdx} className="bg-zinc-950 border border-zinc-800 rounded px-2 py-1.5 max-w-full">
                                                <div className="flex items-center gap-2 mb-1">
                                                    <span className="text-xs font-semibold text-indigo-400 truncate max-w-[150px]">{cit.document_name}</span>
                                                    <span className="text-[10px] text-zinc-600 bg-zinc-900 px-1 rounded">p. {cit.page_number}</span>
                                                    <span className="text-[10px] text-zinc-600">{(cit.score * 100).toFixed(0)}% Match</span>
                                                </div>
                                                <p className="text-[10px] text-zinc-500 italic line-clamp-2">"{cit.text_snippet}"</p>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                ))}
                <div ref={bottomRef} />
            </div>

            {/* Input Area */}
            <div className="p-4 border-t border-zinc-800 bg-zinc-950/80 backdrop-blur-sm">
                <form onSubmit={handleSubmit} className="relative max-w-4xl mx-auto">
                    <input
                        type="text"
                        value={input}
                        onChange={(e) => setInput(e.target.value)}
                        placeholder="Ask anything..."
                        className="w-full bg-zinc-900/50 border border-zinc-800 rounded-xl pl-5 pr-12 py-4 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500/50 transition-all text-sm placeholder-zinc-500 shadow-xl"
                        disabled={isStreaming}
                    />
                    <button
                        type="submit"
                        disabled={!input.trim() || isStreaming}
                        className="absolute right-2 top-2 p-2 bg-indigo-600 hover:bg-indigo-500 rounded-lg text-white disabled:opacity-0 disabled:scale-90 transition-all duration-200"
                    >
                        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 12h14M12 5l7 7-7 7" />
                        </svg>
                    </button>
                </form>
                <p className="text-center text-[10px] text-zinc-600 mt-3 font-medium">
                    AI generated content. Check accuracy against source documents.
                </p>
            </div>
        </div>
    );
}
