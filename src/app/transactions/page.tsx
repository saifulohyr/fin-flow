'use client';

import { useState, useEffect } from 'react';
import { parseTransactionNLU } from '@/lib/nlu-parser';

interface TransactionItem {
  id: string;
  title?: string;
  note?: string;
  amount: number;
  type: 'income' | 'expense' | 'transfer';
  date: string;
  accountId?: string;
  categoryId?: string;
}

const currencyFormatter = new Intl.NumberFormat('id-ID', {
  style: 'currency',
  currency: 'IDR',
  maximumFractionDigits: 0,
});

export default function TransactionsPage() {
  const [transactions, setTransactions] = useState<TransactionItem[]>([]);
  const [nluInput, setNluInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchTransactions = async () => {
    try {
      const res = await fetch('/api/transactions');
      if (res.ok) {
        const data = await res.json();
        setTransactions(Array.isArray(data) ? data : []);
      }
    } catch {
      setError('Gagal memuat transaksi');
    }
  };

  useEffect(() => {
    fetchTransactions();
  }, []);

  const handleNluSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!nluInput.trim()) return;

    setLoading(true);
    setError(null);
    try {
      const parsed = parseTransactionNLU(nluInput);
      const payload = {
        title: parsed.title || nluInput.trim(),
        note: nluInput.trim(),
        amount: parsed.amount && parsed.amount > 0 ? parsed.amount : 10000,
        type: parsed.type || 'expense',
        date: new Date().toISOString().split('T')[0],
        accountId: parsed.account || 'acc-1',
        categoryId: parsed.category || 'cat-default',
      };

      const res = await fetch('/api/transactions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        throw new Error('Gagal menambah transaksi');
      }

      setNluInput('');
      await fetchTransactions();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Terjadi kesalahan');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    try {
      const res = await fetch(`/api/transactions/${id}`, { method: 'DELETE' });
      if (res.ok) {
        setTransactions((prev) => prev.filter((tx) => tx.id !== id));
      }
    } catch {
      setError('Gagal menghapus transaksi');
    }
  };

  return (
    <div className="p-4 sm:p-6 max-w-5xl mx-auto space-y-5">
      {/* Header */}
      <div className="border-b border-stone-200 pb-4">
        <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-stone-900">Transaksi</h1>
        <p className="text-xs sm:text-sm text-stone-500 mt-1">Catat pengeluaran & pemasukan dengan bahasa natural.</p>
      </div>

      {/* NLU Input */}
      <form onSubmit={handleNluSubmit} className="space-y-2">
        <div className="flex gap-2">
          <input
            type="text"
            value={nluInput}
            onChange={(e) => setNluInput(e.target.value)}
            placeholder='"kopi 25rb bca" atau "gaji 5jt mandiri"'
            className="flex-1 px-3 py-2.5 border border-stone-300 rounded-md bg-white text-sm text-stone-900 focus:outline-none focus:ring-1 focus:ring-emerald-600 min-w-0"
          />
          <button
            type="submit"
            disabled={loading}
            className="px-4 py-2.5 bg-emerald-700 text-white text-sm font-medium rounded-md hover:bg-emerald-800 disabled:opacity-50 shrink-0"
          >
            {loading ? '...' : 'Tambah'}
          </button>
        </div>
        {error && <p className="text-xs text-red-600">{error}</p>}
      </form>

      {/* Transactions — card list on mobile, table on desktop */}
      <div className="sm:hidden space-y-2">
        {transactions.length === 0 ? (
          <div className="py-8 text-center text-sm text-stone-400">Belum ada transaksi.</div>
        ) : (
          transactions.map((tx) => {
            const isExpense = tx.type === 'expense';
            return (
              <div key={tx.id} className="bg-white border border-stone-200 rounded-lg px-4 py-3 flex items-center justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-sm font-medium text-stone-900 truncate">{tx.note || tx.title || '-'}</p>
                  <p className="text-[11px] text-stone-500 font-mono mt-0.5">{tx.date} · <span className="uppercase">{tx.type}</span></p>
                </div>
                <div className="flex items-center gap-3 shrink-0">
                  <span className={`text-sm font-bold tabular-nums ${isExpense ? 'text-[#B45309]' : 'text-[#047857]'}`}>
                    {isExpense ? '-' : '+'}{currencyFormatter.format(tx.amount)}
                  </span>
                  <button
                    onClick={() => handleDelete(tx.id)}
                    className="text-xs text-stone-400 hover:text-red-600 transition-colors"
                    aria-label="Hapus transaksi"
                  >
                    ✕
                  </button>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Table — desktop only */}
      <div className="hidden sm:block border border-stone-200 rounded-lg overflow-hidden bg-white">
        <table className="w-full text-left text-sm">
          <thead className="bg-[#FAF9F5] border-b border-stone-200 text-stone-600 font-medium text-xs uppercase tracking-wider">
            <tr>
              <th className="py-3 px-4">Tanggal</th>
              <th className="py-3 px-4">Keterangan</th>
              <th className="py-3 px-4 text-right">Nominal</th>
              <th className="py-3 px-4">Tipe</th>
              <th className="py-3 px-4 text-center">Hapus</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-stone-100">
            {transactions.length === 0 ? (
              <tr>
                <td colSpan={5} className="py-10 text-center text-stone-400 text-sm">Belum ada transaksi.</td>
              </tr>
            ) : (
              transactions.map((tx) => {
                const isExpense = tx.type === 'expense';
                return (
                  <tr key={tx.id} className="hover:bg-stone-50/60 transition-colors">
                    <td className="py-3 px-4 text-stone-500 tabular-nums text-xs font-mono">{tx.date}</td>
                    <td className="py-3 px-4 text-stone-900 font-medium">{tx.note || tx.title || '-'}</td>
                    <td className={`py-3 px-4 text-right font-semibold tabular-nums ${isExpense ? 'text-[#B45309]' : 'text-[#047857]'}`}>
                      {isExpense ? '-' : '+'}{currencyFormatter.format(tx.amount)}
                    </td>
                    <td className="py-3 px-4 text-stone-500 uppercase text-xs tracking-wider">{tx.type}</td>
                    <td className="py-3 px-4 text-center">
                      <button onClick={() => handleDelete(tx.id)} className="text-xs text-stone-400 hover:text-red-600 transition-colors underline">
                        Hapus
                      </button>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
