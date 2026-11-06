'use client';

import { useState } from 'react';
import { INITIAL_SAVINGS_GOALS } from '@/lib/initial-data';
import {
  calculateSavingsGoalsSummary,
  calculateGoalProgress,
  applyGoalContribution,
} from '@/lib/savings-engine';
import { formatIDR } from '@/lib/currency';
import { PiggyBank, Plus, CheckCircle2, TrendingUp } from 'lucide-react';
import { SavingsGoalInput } from '@/lib/validations/savings-goal';

export default function GoalsPage() {
  const [goals, setGoals] = useState<SavingsGoalInput[]>(INITIAL_SAVINGS_GOALS);
  const [showAddForm, setShowAddForm] = useState(false);
  const [name, setName] = useState('');
  const [targetAmount, setTargetAmount] = useState('');
  const [category, setCategory] = useState<'emergency_fund' | 'sinking_fund' | 'investment' | 'purchase' | 'education' | 'other'>('emergency_fund');
  const [priority, setPriority] = useState<'low' | 'medium' | 'high'>('high');

  const summary = calculateSavingsGoalsSummary(goals, '2026-10-31');

  const handleDeposit = (goalId: string, amount: number) => {
    setGoals((prev) =>
      prev.map((g) => {
        if (g.id !== goalId) return g;
        const res = applyGoalContribution(g, amount, 'deposit');
        return res.updatedGoal;
      })
    );
  };

  const handleAddGoal = (e: React.FormEvent) => {
    e.preventDefault();
    const targetNum = parseInt(targetAmount.replace(/\D/g, ''), 10);
    if (!name.trim() || isNaN(targetNum) || targetNum <= 0) return;

    const newGoal: SavingsGoalInput = {
      id: `sg-${Date.now()}`,
      name: name.trim(),
      targetAmount: targetNum,
      currentAmount: 0,
      targetDate: '2027-12-31',
      category,
      priority,
      color: '#047857',
      isCompleted: false,
    };

    setGoals((prev) => [...prev, newGoal]);
    setName('');
    setTargetAmount('');
    setShowAddForm(false);
  };

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-5xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-stone-200 pb-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-stone-900">
            Target Tabungan & Sinking Funds
          </h1>
          <p className="text-xs sm:text-sm text-stone-600">
            Alokasi pos dana darurat, pembelian aset, dan tabungan berkala
          </p>
        </div>
        <button
          type="button"
          onClick={() => setShowAddForm(!showAddForm)}
          className="inline-flex items-center gap-2 px-3 py-1.5 text-xs font-medium rounded-md bg-stone-900 text-stone-50 hover:bg-stone-800 transition-colors self-start sm:self-auto"
        >
          <Plus className="w-3.5 h-3.5" />
          <span>{showAddForm ? 'Batal' : 'Tambah Target'}</span>
        </button>
      </div>

      {/* Metrics */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="p-4 rounded-lg border border-stone-200 bg-white">
          <span className="text-[11px] font-medium text-stone-500 uppercase tracking-wider block">
            Terkumpul
          </span>
          <span className="text-lg font-bold tabular-nums text-[#047857]">
            {formatIDR(summary.totalCurrentAmount)}
          </span>
        </div>
        <div className="p-4 rounded-lg border border-stone-200 bg-white">
          <span className="text-[11px] font-medium text-stone-500 uppercase tracking-wider block">
            Total Target
          </span>
          <span className="text-lg font-bold tabular-nums text-stone-900">
            {formatIDR(summary.totalTargetAmount)}
          </span>
        </div>
        <div className="p-4 rounded-lg border border-stone-200 bg-white">
          <span className="text-[11px] font-medium text-stone-500 uppercase tracking-wider block">
            Kebutuhan Bulanan
          </span>
          <span className="text-lg font-bold tabular-nums text-stone-900">
            {formatIDR(summary.totalMonthlyNeeded)}
          </span>
        </div>
        <div className="p-4 rounded-lg border border-stone-200 bg-white">
          <span className="text-[11px] font-medium text-stone-500 uppercase tracking-wider block">
            Progres Total
          </span>
          <span className="text-lg font-bold tabular-nums text-stone-900">
            {summary.overallProgress}%
          </span>
        </div>
      </div>

      {/* Add Goal Form */}
      {showAddForm && (
        <form
          onSubmit={handleAddGoal}
          className="p-4 rounded-lg border border-stone-300 bg-white space-y-3"
        >
          <h3 className="text-sm font-semibold text-stone-900">
            Buat Pos Target Tabungan Baru
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="block text-xs font-medium text-stone-700 mb-1">
                Nama Target
              </label>
              <input
                type="text"
                placeholder="Contoh: Tabungan Liburan"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full px-3 py-2 text-xs border border-stone-300 rounded-md focus:outline-hidden focus:border-stone-900 bg-[#FAF9F5]"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-stone-700 mb-1">
                Target Nominal (Rp)
              </label>
              <input
                type="text"
                placeholder="Contoh: 5000000"
                value={targetAmount}
                onChange={(e) => setTargetAmount(e.target.value)}
                className="w-full px-3 py-2 text-xs border border-stone-300 rounded-md focus:outline-hidden focus:border-stone-900 bg-[#FAF9F5]"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-stone-700 mb-1">
                Prioritas
              </label>
              <select
                value={priority}
                onChange={(e) => setPriority(e.target.value as 'low' | 'medium' | 'high')}
                className="w-full px-3 py-2 text-xs border border-stone-300 rounded-md focus:outline-hidden focus:border-stone-900 bg-[#FAF9F5]"
              >
                <option value="high">Tinggi</option>
                <option value="medium">Sedang</option>
                <option value="low">Rendah</option>
              </select>
            </div>
          </div>
          <button
            type="submit"
            className="px-4 py-2 text-xs font-medium bg-[#047857] text-white rounded-md hover:bg-emerald-800 transition-colors"
          >
            Simpan Target
          </button>
        </form>
      )}

      {/* Goals Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-2 gap-4">
        {goals.map((goal) => {
          const prog = calculateGoalProgress(goal.currentAmount, goal.targetAmount);
          const isDone = goal.isCompleted || prog.isCompleted;

          return (
            <div
              key={goal.id}
              className={`p-4 rounded-lg border bg-white space-y-3 ${
                isDone ? 'border-emerald-300 bg-emerald-50/20' : 'border-stone-200'
              }`}
            >
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-semibold text-stone-900">
                    {goal.name}
                  </h3>
                  <span className="text-[11px] text-stone-500 capitalize">
                    {goal.category.replace('_', ' ')} • Prioritas {goal.priority}
                  </span>
                </div>
                <span
                  className={`inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded font-mono ${
                    isDone
                      ? 'bg-emerald-100 text-emerald-800 font-semibold'
                      : 'bg-stone-100 text-stone-700'
                  }`}
                >
                  {isDone && <CheckCircle2 className="w-3.5 h-3.5" />}
                  {prog.percentage}%
                </span>
              </div>

              {/* Progress bar */}
              <div className="w-full bg-stone-100 h-2.5 rounded-full overflow-hidden">
                <div
                  className="h-full bg-[#047857] rounded-full transition-all"
                  style={{ width: `${prog.percentage}%` }}
                />
              </div>

              <div className="flex items-center justify-between text-xs text-stone-500 tabular-nums font-mono">
                <span>Terkumpul: {formatIDR(goal.currentAmount)}</span>
                <span>Target: {formatIDR(goal.targetAmount)}</span>
              </div>

              <div className="pt-2 border-t border-stone-100 flex items-center justify-between text-[11px] text-stone-600">
                <span>
                  {isDone ? 'Target tercapai!' : `Sisa: ${formatIDR(prog.remainingAmount)}`}
                </span>
                <span className="tabular-nums">Jatuh tempo: {goal.targetDate}</span>
              </div>

              {!isDone && (
                <div className="pt-1 flex items-center gap-2">
                  <span className="text-[11px] text-stone-500">Nabung instan:</span>
                  <button
                    type="button"
                    onClick={() => handleDeposit(goal.id, 50000)}
                    className="py-1 px-2 text-[11px] font-medium bg-stone-100 hover:bg-stone-200 text-stone-800 rounded transition-colors"
                  >
                    +50rb
                  </button>
                  <button
                    type="button"
                    onClick={() => handleDeposit(goal.id, 200000)}
                    className="py-1 px-2 text-[11px] font-medium bg-stone-100 hover:bg-stone-200 text-stone-800 rounded transition-colors"
                  >
                    +200rb
                  </button>
                  <button
                    type="button"
                    onClick={() => handleDeposit(goal.id, 500000)}
                    className="py-1 px-2 text-[11px] font-medium bg-emerald-50 hover:bg-emerald-100 text-emerald-800 rounded transition-colors"
                  >
                    +500rb
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
