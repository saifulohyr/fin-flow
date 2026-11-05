"use client";

import { useState } from "react";
import { formatIDR } from "@/lib/currency";
import { parseTransactionNLU } from "@/lib/nlu-parser";
import {
  calculateNetWorth,
  calculateMonthlyTotals,
  calculateCategoryBreakdown,
  calculateRunwayMonths,
  RawAccount,
  RawTransaction,
} from "@/lib/finance-engine";
import {
  calculateBudgetProgress,
  calculateOverallBudgetHealth,
} from "@/lib/budget-engine";
import {
  calculateSpendingStats,
  aggregateSpendingByDate,
} from "@/lib/spending-analytics";
import {
  computeNextDueDate,
  calculateMonthlyCommitment,
  getUpcomingBills,
  projectCashflow,
  calculateCashflowRunway,
} from "@/lib/recurring-engine";
import { BudgetInput } from "@/lib/validations/budget";
import { RecurringTransactionInput } from "@/lib/validations/recurring";
import { SavingsGoalInput } from "@/lib/validations/savings-goal";
import {
  calculateSavingsGoalsSummary,
  calculateGoalProgress,
  applyGoalContribution,
} from "@/lib/savings-engine";
import { DebtInput } from "@/lib/validations/debt";
import {
  summarizeDebts,
  projectAllPayoffs,
  calculateDebtToAssetRatio,
} from "@/lib/debt-engine";
import {
  ArrowUpRight,
  ArrowDownLeft,
  Wallet,
  CreditCard,
  Sparkles,
  Plus,
  Clock,
  PieChart,
  ShieldCheck,
  TrendingUp,
  Target,
  AlertTriangle,
  CheckCircle2,
  Activity,
  Calendar,
  Repeat,
  CalendarClock,
  Receipt,
  PiggyBank,
  BadgePercent,
} from "lucide-react";

interface DisplayTransaction extends RawTransaction {
  title: string;
  account: string;
}

const INITIAL_ACCOUNTS: RawAccount[] = [
  { id: "acc-1", name: "BCA Tabungan", type: "Bank", balance: 14250000 },
  { id: "acc-2", name: "Bank Mandiri", type: "Bank", balance: 5800000 },
  { id: "acc-3", name: "GoPay", type: "E-Wallet", balance: 340000 },
  { id: "acc-4", name: "Tunai / Cash", type: "Physical", balance: 650000 },
];

const INITIAL_TRANSACTIONS: DisplayTransaction[] = [
  {
    id: "tx-1",
    title: "Honor Freelance Web",
    categoryId: "Freelance",
    account: "BCA Tabungan",
    amount: 4500000,
    type: "income",
    date: "2026-10-31",
  },
  {
    id: "tx-2",
    title: "Makan Siang Nasi Padang",
    categoryId: "Makanan & Minuman",
    account: "GoPay",
    amount: 32000,
    type: "expense",
    date: "2026-10-31",
  },
  {
    id: "tx-3",
    title: "Bensin Pertamax",
    categoryId: "Transportasi",
    account: "Tunai / Cash",
    amount: 100000,
    type: "expense",
    date: "2026-10-30",
  },
  {
    id: "tx-4",
    title: "Listrik PLN Pascabayar",
    categoryId: "Tagihan & Utilitas",
    account: "Bank Mandiri",
    amount: 420000,
    type: "expense",
    date: "2026-10-28",
  },
];

const INITIAL_BUDGETS: BudgetInput[] = [
  {
    id: "bgt-1",
    categoryId: "Makanan & Minuman",
    amount: 1500000,
    period: "monthly",
    startDate: "2026-10-01",
    endDate: "2026-10-31",
    notifyThreshold: 80,
  },
  {
    id: "bgt-2",
    categoryId: "Transportasi",
    amount: 400000,
    period: "monthly",
    startDate: "2026-10-01",
    endDate: "2026-10-31",
    notifyThreshold: 80,
  },
  {
    id: "bgt-3",
    categoryId: "Tagihan & Utilitas",
    amount: 500000,
    period: "monthly",
    startDate: "2026-10-01",
    endDate: "2026-10-31",
    notifyThreshold: 80,
  },
];

const INITIAL_RECURRING: RecurringTransactionInput[] = [
  {
    id: "rec-1",
    title: "Wi-Fi Fiber Rumah",
    amount: 350000,
    categoryId: "Tagihan & Utilitas",
    accountId: "acc-1",
    frequency: "monthly",
    startDate: "2026-01-05",
    nextDueDate: "2026-11-05",
    isActive: true,
    autoDeduct: true,
  },
  {
    id: "rec-2",
    title: "Langganan VPS Server",
    amount: 180000,
    categoryId: "Operasional",
    accountId: "acc-1",
    frequency: "monthly",
    startDate: "2026-02-10",
    nextDueDate: "2026-11-10",
    isActive: true,
    autoDeduct: false,
  },
  {
    id: "rec-3",
    title: "Iuran BPJS Kesehatan",
    amount: 100000,
    categoryId: "Asuransi & Kesehatan",
    accountId: "acc-2",
    frequency: "monthly",
    startDate: "2026-01-15",
    nextDueDate: "2026-11-15",
    isActive: true,
    autoDeduct: true,
  },
  {
    id: "rec-4",
    title: "Spotify Family",
    amount: 86000,
    categoryId: "Hiburan & Langganan",
    accountId: "acc-3",
    frequency: "monthly",
    startDate: "2026-03-02",
    nextDueDate: "2026-11-02",
    isActive: true,
    autoDeduct: false,
  },
];

