'use client';

import { useState } from 'react';
import { INITIAL_RECURRING } from '@/lib/initial-data';
import {
  calculateMonthlyCommitment,
  getUpcomingBills,
} from '@/lib/recurring-engine';
import { formatIDR } from '@/lib/currency';
import { Repeat2, CalendarClock, Plus, Check, Clock } from 'lucide-react';
import { RecurringTransactionInput } from '@/lib/validations/recurring';

export default function RecurringPage() {
  const [recurring, setRecurring] = useState<RecurringTransactionInput[]>(INITIAL_RECURRING);
  const [showAddForm, setShowAddForm] = useState(false);
  const [title, setTitle] = useState('');
  const [amount, setAmount] = useState('');
  const [category, setCategory] = useState('');
  const [frequency, setFrequency] = useState<'daily' | 'weekly' | 'monthly' | 'yearly'>('monthly');

  const monthlyCommitment = calculateMonthlyCommitment(recurring);
  const upcomingBills = getUpcomingBills(recurring, '2026-10-31', 7);
  const upcomingTotal = upcomingBills.reduce((sum, item) => sum + item.amount, 0);

  const handleToggle = (id: string) => {
    setRecurring((prev) =>
      prev.map((item) =>
        item.id === id ? { ...item, isActive: !item.isActive } : item
      )
    );
  };

  const handleAddRecurring = (e: React.FormEvent) => {
    e.preventDefault();
    const amountNum = parseInt(amount.replace(/\D/g, ''), 10);
    if (!title.trim() || isNaN(amountNum) || amountNum <= 0) return;

    const newItem: RecurringTransactionInput = {
      id: `rec-${Date.now()}`,
      title: title.trim(),
      amount: amountNum,
      categoryId: category.trim() || 'Lainnya',
      accountId: 'acc-1',
      frequency,
      startDate: new Date().toISOString().split('T')[0],
      nextDueDate: new Date(Date.now() + 30 * 24 * 3600 * 1000)
        .toISOString()
        .split('T')[0],
      isActive: true,
      autoDeduct: false,
    };

    setRecurring((prev) => [...prev, newItem]);
    setTitle('');
    setAmount('');
    setCategory('');
    setShowAddForm(false);
  };

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-5xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-stone-200 pb-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-stone-900">
            Biaya Rutin & Langganan
          </h1>
          <p className="text-xs sm:text-sm text-stone-600">
            Jadwal pengeluaran tetap bulanan & peringatan jatuh tempo
          </p>
        </div>
        <button
          type="button"
          onClick={() => setShowAddForm(!showAddForm)}
          className="inline-flex items-center gap-2 px-3 py-1.5 text-xs font-medium rounded-md bg-stone-900 text-stone-50 hover:bg-stone-800 transition-colors self-start sm:self-auto"
        >
          <Plus className="w-3.5 h-3.5" />
          <span>{showAddForm ? 'Batal' : 'Tambah Rutin'}</span>
        </button>
      </div>

      {/* Metrics */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
        <div className="p-4 rounded-lg border border-stone-200 bg-white">
          <span className="text-[11px] font-medium text-stone-500 uppercase tracking-wider block">
            Komitmen Tetap Bulanan
          </span>
          <span className="text-lg font-bold tabular-nums text-stone-900">
            {formatIDR(monthlyCommitment)}
          </span>
        </div>
        <div className="p-4 rounded-lg border border-stone-200 bg-white">
          <span className="text-[11px] font-medium text-stone-500 uppercase tracking-wider block">
            Jatuh Tempo 7 Hari
          </span>
          <span className="text-lg font-bold tabular-nums text-[#B45309]">
            {formatIDR(upcomingTotal)}
          </span>
        </div>
        <div className="p-4 rounded-lg border border-stone-200 bg-white col-span-2 sm:col-span-1">
          <span className="text-[11px] font-medium text-stone-500 uppercase tracking-wider block">
            Item Aktif
          </span>
          <span className="text-lg font-bold tabular-nums text-stone-900">
            {recurring.filter((r) => r.isActive).length} dari {recurring.length}
          </span>
        </div>
      </div>

      {/* Add Recurring Form */}
      {showAddForm && (
        <form
          onSubmit={handleAddRecurring}
          className="p-4 rounded-lg border border-stone-300 bg-white space-y-3"
        >
          <h3 className="text-sm font-semibold text-stone-900">
            Daftarkan Tagihan / Langganan Rutin Baru
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="block text-xs font-medium text-stone-700 mb-1">
                Nama Tagihan
              </label>
              <input
                type="text"
                placeholder="Contoh: Netflix Premium"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="w-full px-3 py-2 text-xs border border-stone-300 rounded-md focus:outline-hidden focus:border-stone-900 bg-[#FAF9F5]"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-stone-700 mb-1">
                Nominal (Rp)
              </label>
              <input
                type="text"
                placeholder="Contoh: 186000"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                className="w-full px-3 py-2 text-xs border border-stone-300 rounded-md focus:outline-hidden focus:border-stone-900 bg-[#FAF9F5]"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-stone-700 mb-1">
                Frekuensi
              </label>
              <select
                value={frequency}
                onChange={(e) => setFrequency(e.target.value as any)}
                className="w-full px-3 py-2 text-xs border border-stone-300 rounded-md focus:outline-hidden focus:border-stone-900 bg-[#FAF9F5]"
              >
                <option value="monthly">Bulanan</option>
                <option value="weekly">Mingguan</option>
                <option value="yearly">Tahunan</option>
                <option value="daily">Harian</option>
              </select>
            </div>
          </div>
          <button
            type="submit"
            className="px-4 py-2 text-xs font-medium bg-[#047857] text-white rounded-md hover:bg-emerald-800 transition-colors"
          >
            Simpan Tagihan
          </button>
        </form>
      )}

      {/* Recurring Items List */}
      <div className="border border-stone-200 rounded-lg bg-white divide-y divide-stone-100 overflow-hidden">
        {recurring.map((item) => {
          return (
            <div
              key={item.id}
              className={`p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 transition-colors ${
                !item.isActive ? 'bg-stone-50/50 opacity-60' : 'hover:bg-stone-50/30'
              }`}
            >
              <div className="flex items-start sm:items-center gap-3">
                <button
                  type="button"
                  onClick={() => handleToggle(item.id)}
                  className={`w-6 h-6 rounded-md border flex items-center justify-center shrink-0 transition-colors ${
                    item.isActive
                      ? 'bg-emerald-700 border-emerald-700 text-white'
                      : 'border-stone-300 bg-white text-transparent'
                  }`}
                  aria-label={item.isActive ? 'Nonaktifkan' : 'Aktifkan'}
                >
                  <Check className="w-3.5 h-3.5" />
                </button>
                <div>
                  <h3 className="text-sm font-semibold text-stone-900">
                    {item.title}
                  </h3>
                  <div className="flex items-center gap-2 text-[11px] text-stone-500">
                    <span>{item.categoryId}</span>
                    <span>•</span>
                    <span className="capitalize">{item.frequency}</span>
                    {item.autoDeduct && (
                      <>
                        <span>•</span>
                        <span className="text-emerald-700 font-medium">Auto-debet</span>
                      </>
                    )}
                  </div>
                </div>
              </div>

              <div className="flex items-center justify-between sm:justify-end gap-4">
                <div className="text-right">
                  <span className="text-sm font-bold tabular-nums text-stone-900 block">
                    {formatIDR(item.amount)}
                  </span>
                  <span className="text-[11px] text-stone-500 font-mono">
                    Jatuh tempo: {item.nextDueDate}
                  </span>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
