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
    <div className="p-6 max-w-5xl mx-auto space-y-6">
      <div className="border-b border-stone-200 pb-4">
        <h1 className="text-2xl font-bold tracking-tight text-stone-900">Transaksi</h1>
        <p className="text-sm text-stone-500 mt-1">Catat dan kelola riwayat transaksi pengeluaran dan pemasukan.</p>
      </div>

      <form onSubmit={handleNluSubmit} className="space-y-2">
        <div className="flex gap-2">
          <input
            type="text"
            value={nluInput}
            onChange={(e) => setNluInput(e.target.value)}
            placeholder='Ketik transaksi, misal: "kopi 25rb bca" atau "gaji 5jt mandiri"...'
            className="flex-1 px-3 py-2 border border-stone-300 rounded bg-white text-sm text-stone-900 focus:outline-none focus:ring-1 focus:ring-emerald-600"
          />
          <button
            type="submit"
            disabled={loading}
            className="px-4 py-2 bg-emerald-700 text-white text-sm rounded hover:bg-emerald-800 disabled:opacity-50"
          >
            {loading ? 'Menyimpan...' : 'Tambah'}
          </button>
        </div>
        {error && <p className="text-xs text-red-600">{error}</p>}
      </form>

      <div className="border border-stone-200 rounded overflow-hidden bg-white">
        <table className="w-full text-left text-sm">
          <thead className="bg-[#FAF9F5] border-b border-stone-200 text-stone-600 font-medium">
            <tr>
              <th className="py-3 px-4">Date</th>
              <th className="py-3 px-4">Description</th>
              <th className="py-3 px-4 text-right">Amount</th>
              <th className="py-3 px-4">Type</th>
              <th className="py-3 px-4 text-center">Delete</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-stone-200">
            {transactions.length === 0 ? (
              <tr>
                <td colSpan={5} className="py-8 text-center text-stone-500">
                  Belum ada transaksi.
                </td>
              </tr>
            ) : (
              transactions.map((tx) => {
                const isExpense = tx.type === 'expense';
                return (
                  <tr key={tx.id} className="hover:bg-stone-50">
                    <td className="py-3 px-4 text-stone-600 tabular-nums">{tx.date}</td>
                    <td className="py-3 px-4 text-stone-900 font-medium">{tx.note || tx.title || '-'}</td>
                    <td
                      className={`py-3 px-4 text-right font-medium tabular-nums ${
                        isExpense ? 'text-[#B45309]' : 'text-[#047857]'
                      }`}
                    >
                      {isExpense ? '-' : '+'}
                      {currencyFormatter.format(tx.amount)}
                    </td>
                    <td className="py-3 px-4 text-stone-600 uppercase text-xs tracking-wider">{tx.type}</td>
                    <td className="py-3 px-4 text-center">
                      <button
                        onClick={() => handleDelete(tx.id)}
                        className="text-xs text-stone-500 hover:text-red-700 underline"
                      >
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