const INITIAL_SAVINGS_GOALS: SavingsGoalInput[] = [
  {
    id: "sg-1",
    name: "Dana Darurat",
    targetAmount: 20000000,
    currentAmount: 8500000,
    targetDate: "2027-06-01",
    category: "emergency_fund",
    priority: "high",
    accountId: "acc-1",
    color: "#047857",
    isCompleted: false,
  },
  {
    id: "sg-2",
    name: "Laptop Baru",
    targetAmount: 12000000,
    currentAmount: 3200000,
    targetDate: "2027-01-15",
    category: "purchase",
    priority: "medium",
    accountId: "acc-2",
    color: "#92400e",
    isCompleted: false,
  },
  {
    id: "sg-3",
    name: "Qurban 1448 H",
    targetAmount: 3000000,
    currentAmount: 1400000,
    targetDate: "2027-05-01",
    category: "sinking_fund",
    priority: "high",
    accountId: "acc-1",
    color: "#1e3a5f",
    isCompleted: false,
  },
  {
    id: "sg-4",
    name: "Kuliah Semester 6",
    targetAmount: 5000000,
    currentAmount: 5000000,
    targetDate: "2027-02-01",
    category: "education",
    priority: "high",
    accountId: "acc-1",
    color: "#047857",
    isCompleted: true,
  },
];

const INITIAL_DEBTS: DebtInput[] = [
  {
    id: "debt-1",
    name: "Cicilan Laptop Lab",
    type: "installment",
    principalAmount: 6000000,
    outstandingBalance: 3500000,
    interestRateAnnual: 9.5,
    monthlyPayment: 850000,
    startDate: "2026-06-01",
    dueDate: "2027-02-01",
    accountId: "acc-1",
    status: "active",
    color: "#b45309",
    note: "Cicilan 10 bulan Tokopedia",
  },
  {
    id: "debt-2",
    name: "Tagihan Kartu Kredit",
    type: "credit_card",
    principalAmount: 2000000,
    outstandingBalance: 1250000,
    interestRateAnnual: 18,
    monthlyPayment: 450000,
    startDate: "2026-09-01",
    dueDate: "2026-12-15",
    accountId: "acc-1",
    status: "active",
    color: "#b91c1c",
    note: "BCA Visa Everyday Card",
  },
  {
    id: "debt-3",
    name: "Pinjaman Alat Jaringan Komputer",
    type: "personal_loan",
    principalAmount: 1000000,
    outstandingBalance: 500000,
    interestRateAnnual: 0,
    monthlyPayment: 500000,
    startDate: "2026-10-01",
    dueDate: "2026-11-20",
    accountId: "acc-2",
    status: "active",
    color: "#475569",
    note: "Talangan switch Cisco hub",
  },
];

