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
    <div className="p-4 sm:p-6 max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div className="border-b border-stone-200 pb-4">
        <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-stone-900">Rekening</h1>
        <p className="text-xs sm:text-sm text-stone-500 mt-1">Daftar saldo rekening bank, e-wallet, dan kas.</p>
      </div>

      {/* Account Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
        {accounts.length === 0 ? (
          <div className="col-span-full py-8 text-center text-sm text-stone-400">Belum ada rekening tercatat.</div>
        ) : (
          accounts.map((acc) => {
            const typeLabel: Record<string, string> = { bank: 'Bank', ewallet: 'E-Wallet', cash: 'Tunai', investment: 'Investasi' };
            return (
              <div key={acc.id} className="bg-white border border-stone-200 rounded-lg p-4 flex flex-col gap-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-medium text-stone-500 uppercase tracking-wider">{typeLabel[acc.type] ?? acc.type}</span>
                </div>
                <div className="font-semibold text-stone-900 text-sm">{acc.name}</div>
                <div className="text-lg font-bold tabular-nums text-stone-900 mt-1">{currencyFormatter.format(acc.balance)}</div>
              </div>
            );
          })
        )}
      </div>

      {/* Add Account Form */}
      <div className="border-t border-stone-200 pt-5">
        <h2 className="text-xs font-semibold uppercase tracking-wider text-stone-500 mb-3">Tambah Rekening Baru</h2>
        <form onSubmit={handleSubmit} className="space-y-3 max-w-lg">
          {error && <p className="text-xs text-red-600">{error}</p>}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-stone-700 mb-1">Nama Rekening</label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="BCA Utama, GoPay Pribadi"
                required
                className="w-full px-3 py-2 border border-stone-300 rounded-md bg-white text-sm text-stone-900 focus:outline-none focus:ring-1 focus:ring-emerald-600"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-stone-700 mb-1">Tipe</label>
              <select
                value={type}
                onChange={(e) => setType(e.target.value as 'bank' | 'ewallet' | 'cash' | 'investment')}
                className="w-full px-3 py-2 border border-stone-300 rounded-md bg-white text-sm text-stone-900 focus:outline-none focus:ring-1 focus:ring-emerald-600"
              >
                <option value="bank">Bank</option>
                <option value="ewallet">E-Wallet</option>
                <option value="cash">Tunai</option>
                <option value="investment">Investasi</option>
              </select>
            </div>
          </div>
          <div>
            <label className="block text-xs font-medium text-stone-700 mb-1">Saldo Awal (Rp)</label>
            <input
              type="number"
              value={initialBalance}
              onChange={(e) => setInitialBalance(e.target.value)}
              placeholder="0"
              className="w-full px-3 py-2 border border-stone-300 rounded-md bg-white text-sm text-stone-900 tabular-nums focus:outline-none focus:ring-1 focus:ring-emerald-600"
            />
          </div>
          <button
            type="submit"
            disabled={loading}
            className="w-full sm:w-auto px-5 py-2 bg-emerald-700 text-white text-sm font-medium rounded-md hover:bg-emerald-800 disabled:opacity-50 transition-colors"
          >
            {loading ? 'Menyimpan...' : 'Simpan Rekening'}
          </button>
        </form>
      </div>
    </div>
  );
}
