'use client';

import { useState, useEffect } from 'react';

interface AccountItem {
  id: string;
  name: string;
  type: 'bank' | 'ewallet' | 'cash' | 'investment';
  balance: number;
  accountNumber?: string;
  color?: string;
}

const currencyFormatter = new Intl.NumberFormat('id-ID', {
  style: 'currency',
  currency: 'IDR',
  maximumFractionDigits: 0,
});

export default function AccountsPage() {
  const [accounts, setAccounts] = useState<AccountItem[]>([]);
  const [name, setName] = useState('');
  const [type, setType] = useState<'bank' | 'ewallet' | 'cash' | 'investment'>('bank');
  const [initialBalance, setInitialBalance] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchAccounts = async () => {
    try {
      const res = await fetch('/api/accounts');
      if (res.ok) {
        const data = await res.json();
        setAccounts(Array.isArray(data) ? data : []);
      }
    } catch {
      setError('Gagal memuat rekening');
    }
  };

  useEffect(() => {
    fetchAccounts();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    setLoading(true);
    setError(null);
    try {
      const parsedBalance = parseInt(initialBalance.replace(/\D/g, ''), 10) || 0;
      const res = await fetch('/api/accounts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: name.trim(),
          type,
          balance: parsedBalance,
        }),
      });

      if (!res.ok) {
        throw new Error('Gagal menambah rekening');
      }

      setName('');
      setInitialBalance('');
      setType('bank');
      await fetchAccounts();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Terjadi kesalahan');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-6 max-w-4xl mx-auto space-y-8">
      <div className="border-b border-stone-200 pb-4">
        <h1 className="text-2xl font-bold tracking-tight text-stone-900">Rekening</h1>
        <p className="text-sm text-stone-500 mt-1">Daftar saldo dan manajemen akun keuangan Anda.</p>
      </div>

      <div className="space-y-3">
        <h2 className="text-sm font-semibold uppercase tracking-wider text-stone-600">Daftar Rekening</h2>
        <div className="border border-stone-200 rounded divide-y divide-stone-200 bg-white">
          {accounts.length === 0 ? (
            <div className="p-4 text-sm text-stone-500">Belum ada rekening tercatat.</div>
          ) : (
            accounts.map((acc) => (
              <div key={acc.id} className="p-4 flex items-center justify-between">
                <div>
                  <div className="font-medium text-stone-900">{acc.name}</div>
                  <div className="text-xs text-stone-500 uppercase tracking-wider mt-0.5">{acc.type}</div>
                </div>
                <div className="text-base font-semibold tabular-nums text-stone-900">
                  {currencyFormatter.format(acc.balance)}
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      <div className="border-t border-stone-200 pt-6">
        <h2 className="text-sm font-semibold uppercase tracking-wider text-stone-600 mb-4">Tambah Rekening Baru</h2>
        <form onSubmit={handleSubmit} className="space-y-4 max-w-md">
          {error && <p className="text-xs text-red-600">{error}</p>}
          <div>
            <label className="block text-xs font-medium text-stone-700 mb-1">Nama Rekening</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. BCA Utama, GoPay Pribadi"
              required
              className="w-full px-3 py-2 border border-stone-300 rounded bg-white text-sm text-stone-900 focus:outline-none focus:ring-1 focus:ring-emerald-600"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-stone-700 mb-1">Tipe Rekening</label>
            <select
              value={type}
              onChange={(e) => setType(e.target.value as 'bank' | 'ewallet' | 'cash' | 'investment')}
              className="w-full px-3 py-2 border border-stone-300 rounded bg-white text-sm text-stone-900 focus:outline-none focus:ring-1 focus:ring-emerald-600"
            >
              <option value="bank">bank</option>
              <option value="ewallet">ewallet</option>
              <option value="cash">cash</option>
              <option value="investment">investment</option>
            </select>
          </div>

          <div>
            <label className="block text-xs font-medium text-stone-700 mb-1">Saldo Awal (Rp)</label>
            <input
              type="number"
              value={initialBalance}
              onChange={(e) => setInitialBalance(e.target.value)}
              placeholder="0"
              className="w-full px-3 py-2 border border-stone-300 rounded bg-white text-sm text-stone-900 tabular-nums focus:outline-none focus:ring-1 focus:ring-emerald-600"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-2 px-4 bg-emerald-700 text-white text-sm font-medium rounded hover:bg-emerald-800 disabled:opacity-50"
          >
            {loading ? 'Menyimpan...' : 'Simpan Rekening'}
          </button>
        </form>
      </div>
    </div>
  );
}
