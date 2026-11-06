'use client';

import { useState } from 'react';
import { INITIAL_DEBTS, INITIAL_ACCOUNTS } from '@/lib/initial-data';
import {
  summarizeDebts,
  projectAllPayoffs,
  calculateDebtToAssetRatio,
} from '@/lib/debt-engine';
import { calculateNetWorth } from '@/lib/finance-engine';
import { formatIDR } from '@/lib/currency';
import { BadgePercent, ShieldCheck, CalendarClock, Plus, Check } from 'lucide-react';
import { DebtInput } from '@/lib/validations/debt';

export default function DebtsPage() {
  const [debts, setDebts] = useState<DebtInput[]>(INITIAL_DEBTS);
  const [showAddForm, setShowAddForm] = useState(false);
  const [name, setName] = useState('');
  const [principal, setPrincipal] = useState('');
  const [monthly, setMonthly] = useState('');
  const [interest, setInterest] = useState('0');

  const netWorth = calculateNetWorth(INITIAL_ACCOUNTS);
  const debtSummary = summarizeDebts(debts);
  const debtPayoffs = projectAllPayoffs(debts, '2026-10');
  const debtRatio = calculateDebtToAssetRatio(netWorth, debtSummary.totalDebt);

  const handlePay = (debtId: string, amount: number) => {
    setDebts((prev) =>
      prev.map((d) => {
        if (d.id !== debtId) return d;
        const newBalance = Math.max(0, d.outstandingBalance - amount);
        return {
          ...d,
          outstandingBalance: newBalance,
          status: newBalance === 0 ? 'paid_off' : d.status,
        };
      })
    );
  };

  const handleAddDebt = (e: React.FormEvent) => {
    e.preventDefault();
    const principalNum = parseInt(principal.replace(/\D/g, ''), 10);
    const monthlyNum = parseInt(monthly.replace(/\D/g, ''), 10);
    const interestNum = parseFloat(interest) || 0;

    if (!name.trim() || isNaN(principalNum) || isNaN(monthlyNum)) return;

    const newDebt: DebtInput = {
      id: `debt-${Date.now()}`,
      name: name.trim(),
      type: 'installment',
      principalAmount: principalNum,
      outstandingBalance: principalNum,
      interestRateAnnual: interestNum,
      monthlyPayment: monthlyNum,
      startDate: new Date().toISOString().split('T')[0],
      dueDate: new Date(Date.now() + 180 * 24 * 3600 * 1000)
        .toISOString()
        .split('T')[0],
      status: 'active',
      color: '#b45309',
    };

    setDebts((prev) => [...prev, newDebt]);
    setName('');
    setPrincipal('');
    setMonthly('');
    setShowAddForm(false);
  };

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-5xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-stone-200 pb-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-stone-900">
            Utang & Cicilan
          </h1>
          <p className="text-xs sm:text-sm text-stone-600">
            Manajemen liabilitas, rasio utang terhadap aset & proyeksi pelunasan
          </p>
        </div>
        <button
          type="button"
          onClick={() => setShowAddForm(!showAddForm)}
          className="inline-flex items-center gap-2 px-3 py-1.5 text-xs font-medium rounded-md bg-stone-900 text-stone-50 hover:bg-stone-800 transition-colors self-start sm:self-auto"
        >
          <Plus className="w-3.5 h-3.5" />
          <span>{showAddForm ? 'Batal' : 'Tambah Utang'}</span>
        </button>
      </div>

      {/* Metrics Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="p-4 rounded-lg border border-stone-200 bg-white">
          <span className="text-[11px] font-medium text-stone-500 uppercase tracking-wider block">
            Total Sisa Utang
          </span>
          <span className="text-lg font-bold tabular-nums text-[#B45309]">
            {formatIDR(debtSummary.totalDebt)}
          </span>
        </div>
        <div className="p-4 rounded-lg border border-stone-200 bg-white">
          <span className="text-[11px] font-medium text-stone-500 uppercase tracking-wider block">
            Cicilan Bulanan
          </span>
          <span className="text-lg font-bold tabular-nums text-stone-900">
            {formatIDR(debtSummary.totalMonthlyPayment)}
          </span>
        </div>
        <div className="p-4 rounded-lg border border-stone-200 bg-white">
          <span className="text-[11px] font-medium text-stone-500 uppercase tracking-wider block">
            Rasio Debt-to-Asset
          </span>
          <span className="text-lg font-bold tabular-nums text-stone-900">
            {Math.round(debtRatio.ratio * 100)}%
          </span>
        </div>
        <div className="p-4 rounded-lg border border-stone-200 bg-white">
          <span className="text-[11px] font-medium text-stone-500 uppercase tracking-wider block">
            Status Keamanan
          </span>
          <span className="inline-flex items-center gap-1 text-xs font-semibold text-[#047857]">
            <ShieldCheck className="w-3.5 h-3.5" />
            {debtRatio.status === 'healthy' ? 'Sehat (<40%)' : debtRatio.status}
          </span>
        </div>
      </div>

      {/* Add Debt Form */}
      {showAddForm && (
        <form
          onSubmit={handleAddDebt}
          className="p-4 rounded-lg border border-stone-300 bg-white space-y-3"
        >
          <h3 className="text-sm font-semibold text-stone-900">
            Catat Liabilitas / Pinjaman Baru
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="block text-xs font-medium text-stone-700 mb-1">
                Nama Utang / Cicilan
              </label>
              <input
                type="text"
                placeholder="Contoh: Cicilan Smartphone"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full px-3 py-2 text-xs border border-stone-300 rounded-md focus:outline-hidden focus:border-stone-900 bg-[#FAF9F5]"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-stone-700 mb-1">
                Pokok Pinjaman (Rp)
              </label>
              <input
                type="text"
                placeholder="Contoh: 3000000"
                value={principal}
                onChange={(e) => setPrincipal(e.target.value)}
                className="w-full px-3 py-2 text-xs border border-stone-300 rounded-md focus:outline-hidden focus:border-stone-900 bg-[#FAF9F5]"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-stone-700 mb-1">
                Cicilan per Bulan (Rp)
              </label>
              <input
                type="text"
                placeholder="Contoh: 500000"
                value={monthly}
                onChange={(e) => setMonthly(e.target.value)}
                className="w-full px-3 py-2 text-xs border border-stone-300 rounded-md focus:outline-hidden focus:border-stone-900 bg-[#FAF9F5]"
              />
            </div>
          </div>
          <button
            type="submit"
            className="px-4 py-2 text-xs font-medium bg-stone-900 text-white rounded-md hover:bg-stone-800 transition-colors"
          >
            Simpan Liabilitas
          </button>
        </form>
      )}

      {/* Debts List */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {debts.map((d) => {
          const isPaid = d.outstandingBalance === 0;
          const progressPct = Math.round(
            ((d.principalAmount - d.outstandingBalance) / d.principalAmount) * 100
          );
          const payoff = debtPayoffs.find((p) => p.debtId === d.id);

          return (
            <div
              key={d.id}
              className={`p-4 rounded-lg border bg-white space-y-3 ${
                isPaid ? 'border-stone-200 opacity-60' : 'border-stone-200'
              }`}
            >
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-semibold text-stone-900 truncate">
                    {d.name}
                  </h3>
                  <span className="text-[11px] text-stone-500 capitalize">
                    {d.type.replace('_', ' ')}
                  </span>
                </div>
                <span
                  className={`text-xs px-2 py-0.5 rounded font-mono ${
                    isPaid
                      ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                      : 'bg-stone-100 text-stone-700'
                  }`}
                >
                  {isPaid ? 'Lunas' : `${progressPct}% Terbayar`}
                </span>
              </div>

              {/* Progress bar */}
              <div className="w-full bg-stone-100 h-2 rounded-full overflow-hidden">
                <div
                  className={`h-full rounded-full transition-all ${
                    isPaid ? 'bg-[#047857]' : 'bg-[#B45309]'
                  }`}
                  style={{ width: `${progressPct}%` }}
                />
              </div>

              <div className="flex items-center justify-between text-xs text-stone-500 tabular-nums font-mono">
                <span>Sisa: {formatIDR(d.outstandingBalance)}</span>
                <span>Pokok: {formatIDR(d.principalAmount)}</span>
              </div>

              <div className="pt-2 border-t border-stone-100 flex items-center justify-between text-[11px] text-stone-600">
                <span>Cicilan: {formatIDR(d.monthlyPayment)}/bln</span>
                <span className="flex items-center gap-1">
                  <CalendarClock className="w-3 h-3 text-stone-400" />
                  {isPaid ? 'Selesai' : `${payoff?.monthsToPayoff ?? 0} bln lunas`}
                </span>
              </div>

              {!isPaid && (
                <div className="pt-1 flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => handlePay(d.id, d.monthlyPayment)}
                    className="flex-1 py-1.5 px-2 text-[11px] font-medium bg-stone-100 hover:bg-stone-200 text-stone-800 rounded transition-colors"
                  >
                    Bayar Cicilan
                  </button>
                  <button
                    type="button"
                    onClick={() => handlePay(d.id, d.outstandingBalance)}
                    className="py-1.5 px-2 text-[11px] font-medium bg-emerald-50 hover:bg-emerald-100 text-emerald-800 rounded transition-colors"
                  >
                    Lunasi
                  </button>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