export function DashboardView() {
  const [accounts, setAccounts] = useState<RawAccount[]>(INITIAL_ACCOUNTS);
  const [transactions, setTransactions] = useState<DisplayTransaction[]>(INITIAL_TRANSACTIONS);
  const [budgets] = useState<BudgetInput[]>(INITIAL_BUDGETS);
  const [recurring, setRecurring] = useState<RecurringTransactionInput[]>(INITIAL_RECURRING);
  const [savingsGoals, setSavingsGoals] = useState<SavingsGoalInput[]>(INITIAL_SAVINGS_GOALS);
  const [debts, setDebts] = useState<DebtInput[]>(INITIAL_DEBTS);
  const [nluInput, setNluInput] = useState("");
  const [parsedPreview, setParsedPreview] = useState<ReturnType<typeof parseTransactionNLU> | null>(null);

  const currentYearMonth = "2026-10";
  const netWorth = calculateNetWorth(accounts);
  const monthlyTotals = calculateMonthlyTotals(transactions, currentYearMonth);
  const categoryBreakdown = calculateCategoryBreakdown(transactions, currentYearMonth);
  const runwayMonths = calculateRunwayMonths(netWorth, monthlyTotals.expense);
  const budgetHealth = calculateOverallBudgetHealth(budgets, transactions, "2026-10-31");
  const spendingStats = calculateSpendingStats(transactions);
  const dailySpending = aggregateSpendingByDate(transactions);

  // Recurring Obligations & Cashflow calculations
  const monthlyCommitment = calculateMonthlyCommitment(recurring);
  const upcomingBills = getUpcomingBills(recurring, "2026-10-31", 7);
  const upcomingTotal = upcomingBills.reduce((sum, item) => sum + item.amount, 0);
  const projectedIncome = monthlyTotals.income > 0 ? monthlyTotals.income : 4500000;
  const dailyBurn = spendingStats.dailyAverage > 0 ? spendingStats.dailyAverage : 25000;
  const cashflowProjection = projectCashflow(netWorth, projectedIncome, recurring, dailyBurn, 30);
  const monthlyNetBurn = monthlyCommitment + dailyBurn * 30 - projectedIncome;
  const projectedRunway = calculateCashflowRunway(cashflowProjection.projectedBalance, monthlyNetBurn);
  const savingsSummary = calculateSavingsGoalsSummary(savingsGoals, "2026-10-31");
  const debtSummary = summarizeDebts(debts);
  const debtPayoffs = projectAllPayoffs(debts, "2026-10");
  const debtRatio = calculateDebtToAssetRatio(debtSummary.totalDebt, netWorth);

  const handleInputChange = (value: string) => {
    setNluInput(value);
    if (value.trim().length > 2) {
      setParsedPreview(parseTransactionNLU(value));
    } else {
      setParsedPreview(null);
    }
  };

  const handleAddTransaction = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!nluInput.trim()) return;

    const parsed = parseTransactionNLU(nluInput);
    if (!parsed.amount || parsed.amount <= 0) return;

    const targetAccountName = parsed.account || "Tunai / Cash";
    const newTx: DisplayTransaction = {
      id: `tx-${Date.now()}`,
      title: parsed.title,
      categoryId: parsed.category,
      account: targetAccountName,
      amount: parsed.amount,
      type: parsed.type,
      date: new Date().toISOString().split("T")[0],
    };

    // Update balances
    setAccounts((prev) =>
      prev.map((acc) => {
        if (acc.name.toLowerCase() === targetAccountName.toLowerCase()) {
          const delta = parsed.type === "income" ? parsed.amount! : -parsed.amount!;
          return { ...acc, balance: acc.balance + delta };
        }
        return acc;
      })
    );

    setTransactions((prev) => [newTx, ...prev]);
    setNluInput("");
    setParsedPreview(null);
  };

  const handleContributeSavings = (goalId: string, amount: number) => {
    const goal = savingsGoals.find((g) => g.id === goalId);
    if (!goal) return;

    const res = applyGoalContribution(goal, amount, "deposit");
    setSavingsGoals((prev) =>
      prev.map((g) => (g.id === goalId ? res.updatedGoal : g))
    );

    // Optional deduction from account if mapped
    if (goal.accountId) {
      setAccounts((prev) =>
        prev.map((acc) =>
          acc.id === goal.accountId ? { ...acc, balance: acc.balance - amount } : acc
        )
      );
    }
  };

  const handlePayRecurring = (rec: RecurringTransactionInput) => {
    const account = accounts.find((a) => a.id === rec.accountId) || accounts[0];
    const nextDueDate = computeNextDueDate(rec.nextDueDate, rec.frequency);

    // Deduct account balance
    setAccounts((prev) =>
      prev.map((acc) =>
        acc.id === account.id ? { ...acc, balance: acc.balance - rec.amount } : acc
      )
    );

    // Prepend transaction to ledger
    const newTx: DisplayTransaction = {
      id: `tx-rec-${rec.id}-${rec.nextDueDate}`,
      title: `Pembayaran: ${rec.title}`,
      categoryId: rec.categoryId,
      account: account.name,
      amount: rec.amount,
      type: "expense",
      date: rec.nextDueDate,
    };
    setTransactions((prev) => [newTx, ...prev]);

    // Advance nextDueDate
    setRecurring((prev) =>
      prev.map((item) => (item.id === rec.id ? { ...item, nextDueDate } : item))
    );
  };

  const handleToggleRecurring = (id: string) => {
    setRecurring((prev) =>
      prev.map((item) => (item.id === id ? { ...item, isActive: !item.isActive } : item))
    );
  };

  const handlePayDebt = (debtId: string, amount: number) => {
    setDebts((prev) =>
      prev.map((d) => {
        if (d.id !== debtId) return d;
        const newBalance = Math.max(0, d.outstandingBalance - amount);
        return {
          ...d,
          outstandingBalance: newBalance,
          status: newBalance === 0 ? ("paid_off" as const) : ("active" as const),
        };
      })
    );
  };

  return (
    <div className="space-y-8">
      {/* Top Bar */}
      <header className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b pb-6 border-[var(--border)]">
        <div>
          <div className="flex items-center gap-2">
            <span className="h-3 w-3 rounded-sm bg-[var(--accent)]" />
            <h1 className="text-xl font-bold tracking-tight text-[var(--foreground)]">FinFlow</h1>
            <span className="text-xs px-2 py-0.5 rounded bg-[var(--surface-subtle)] text-[var(--text-muted)] border border-[var(--border)]">
              Personal Finance Engine
            </span>
          </div>
          <p className="text-sm text-[var(--text-muted)] mt-1">
            Buku kas pribadi, kalkulasi keuangan presisi, pemantauan anggaran, dan entri natural language.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-md border border-[var(--border)] bg-[var(--surface)] text-xs text-[var(--text-muted)] font-mono tabular-numbers">
            <ShieldCheck className="w-3.5 h-3.5 text-[var(--accent)]" />
            Runway: <span className="font-semibold text-[var(--foreground)]">{runwayMonths} bln</span>
          </div>
        </div>
      </header>

      {/* KPI Overview */}
      <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="p-5 rounded-lg border border-[var(--border)] bg-[var(--surface)] space-y-1">
          <div className="flex items-center justify-between text-xs text-[var(--text-muted)] font-medium">
            <span>Total Saldo Bersih</span>
            <Wallet className="w-4 h-4 text-[var(--text-muted)]" />
          </div>
          <div className="text-2xl font-bold tracking-tight tabular-numbers text-[var(--foreground)]">
            {formatIDR(netWorth)}
          </div>
          <p className="text-xs text-[var(--text-muted)]">Akumulasi {accounts.length} rekening aktif</p>
        </div>

        <div className="p-5 rounded-lg border border-[var(--border)] bg-[var(--surface)] space-y-1">
          <div className="flex items-center justify-between text-xs text-[var(--text-muted)] font-medium">
            <span>Pemasukan Bulan Ini</span>
            <ArrowDownLeft className="w-4 h-4 text-[var(--accent)]" />
          </div>
          <div className="text-2xl font-bold tracking-tight tabular-numbers text-[var(--accent)]">
            +{formatIDR(monthlyTotals.income)}
          </div>
          <p className="text-xs text-[var(--text-muted)]">Periode {currentYearMonth}</p>
        </div>

        <div className="p-5 rounded-lg border border-[var(--border)] bg-[var(--surface)] space-y-1">
          <div className="flex items-center justify-between text-xs text-[var(--text-muted)] font-medium">
            <span>Pengeluaran Bulan Ini</span>
            <ArrowUpRight className="w-4 h-4 text-[var(--expense)]" />
          </div>
          <div className="text-2xl font-bold tracking-tight tabular-numbers text-[var(--expense)]">
            -{formatIDR(monthlyTotals.expense)}
          </div>
          <p className="text-xs text-[var(--text-muted)]">Net: {formatIDR(monthlyTotals.netCashflow)}</p>
        </div>

        <div className="p-5 rounded-lg border border-[var(--border)] bg-[var(--surface)] space-y-1">
          <div className="flex items-center justify-between text-xs text-[var(--text-muted)] font-medium">
            <span>Savings Rate</span>
            <TrendingUp className="w-4 h-4 text-[var(--accent)]" />
          </div>
          <div className="text-2xl font-bold tracking-tight tabular-numbers text-[var(--foreground)]">
            {monthlyTotals.savingsRate}%
          </div>
          <p className="text-xs text-[var(--text-muted)]">Rasio simpanan terhadap masuk</p>
        </div>
      </section>

      {/* Quick Input Box (Interactive NLU) */}
      <section className="p-4 rounded-lg border border-[var(--border)] bg-[var(--surface)] space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1.5 text-xs font-medium text-[var(--text-muted)]">
            <Sparkles className="w-3.5 h-3.5 text-[var(--accent)]" />
            <span>Input Cepat (Indonesian NLU Parser)</span>
          </div>
          {parsedPreview && parsedPreview.amount && (
            <span className="text-xs font-mono px-2 py-0.5 rounded bg-[var(--surface-subtle)] border border-[var(--border)] text-[var(--text-muted)]">
              Terdeteksi: {parsedPreview.type === "income" ? "Pemasukan" : "Pengeluaran"} • {formatIDR(parsedPreview.amount)} • {parsedPreview.account}
            </span>
          )}
        </div>
        <form onSubmit={handleAddTransaction} className="flex flex-col sm:flex-row gap-2">
          <input
            type="text"
            value={nluInput}
            onChange={(e) => handleInputChange(e.target.value)}
            placeholder="Contoh: kopi kenangan 22rb gopay, bonus 500rb bca, bensin 50rb"
            className="flex-1 px-3 py-2 text-sm rounded-md border border-[var(--border)] bg-[var(--background)] focus:outline-none focus:ring-1 focus:ring-[var(--accent)] text-[var(--foreground)]"
          />
          <button
            type="submit"
            disabled={!nluInput.trim() || !parsedPreview?.amount}
            className="px-4 py-2 text-sm font-medium rounded-md bg-[var(--foreground)] text-[var(--background)] hover:opacity-90 disabled:opacity-40 disabled:cursor-not-allowed transition-opacity flex items-center justify-center gap-1.5"
          >
            <Plus className="w-4 h-4" /> Parse & Catat
          </button>
        </form>
      </section>

      {/* Budget Tracking Module */}
      <section className="p-5 rounded-lg border border-[var(--border)] bg-[var(--surface)] space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-[var(--border)] pb-3">
          <div className="flex items-center gap-2">
            <Target className="w-4 h-4 text-[var(--accent)]" />
            <h2 className="text-sm font-semibold tracking-tight text-[var(--foreground)]">Pemantauan Target Anggaran</h2>
            <span className="text-xs px-2 py-0.5 rounded bg-[var(--surface-subtle)] text-[var(--text-muted)] border border-[var(--border)] font-mono tabular-numbers">
              {budgetHealth.percentage}% Terpakai
            </span>
          </div>
          <div className="flex items-center gap-3 text-xs tabular-numbers font-mono text-[var(--text-muted)]">
            <span>Alokasi: <strong className="text-[var(--foreground)]">{formatIDR(budgetHealth.totalBudgeted)}</strong></span>
            <span>•</span>
            <span>Sisa: <strong className="text-[var(--foreground)]">{formatIDR(budgetHealth.remaining)}</strong></span>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {budgets.map((bgt) => {
            const progress = calculateBudgetProgress(bgt, transactions, "2026-10-31");
            const isExceeded = progress.status === "exceeded";
            const isWarning = progress.status === "warning";

            return (
              <div
                key={bgt.id}
                className="p-3.5 rounded-md border border-[var(--border)] bg-[var(--background)] space-y-2.5"
              >
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium text-[var(--foreground)] truncate">{bgt.categoryId}</span>
                  <span
                    className={`inline-flex items-center gap-1 text-[11px] px-1.5 py-0.5 rounded font-mono ${
                      isExceeded
                        ? "bg-[var(--expense-light)] text-[var(--expense)]"
                        : isWarning
                        ? "bg-amber-500/10 text-amber-600 dark:text-amber-400"
                        : "bg-[var(--accent-light)] text-[var(--accent)]"
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

                <div className="w-full bg-[var(--surface-subtle)] h-2 rounded-full overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all ${
                      isExceeded
                        ? "bg-[var(--expense)]"
                        : isWarning
                        ? "bg-amber-500"
                        : "bg-[var(--accent)]"
                    }`}
                    style={{ width: `${Math.min(100, progress.percentage)}%` }}
                  />
                </div>

                <div className="flex items-center justify-between text-xs text-[var(--text-muted)] tabular-numbers font-mono">
                  <span>{formatIDR(progress.spent)}</span>
                  <span>{formatIDR(progress.amount)}</span>
                </div>

                <div className="pt-1 border-t border-[var(--border)] flex items-center justify-between text-[11px] text-[var(--text-muted)]">
                  <span>Sisa: {formatIDR(progress.remaining)}</span>
                  <span className="tabular-numbers">Rekom: {formatIDR(progress.dailyRecommended)}/hari</span>
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {/* Spending Analytics Trends */}
      <section className="p-5 rounded-lg border border-[var(--border)] bg-[var(--surface)] space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-[var(--border)] pb-3">
          <div className="flex items-center gap-2">
            <Activity className="w-4 h-4 text-[var(--accent)]" />
            <h2 className="text-sm font-semibold tracking-tight text-[var(--foreground)]">Tren Pengeluaran Harian</h2>
            <span className="text-xs px-2 py-0.5 rounded bg-[var(--surface-subtle)] text-[var(--text-muted)] border border-[var(--border)] font-mono tabular-numbers">
              {spendingStats.activeExpenseDays} Hari Aktif
            </span>
          </div>
          <div className="flex items-center gap-3 text-xs tabular-numbers font-mono text-[var(--text-muted)]">
            <span>Rata-rata: <strong className="text-[var(--foreground)]">{formatIDR(spendingStats.dailyAverage)}/hari</strong></span>
            {spendingStats.peakDay && (
              <>
                <span>•</span>
                <span>Puncak: <strong className="text-[var(--expense)]">{formatIDR(spendingStats.peakDay.amount)}</strong> ({spendingStats.peakDay.date})</span>
              </>
            )}
          </div>
        </div>

        <div className="space-y-2">
          {dailySpending.length === 0 ? (
            <p className="text-xs text-[var(--text-muted)]">Belum ada data transaksi pengeluaran.</p>
          ) : (
            dailySpending.map((day) => {
              const maxAmount = spendingStats.peakDay?.amount || 1;
              const fillPct = Math.round((day.total / maxAmount) * 100);
              return (
                <div key={day.date} className="space-y-1">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-mono text-[var(--foreground)] flex items-center gap-1.5">
                      <Calendar className="w-3 h-3 text-[var(--text-muted)]" />
                      {day.date}
                    </span>
                    <span className="font-mono font-medium tabular-numbers text-[var(--foreground)]">
                      {formatIDR(day.total)}
                    </span>
                  </div>
                  <div className="w-full bg-[var(--surface-subtle)] h-1.5 rounded-full overflow-hidden">
                    <div
                      className="bg-[var(--accent)] h-full rounded-full transition-all"
                      style={{ width: `${Math.max(4, fillPct)}%` }}
                    />
                  </div>
                </div>
              );
            })
          )}
        </div>
      </section>

      {/* Recurring Obligations & Cashflow Projection Engine */}
      <section className="p-5 rounded-lg border border-[var(--border)] bg-[var(--surface)] space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-[var(--border)] pb-3">
          <div className="flex items-center gap-2">
            <Repeat className="w-4 h-4 text-[var(--accent)]" />
            <h2 className="text-sm font-semibold tracking-tight text-[var(--foreground)]">
              Kewajiban Rutin & Proyeksi Kas
            </h2>
            <span className="text-xs px-2 py-0.5 rounded bg-[var(--surface-subtle)] text-[var(--text-muted)] border border-[var(--border)] font-mono tabular-numbers">
              {recurring.filter((r) => r.isActive).length} Aktif
            </span>
          </div>
          <div className="flex items-center gap-3 text-xs tabular-numbers font-mono text-[var(--text-muted)]">
            <span>Komitmen Bulanan: <strong className="text-[var(--foreground)]">{formatIDR(monthlyCommitment)}</strong></span>
            <span>•</span>
            <span>Tagihan 7 Hari: <strong className={upcomingBills.length > 0 ? "text-[var(--expense)]" : "text-[var(--foreground)]"}>{upcomingBills.length} Tagihan ({formatIDR(upcomingTotal)})</strong></span>
          </div>
        </div>

        {/* 2-Column Grid: Left: Cashflow Projection 30 Days; Right: Recurring Schedule */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          {/* Projection Card */}
          <div className="p-4 rounded-md border border-[var(--border)] bg-[var(--background)] space-y-3 lg:col-span-1 flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between border-b border-[var(--border)] pb-2">
                <span className="text-xs font-semibold text-[var(--foreground)] flex items-center gap-1.5">
                  <CalendarClock className="w-3.5 h-3.5 text-[var(--accent)]" />
                  Proyeksi Kas 30 Hari
                </span>
                <span className="text-[11px] font-mono px-1.5 py-0.5 rounded bg-[var(--surface-subtle)] text-[var(--text-muted)] border border-[var(--border)]">
                  Simulasi Tetap
                </span>
              </div>

              <div className="mt-3 space-y-2 text-xs font-mono">
                <div className="flex items-center justify-between">
                  <span className="text-[var(--text-muted)]">Saldo Awal:</span>
                  <span className="tabular-numbers font-medium text-[var(--foreground)]">{formatIDR(netWorth)}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-[var(--text-muted)]">Proyeksi Pemasukan:</span>
                  <span className="tabular-numbers text-[var(--accent)]">+{formatIDR(projectedIncome)}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-[var(--text-muted)]">Komitmen Rutin:</span>
                  <span className="tabular-numbers text-[var(--expense)]">-{formatIDR(cashflowProjection.fixedExpenseTotal)}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-[var(--text-muted)]">Burn Discretionary:</span>
                  <span className="tabular-numbers text-[var(--expense)]">-{formatIDR(cashflowProjection.discretionaryExpenseTotal)}</span>
                </div>

                <div className="pt-2 border-t border-[var(--border)] flex items-center justify-between text-xs font-semibold">
                  <span className="text-[var(--foreground)]">Proyeksi Akhir:</span>
                  <span className={`tabular-numbers ${cashflowProjection.projectedBalance >= 0 ? "text-[var(--foreground)]" : "text-[var(--expense)]"}`}>
                    {formatIDR(cashflowProjection.projectedBalance)}
                  </span>
                </div>
              </div>
            </div>

            <div className="pt-3 border-t border-[var(--border)] flex items-center justify-between text-[11px] text-[var(--text-muted)] font-mono">
              <span>Runway Kas Proyeksi:</span>
              <span className="font-semibold text-[var(--foreground)]">
                {projectedRunway.runwayMonths === Infinity ? "Surplus / Lestari" : `${projectedRunway.runwayMonths} Bulan`}
              </span>
            </div>
          </div>

          {/* Obligations List */}
          <div className="p-4 rounded-md border border-[var(--border)] bg-[var(--background)] space-y-3 lg:col-span-2">
            <div className="flex items-center justify-between border-b border-[var(--border)] pb-2">
              <span className="text-xs font-semibold text-[var(--foreground)] flex items-center gap-1.5">
                <Receipt className="w-3.5 h-3.5 text-[var(--accent)]" />
                Jadwal Kewajiban & Tagihan
              </span>
              <span className="text-[11px] text-[var(--text-muted)]">
                Eksekusi bayar untuk rekonsiliasi saldo & ledger
              </span>
            </div>

            <div className="space-y-2 max-h-64 overflow-y-auto pr-1">
              {recurring.map((rec) => {
                const targetAccount = accounts.find((a) => a.id === rec.accountId)?.name || rec.accountId;
                const isUpcoming = upcomingBills.some((u) => u.id === rec.id);

                return (
                  <div
                    key={rec.id}
                    className={`p-2.5 rounded border transition-colors flex flex-col sm:flex-row sm:items-center justify-between gap-2 ${
                      !rec.isActive
                        ? "opacity-60 bg-[var(--surface-subtle)] border-[var(--border)]"
                        : isUpcoming
                        ? "border-[var(--expense)]/40 bg-[var(--surface)]"
                        : "border-[var(--border)] bg-[var(--surface)] hover:border-[var(--border-strong)]"
                    }`}
                  >
                    <div className="min-w-0 space-y-0.5">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-medium text-[var(--foreground)] truncate">
                          {rec.title}
                        </span>
                        <span className="text-[10px] px-1.5 py-0.2 rounded font-mono uppercase bg-[var(--surface-subtle)] text-[var(--text-muted)] border border-[var(--border)]">
                          {rec.frequency === "monthly" ? "Bulanan" : rec.frequency}
                        </span>
                        {isUpcoming && (
                          <span className="text-[10px] px-1.5 py-0.2 rounded font-mono bg-[var(--expense-light)] text-[var(--expense)]">
                            Jatuh Tempo Segera
                          </span>
                        )}
                      </div>
                      <div className="text-[11px] text-[var(--text-muted)] flex items-center gap-2">
                        <span>{rec.categoryId}</span>
                        <span>•</span>
                        <span>{targetAccount}</span>
                        <span>•</span>
                        <span className="font-mono tabular-numbers">Jatuh Tempo: {rec.nextDueDate}</span>
                      </div>
                    </div>

                    <div className="flex items-center gap-3 shrink-0">
                      <div className="text-right">
                        <div className="text-xs font-semibold tabular-numbers text-[var(--foreground)] font-mono">
                          {formatIDR(rec.amount)}
                        </div>
                        <div className="text-[10px] text-[var(--text-muted)]">
                          {rec.autoDeduct ? "Auto-debet" : "Manual"}
                        </div>
                      </div>

                      <div className="flex items-center gap-1.5">
                        <button
                          type="button"
                          onClick={() => handlePayRecurring(rec)}
                          disabled={!rec.isActive}
                          className="px-2.5 py-1 text-[11px] font-medium rounded bg-[var(--foreground)] text-[var(--background)] hover:opacity-90 disabled:opacity-40 disabled:cursor-not-allowed transition-opacity whitespace-nowrap"
                          title="Bayar tagihan & catat ke ledger"
                        >
                          Bayar
                        </button>
                        <button
                          type="button"
                          onClick={() => handleToggleRecurring(rec.id)}
                          className="px-2 py-1 text-[11px] font-medium rounded border border-[var(--border)] text-[var(--text-muted)] hover:text-[var(--foreground)] hover:bg-[var(--surface-subtle)] transition-colors"
                          title={rec.isActive ? "Jeda kewajiban" : "Aktifkan kewajiban"}
                        >
                          {rec.isActive ? "Jeda" : "Aktif"}
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </section>

      {/* Savings Goals & Sinking Funds Section */}
      <section className="p-5 rounded-lg border border-[var(--border)] bg-[var(--surface)] space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-[var(--border)] pb-3">
          <div className="flex items-center gap-2">
            <PiggyBank className="w-4 h-4 text-[var(--accent)]" />
            <h2 className="text-sm font-semibold tracking-tight text-[var(--foreground)]">
              Target Tabungan & Sinking Funds
            </h2>
            <span className="text-xs px-2 py-0.5 rounded bg-[var(--surface-subtle)] text-[var(--text-muted)] border border-[var(--border)] font-mono tabular-numbers">
              {savingsSummary.activeCount} Aktif • {savingsSummary.completedCount} Tercapai
            </span>
          </div>
          <div className="flex items-center gap-3 text-xs tabular-numbers font-mono text-[var(--text-muted)]">
            <span>Terkumpul: <strong className="text-[var(--accent)]">{formatIDR(savingsSummary.totalCurrentAmount)}</strong></span>
            <span>•</span>
            <span>Target Total: <strong className="text-[var(--foreground)]">{formatIDR(savingsSummary.totalTargetAmount)}</strong></span>
            <span>•</span>
            <span>Kebutuhan Bulanan: <strong className="text-[var(--foreground)]">{formatIDR(savingsSummary.totalMonthlyNeeded)}/bln</strong></span>
          </div>
        </div>

        {/* Goals Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {savingsGoals.map((goal) => {
            const prog = calculateGoalProgress(goal.currentAmount, goal.targetAmount);
            const isFinished = prog.isCompleted;

            return (
              <div
                key={goal.id}
                className="p-3.5 rounded-md border border-[var(--border)] bg-[var(--background)] flex flex-col justify-between space-y-3"
              >
                <div className="space-y-2">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <span className="text-sm font-medium text-[var(--foreground)] truncate block">
                        {goal.name}
                      </span>
                      <span className="text-[10px] font-mono text-[var(--text-muted)] uppercase tracking-wide">
                        {goal.category.replace("_", " ")}
                      </span>
                    </div>
                    <span
                      className={`text-[11px] font-mono px-1.5 py-0.5 rounded ${
                        isFinished
                          ? "bg-[var(--accent-light)] text-[var(--accent)] font-semibold"
                          : "bg-[var(--surface-subtle)] text-[var(--text-muted)] border border-[var(--border)]"
                      }`}
                    >
                      {prog.percentage}%
                    </span>
                  </div>

                  <div className="w-full bg-[var(--surface-subtle)] h-2 rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all ${
                        isFinished ? "bg-[var(--accent)]" : "bg-[var(--foreground)]"
                      }`}
                      style={{ width: `${prog.percentage}%` }}
                    />
                  </div>

                  <div className="flex items-center justify-between text-xs font-mono tabular-numbers text-[var(--text-muted)]">
                    <span>{formatIDR(goal.currentAmount)}</span>
                    <span>{formatIDR(goal.targetAmount)}</span>
                  </div>

                  <div className="flex items-center justify-between text-[11px] text-[var(--text-muted)] pt-1 border-t border-[var(--border)]">
                    <span>Target: {goal.targetDate}</span>
                    <span className="font-mono tabular-numbers">
                      {isFinished ? "Lunas" : `Sisa ${formatIDR(prog.remainingAmount)}`}
                    </span>
                  </div>
                </div>

                {!isFinished && (
                  <div className="pt-2 flex items-center gap-1.5 border-t border-[var(--border)]">
                    <button
                      type="button"
                      onClick={() => handleContributeSavings(goal.id, 500000)}
                      className="flex-1 py-1 text-[11px] font-medium rounded border border-[var(--border)] bg-[var(--surface)] text-[var(--foreground)] hover:bg-[var(--surface-subtle)] transition-colors text-center font-mono tabular-numbers"
                      title="Setor Rp 500.000 ke target tabungan"
                    >
                      +500rb
                    </button>
                    <button
                      type="button"
                      onClick={() => handleContributeSavings(goal.id, 1000000)}
                      className="flex-1 py-1 text-[11px] font-medium rounded border border-[var(--border)] bg-[var(--surface)] text-[var(--foreground)] hover:bg-[var(--surface-subtle)] transition-colors text-center font-mono tabular-numbers"
                      title="Setor Rp 1.000.000 ke target tabungan"
                    >
                      +1jt
                    </button>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </section>

      {/* Debt Tracker & Payoff Projections */}
      <section className="p-5 rounded-lg border border-[var(--border)] bg-[var(--surface)] space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-[var(--border)] pb-3">
          <div className="flex items-center gap-2">
            <BadgePercent className="w-4 h-4 text-[var(--expense)]" />
            <h2 className="text-sm font-semibold tracking-tight text-[var(--foreground)]">
              Pemantauan Utang & Proyeksi Lunas
            </h2>
            <span className="text-xs px-2 py-0.5 rounded bg-[var(--surface-subtle)] text-[var(--text-muted)] border border-[var(--border)] font-mono tabular-numbers">
              {debtSummary.activeDebtCount} Aktif • Rasio D/A {Math.round(debtRatio.ratio * 100)}% ({debtRatio.status})
            </span>
          </div>
          <div className="flex items-center gap-3 text-xs tabular-numbers font-mono text-[var(--text-muted)]">
            <span>Total Utang: <strong className="text-[var(--expense)]">{formatIDR(debtSummary.totalDebt)}</strong></span>
            <span>•</span>
            <span>Cicilan Bulanan: <strong className="text-[var(--foreground)]">{formatIDR(debtSummary.totalMonthlyPayment)}/bln</strong></span>
          </div>
        </div>

        {/* Debts Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {debts.map((d) => {
            const payoff = debtPayoffs.find((p) => p.debtId === d.id);
            const isPaid = d.status === "paid_off" || d.outstandingBalance === 0;
            const progressPct =
              d.principalAmount > 0
                ? Math.min(100, Math.round(((d.principalAmount - d.outstandingBalance) / d.principalAmount) * 100))
                : 100;

            return (
              <div
                key={d.id}
                className="p-3.5 rounded-md border border-[var(--border)] bg-[var(--background)] flex flex-col justify-between space-y-3"
              >
                <div className="space-y-2">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <span className="text-sm font-medium text-[var(--foreground)] truncate block">
                        {d.name}
                      </span>
                      <span className="text-[10px] font-mono text-[var(--text-muted)] uppercase tracking-wide">
                        {d.type.replace("_", " ")} • Bunga {d.interestRateAnnual}%/thn
                      </span>
                    </div>
                    <span
                      className={`text-[11px] font-mono px-1.5 py-0.5 rounded ${
                        isPaid
                          ? "bg-[var(--accent-light)] text-[var(--accent)] font-semibold"
                          : "bg-[var(--surface-subtle)] text-[var(--text-muted)] border border-[var(--border)]"
                      }`}
                    >
                      {isPaid ? "Lunas" : `${progressPct}%`}
                    </span>
                  </div>

                  <div className="w-full bg-[var(--surface-subtle)] h-2 rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all ${
                        isPaid ? "bg-[var(--accent)]" : "bg-[var(--expense)]"
                      }`}
                      style={{ width: `${progressPct}%` }}
                    />
                  </div>

                  <div className="flex items-center justify-between text-xs font-mono tabular-numbers text-[var(--text-muted)]">
                    <span>Sisa: <strong className={isPaid ? "text-[var(--text-muted)]" : "text-[var(--foreground)]"}>{formatIDR(d.outstandingBalance)}</strong></span>
                    <span>Total: {formatIDR(d.principalAmount)}</span>
                  </div>

                  <div className="flex items-center justify-between text-[11px] text-[var(--text-muted)] pt-1 border-t border-[var(--border)]">
                    <span>Cicilan: {formatIDR(d.monthlyPayment)}/bln</span>
                    <span className="font-mono tabular-numbers">
                      {isPaid ? "Tuntas" : payoff ? `Est. ${payoff.payoffDate}` : "-"}
                    </span>
                  </div>
                </div>

                {!isPaid && (
                  <div className="pt-2 flex items-center gap-1.5 border-t border-[var(--border)]">
                    <button
                      type="button"
                      onClick={() => handlePayDebt(d.id, d.monthlyPayment)}
                      className="flex-1 py-1 text-[11px] font-medium rounded border border-[var(--border)] bg-[var(--surface)] text-[var(--foreground)] hover:bg-[var(--surface-subtle)] transition-colors text-center font-mono tabular-numbers"
                      title="Bayar cicilan bulanan sesuai jadwal"
                    >
                      Bayar {formatIDR(d.monthlyPayment)}
                    </button>
                    <button
                      type="button"
                      onClick={() => handlePayDebt(d.id, d.outstandingBalance)}
                      className="py-1 px-2 text-[11px] font-medium rounded border border-[var(--border)] bg-[var(--accent-light)] text-[var(--accent)] hover:opacity-90 transition-opacity text-center font-mono"
                      title="Pelunasan instan seluruh sisa utang"
                    >
                      Lunas
                    </button>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </section>

      {/* Main Grid: Accounts, Category Breakdown & Recent Ledger */}
      <section className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column: Accounts & Breakdown */}
        <div className="space-y-6">
          {/* Accounts */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-semibold tracking-tight text-[var(--foreground)]">Daftar Rekening</h2>
              <span className="text-xs text-[var(--text-muted)]">{accounts.length} Akun</span>
            </div>
            <div className="space-y-2">
              {accounts.map((acc) => (
                <div
                  key={acc.id}
                  className="p-3.5 rounded-md border border-[var(--border)] bg-[var(--surface)] flex items-center justify-between hover:border-[var(--border-strong)] transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <CreditCard className="w-4 h-4 text-[var(--text-muted)]" />
                    <div>
                      <div className="text-sm font-medium text-[var(--foreground)]">{acc.name}</div>
                      <div className="text-xs text-[var(--text-muted)]">{acc.type}</div>
                    </div>
                  </div>
                  <div className="text-sm font-semibold tabular-numbers text-[var(--foreground)]">
                    {formatIDR(acc.balance)}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Category Breakdown (Engine output) */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-semibold tracking-tight text-[var(--foreground)] flex items-center gap-1.5">
                <PieChart className="w-3.5 h-3.5 text-[var(--text-muted)]" />
                Alokasi Pengeluaran
              </h2>
              <span className="text-xs text-[var(--text-muted)]">{categoryBreakdown.length} Kategori</span>
            </div>
            <div className="p-3.5 rounded-md border border-[var(--border)] bg-[var(--surface)] space-y-3">
              {categoryBreakdown.length === 0 ? (
                <p className="text-xs text-[var(--text-muted)]">Belum ada pengeluaran di periode ini.</p>
              ) : (
                categoryBreakdown.map((cat) => (
                  <div key={cat.categoryId} className="space-y-1">
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-[var(--foreground)] font-medium">{cat.categoryId}</span>
                      <span className="tabular-numbers text-[var(--text-muted)]">
                        {formatIDR(cat.amount)} ({cat.percentage}%)
                      </span>
                    </div>
                    <div className="w-full bg-[var(--surface-subtle)] h-1.5 rounded-full overflow-hidden">
                      <div
                        className="bg-[var(--expense)] h-full rounded-full"
                        style={{ width: `${Math.min(100, cat.percentage)}%` }}
                      />
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>

        {/* Right Column: Ledger */}
        <div className="lg:col-span-2 space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold tracking-tight text-[var(--foreground)]">Transaksi Terakhir</h2>
            <div className="flex items-center gap-1 text-xs text-[var(--text-muted)]">
              <Clock className="w-3.5 h-3.5" />
              <span>Real-time Ledger ({transactions.length})</span>
            </div>
          </div>

          <div className="rounded-md border border-[var(--border)] bg-[var(--surface)] divide-y divide-[var(--border)]">
            {transactions.map((tx) => (
              <div key={tx.id} className="p-3.5 flex items-center justify-between gap-4">
                <div className="flex items-center gap-3 min-w-0">
                  <div
                    className={`w-7 h-7 rounded-sm flex items-center justify-center shrink-0 ${
                      tx.type === "income"
                        ? "bg-[var(--accent-light)] text-[var(--accent)]"
                        : "bg-[var(--expense-light)] text-[var(--expense)]"
                    }`}
                  >
                    {tx.type === "income" ? (
                      <ArrowDownLeft className="w-4 h-4" />
                    ) : (
                      <ArrowUpRight className="w-4 h-4" />
                    )}
                  </div>
                  <div className="truncate">
                    <div className="text-sm font-medium text-[var(--foreground)] truncate">{tx.title}</div>
                    <div className="text-xs text-[var(--text-muted)]">
                      {tx.categoryId} • {tx.account} • {tx.date}
                    </div>
                  </div>
                </div>
                <div
                  className={`text-sm font-semibold tabular-numbers shrink-0 ${
                    tx.type === "income" ? "text-[var(--accent)]" : "text-[var(--foreground)]"
                  }`}
                >
                  {tx.type === "income" ? "+" : "-"}
                  {formatIDR(tx.amount)}
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
}
