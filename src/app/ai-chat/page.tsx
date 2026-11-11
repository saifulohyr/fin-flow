'use client';

import { useState } from 'react';

interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
}

export default function AiChatPage() {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || loading) return;

    const userText = input.trim();
    const newMessages: ChatMessage[] = [...messages, { role: 'user', content: userText }];
    setMessages(newMessages);
    setInput('');
    setLoading(true);

    try {
      const res = await fetch('/api/ai/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: newMessages.map((m) => ({ role: m.role, content: m.content })),
        }),
      });

      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        throw new Error(errorData.error || 'Gagal menghubungi AI');
      }

      const data = await res.json();
      setMessages([...newMessages, { role: 'assistant', content: data.reply || 'Tidak ada balasan.' }]);
    } catch (err: unknown) {
      setMessages([
        ...newMessages,
        {
          role: 'assistant',
          content: `Maaf, terjadi kesalahan: ${err instanceof Error ? err.message : 'Silakan coba lagi.'}`,
        },
      ]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col h-[calc(100dvh-4rem)] lg:h-screen max-w-3xl mx-auto p-4 sm:p-6 gap-0">
      {/* Header */}
      <div className="border-b border-stone-200 pb-3 mb-3 shrink-0">
        <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-stone-900">AI Chat</h1>
        <p className="text-xs sm:text-sm text-stone-500 mt-0.5">Tanya soal alokasi gaji, dana darurat, atau tips hemat.</p>
      </div>

      {/* Chat Area */}
      <div className="flex-1 overflow-y-auto space-y-3 py-2">
        {messages.length === 0 ? (
          <div className="text-sm text-stone-400 text-center py-16 leading-relaxed">
            Belum ada percakapan.<br/>
            <span className="text-[11px] text-stone-300">Contoh: &ldquo;Berapa dana darurat idealnya kalau gaji 5jt?&rdquo;</span>
          </div>
        ) : (
          messages.map((m, index) => {
            const isUser = m.role === 'user';
            return (
              <div key={index} className={`flex ${isUser ? 'justify-end' : 'justify-start'}`}>
                <div className={`max-w-[85%] sm:max-w-[75%] text-sm px-3.5 py-2.5 rounded-2xl leading-relaxed ${
                  isUser
                    ? 'bg-stone-900 text-stone-50 rounded-br-sm'
                    : 'bg-white border border-stone-200 text-stone-900 rounded-bl-sm'
                }`}>
                  {m.content}
                </div>
              </div>
            );
          })
        )}
        {loading && (
          <div className="flex justify-start">
            <div className="bg-white border border-stone-200 rounded-2xl rounded-bl-sm px-4 py-2.5">
              <span className="text-stone-400 text-xs tracking-widest">···</span>
            </div>
          </div>
        )}
      </div>

      {/* Input */}
      <form onSubmit={handleSend} className="mt-3 flex gap-2 shrink-0 pb-safe">
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Ketik pertanyaan keuanganmu..."
          className="flex-1 px-4 py-3 border border-stone-300 rounded-xl bg-white text-sm text-stone-900 focus:outline-none focus:ring-1 focus:ring-emerald-600 min-w-0"
        />
        <button
          type="submit"
          disabled={loading || !input.trim()}
          className="px-4 py-3 bg-emerald-700 text-white text-sm font-medium rounded-xl hover:bg-emerald-800 disabled:opacity-50 transition-colors shrink-0"
        >
          Kirim
        </button>
      </form>
    </div>
  );
}
