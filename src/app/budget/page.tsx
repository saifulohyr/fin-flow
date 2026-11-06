'use client';

import { useState } from 'react';
import { INITIAL_BUDGETS, INITIAL_TRANSACTIONS } from '@/lib/initial-data';
import {
  calculateBudgetProgress,
  calculateOverallBudgetHealth,
} from '@/lib/budget-engine';
import { formatIDR } from '@/lib/currency';
import { Target, AlertTriangle, CheckCircle2, Plus } from 'lucide-react';
import { BudgetInput } from '@/lib/validations/budget';

export default function BudgetPage() {
  const [budgets, setBudgets] = useState<BudgetInput[]>(INITIAL_BUDGETS);
  const [newCategory, setNewCategory] = useState('');
  const [newAmount, setNewAmount] = useState('');
  const [showForm, setShowForm] = useState(false);

  const budgetHealth = calculateOverallBudgetHealth(
    budgets,
    INITIAL_TRANSACTIONS,
    '2026-10-31'
  );

  const handleAddBudget = (e: React.FormEvent) => {
    e.preventDefault();
    const amountNum = parseInt(newAmount.replace(/\D/g, ''), 10);
    if (!newCategory.trim() || isNaN(amountNum) || amountNum <= 0) return;

    const newBgt: BudgetInput = {
      id: `bgt-${Date.now()}`,
      categoryId: newCategory.trim(),
      amount: amountNum,
      period: 'monthly',
      startDate: '2026-10-01',
      endDate: '2026-10-31',
      notifyThreshold: 80,
    };

    setBudgets((prev) => [...prev, newBgt]);
    setNewCategory('');
    setNewAmount('');
    setShowForm(false);
  };

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-5xl mx-auto space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-stone-200 pb-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-stone-900">
            Anggaran Bulanan
          </h1>
          <p className="text-xs sm:text-sm text-stone-600">
            Batas pengeluaran per kategori & rekomendasi alokasi harian
          </p>
        </div>
        <button
          type="button"
          onClick={() => setShowForm(!showForm)}
          className="inline-flex items-center gap-2 px-3 py-1.5 text-xs font-medium rounded-md bg-stone-900 text-stone-50 hover:bg-stone-800 transition-colors self-start sm:self-auto"
        >
          <Plus className="w-3.5 h-3.5" />
          <span>{showForm ? 'Batal' : 'Tambah Batas'}</span>
        </button>
      </div>

      {/* Summary Metrics */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="p-4 rounded-lg border border-stone-200 bg-white">
          <span className="text-[11px] font-medium text-stone-500 uppercase tracking-wider block">
            Total Batas
          </span>
          <span className="text-lg font-bold tabular-nums text-stone-900">
            {formatIDR(budgetHealth.totalBudgeted)}
          </span>
        </div>
        <div className="p-4 rounded-lg border border-stone-200 bg-white">
          <span className="text-[11px] font-medium text-stone-500 uppercase tracking-wider block">
            Terpakai
          </span>
          <span className="text-lg font-bold tabular-nums text-[#B45309]">
            {formatIDR(budgetHealth.totalSpent)}
          </span>
        </div>
        <div className="p-4 rounded-lg border border-stone-200 bg-white">
          <span className="text-[11px] font-medium text-stone-500 uppercase tracking-wider block">
            Sisa Kuota
          </span>
          <span className="text-lg font-bold tabular-nums text-[#047857]">
            {formatIDR(budgetHealth.remaining)}
          </span>
        </div>
        <div className="p-4 rounded-lg border border-stone-200 bg-white">
          <span className="text-[11px] font-medium text-stone-500 uppercase tracking-wider block">
            Kesehatan
          </span>
          <span className="text-lg font-bold tabular-nums text-stone-900">
            {budgetHealth.percentage}%
          </span>
        </div>
      </div>

      {/* Add Budget Form */}
      {showForm && (
        <form
          onSubmit={handleAddBudget}
          className="p-4 rounded-lg border border-stone-300 bg-white space-y-3"
        >
          <h3 className="text-sm font-semibold text-stone-900">
            Tetapkan Batas Anggaran Baru
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-stone-700 mb-1">
                Kategori
              </label>
              <input
                type="text"
                placeholder="Contoh: Belanja Bulanan"
                value={newCategory}
                onChange={(e) => setNewCategory(e.target.value)}
                className="w-full px-3 py-2 text-xs border border-stone-300 rounded-md focus:outline-hidden focus:border-stone-900 bg-[#FAF9F5]"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-stone-700 mb-1">
                Batas Nominal (Rp)
              </label>
              <input
                type="text"
                placeholder="Contoh: 1000000"
                value={newAmount}
                onChange={(e) => setNewAmount(e.target.value)}
                className="w-full px-3 py-2 text-xs border border-stone-300 rounded-md focus:outline-hidden focus:border-stone-900 bg-[#FAF9F5]"
              />
            </div>
          </div>
          <button
            type="submit"
            className="px-4 py-2 text-xs font-medium bg-[#047857] text-white rounded-md hover:bg-emerald-800 transition-colors"
          >
            Simpan Anggaran
          </button>
        </form>
      )}

      {/* Category Budget Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {budgets.map((bgt) => {
          const progress = calculateBudgetProgress(
            bgt,
            INITIAL_TRANSACTIONS,
            '2026-10-31'
          );
          const isExceeded = progress.status === 'exceeded';
          const isWarning = progress.status === 'warning';

          return (
            <div
              key={bgt.id}
              className="p-4 rounded-lg border border-stone-200 bg-white space-y-3"
            >
              <div className="flex items-center justify-between">
                <span className="text-sm font-semibold text-stone-900 truncate">
                  {bgt.categoryId}
                </span>
                <span
                  className={`inline-flex items-center gap-1 text-[11px] px-2 py-0.5 rounded font-mono ${
                    isExceeded
                      ? 'bg-red-50 text-red-700 border border-red-200'
                      : isWarning
                      ? 'bg-amber-50 text-amber-700 border border-amber-200'
                      : 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                  }`}
                >
                  {isExceeded ? (
                    <AlertTriangle className="w-3 h-3" />
                  ) : (
                    <CheckCircle2 className="w-3 h-3" />
                  )}
                  {progress.percentage}%
                </span>
              </div>

              {/* Progress Bar */}
              <div className="w-full bg-stone-100 h-2 rounded-full overflow-hidden">
                <div
                  className={`h-full rounded-full transition-all ${
                    isExceeded
                      ? 'bg-[#B45309]'
                      : isWarning
                      ? 'bg-amber-500'
                      : 'bg-[#047857]'
                  }`}
                  style={{ width: `${Math.min(100, progress.percentage)}%` }}
                />
              </div>

              <div className="flex items-center justify-between text-xs text-stone-500 tabular-nums font-mono">
                <span>Terpakai: {formatIDR(progress.spent)}</span>
                <span>Batas: {formatIDR(progress.amount)}</span>
              </div>

              <div className="pt-2 border-t border-stone-100 flex items-center justify-between text-[11px] text-stone-600">
                <span>Sisa: {formatIDR(progress.remaining)}</span>
                <span className="tabular-nums font-mono">
                  Rekom: {formatIDR(progress.dailyRecommended)}/hari
                </span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
