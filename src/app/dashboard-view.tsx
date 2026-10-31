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

export function DashboardView() {
  const [accounts, setAccounts] = useState<RawAccount[]>(INITIAL_ACCOUNTS);
  const [transactions, setTransactions] = useState<DisplayTransaction[]>(INITIAL_TRANSACTIONS);
  const [nluInput, setNluInput] = useState("");
  const [parsedPreview, setParsedPreview] = useState<ReturnType<typeof parseTransactionNLU> | null>(null);

  const currentYearMonth = "2026-10";
  const netWorth = calculateNetWorth(accounts);
  const monthlyTotals = calculateMonthlyTotals(transactions, currentYearMonth);
  const categoryBreakdown = calculateCategoryBreakdown(transactions, currentYearMonth);
  const runwayMonths = calculateRunwayMonths(netWorth, monthlyTotals.expense);

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
            Buku kas pribadi, kalkulasi keuangan presisi, dan entri natural language.
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
