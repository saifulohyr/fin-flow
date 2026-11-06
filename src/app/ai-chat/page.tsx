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
    <div className="p-6 max-w-4xl mx-auto flex flex-col h-[calc(100vh-2rem)]">
      <div className="border-b border-stone-200 pb-4 mb-4">
        <h1 className="text-2xl font-bold tracking-tight text-stone-900">AI Chat</h1>
        <p className="text-sm text-stone-500 mt-1">Konsultasikan perencanaan keuangan dan transaksi bersama asisten FinFlow.</p>
      </div>

      <div className="flex-1 overflow-y-auto space-y-4 p-4 border border-stone-200 rounded bg-white">
        {messages.length === 0 ? (
          <div className="text-sm text-stone-400 text-center py-12">
            Belum ada percakapan. Tanyakan seputar alokasi gaji, dana darurat, atau tips hemat.
          </div>
        ) : (
          messages.map((m, index) => {
            const isUser = m.role === 'user';
            return (
              <div
                key={index}
                className={`flex flex-col ${isUser ? 'items-end' : 'items-start'}`}
              >
                <div
                  className={`max-w-[80%] text-sm rounded px-3 py-2 ${
                    isUser
                      ? 'bg-stone-100 text-stone-900 text-right'
                      : 'text-left text-stone-900 leading-relaxed'
                  }`}
                >
                  {m.content}
                </div>
              </div>
            );
          })
        )}
        {loading && (
          <div className="text-sm text-stone-500 italic py-1">
            ...
          </div>
        )}
      </div>

      <form onSubmit={handleSend} className="mt-4 flex gap-2">
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Ketik pertanyaan keuanganmu..."
          className="flex-1 px-3 py-2 border border-stone-300 rounded bg-white text-sm text-stone-900 focus:outline-none focus:ring-1 focus:ring-emerald-600"
        />
        <button
          type="submit"
          disabled={loading || !input.trim()}
          className="px-4 py-2 bg-emerald-700 text-white text-sm font-medium rounded hover:bg-emerald-800 disabled:opacity-50"
        >
          Kirim
        </button>
      </form>
    </div>
  );
}
