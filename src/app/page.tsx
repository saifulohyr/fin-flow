import { formatIDR } from "@/lib/currency";
import { ArrowUpRight, ArrowDownLeft, Wallet, CreditCard, Sparkles, Plus, Clock } from "lucide-react";

interface Account {
  id: string;
  name: string;
  type: string;
  balance: number;
}

interface Transaction {
  id: string;
  title: string;
  category: string;
  account: string;
  amount: number;
  type: "income" | "expense";
  date: string;
}

const ACCOUNTS: Account[] = [
  { id: "1", name: "BCA Tabungan", type: "Bank", balance: 14250000 },
  { id: "2", name: "Bank Mandiri", type: "Bank", balance: 5800000 },
  { id: "3", name: "GoPay", type: "E-Wallet", balance: 340000 },
  { id: "4", name: "Tunai / Cash", type: "Physical", balance: 650000 },
];

const TRANSACTIONS: Transaction[] = [
  { id: "t1", title: "Honor Freelance Web", category: "Pendapatan", account: "BCA Tabungan", amount: 4500000, type: "income", date: "Hari ini, 14:15" },
  { id: "t2", title: "Makan Siang Nasi Padang", category: "Konsumsi", account: "GoPay", amount: 32000, type: "expense", date: "Hari ini, 12:30" },
  { id: "t3", title: "Bensin Pertamax", category: "Transport", account: "Tunai / Cash", amount: 100000, type: "expense", date: "Kemarin, 18:20" },
  { id: "t4", title: "Listrik PLN Pascabayar", category: "Tagihan", account: "Bank Mandiri", amount: 420000, type: "expense", date: "28 Okt, 09:10" },
];

export default function Home() {
  const totalBalance = ACCOUNTS.reduce((sum, acc) => sum + acc.balance, 0);
  const totalIncome = TRANSACTIONS.filter((t) => t.type === "income").reduce((sum, t) => sum + t.amount, 0);
  const totalExpense = TRANSACTIONS.filter((t) => t.type === "expense").reduce((sum, t) => sum + t.amount, 0);

  return (
    <main className="min-h-screen px-4 py-8 md:px-12 md:py-12 max-w-6xl mx-auto space-y-8">
      {/* Top Bar */}
      <header className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b pb-6 border-[var(--border)]">
        <div>
          <div className="flex items-center gap-2">
            <span className="h-3 w-3 rounded-sm bg-[var(--accent)]" />
            <h1 className="text-xl font-bold tracking-tight text-[var(--foreground)]">FinFlow</h1>
            <span className="text-xs px-2 py-0.5 rounded bg-[var(--surface-subtle)] text-[var(--text-muted)] border border-[var(--border)]">
              Personal Finance
            </span>
          </div>
          <p className="text-sm text-[var(--text-muted)] mt-1">Buku kas pribadi, pencatatan cepat, dan ringkasan keuangan.</p>
        </div>
        <div className="flex items-center gap-2">
          <button className="flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium rounded-md bg-[var(--accent)] text-white hover:opacity-90 transition-opacity">
            <Plus className="w-4 h-4" /> Catat Transaksi
          </button>
        </div>
      </header>

      {/* KPI Overview */}
      <section className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="p-5 rounded-lg border border-[var(--border)] bg-[var(--surface)] space-y-1">
          <div className="flex items-center justify-between text-xs text-[var(--text-muted)] font-medium">
            <span>Total Saldo Bersih</span>
            <Wallet className="w-4 h-4 text-[var(--text-muted)]" />
          </div>
          <div className="text-2xl font-bold tracking-tight tabular-numbers text-[var(--foreground)]">
            {formatIDR(totalBalance)}
          </div>
          <p className="text-xs text-[var(--text-muted)]">Akumulasi 4 rekening aktif</p>
        </div>

        <div className="p-5 rounded-lg border border-[var(--border)] bg-[var(--surface)] space-y-1">
          <div className="flex items-center justify-between text-xs text-[var(--text-muted)] font-medium">
            <span>Pemasukan Bulan Ini</span>
            <ArrowDownLeft className="w-4 h-4 text-[var(--accent)]" />
          </div>
          <div className="text-2xl font-bold tracking-tight tabular-numbers text-[var(--accent)]">
            +{formatIDR(totalIncome)}
          </div>
          <p className="text-xs text-[var(--text-muted)]">Dari gaji & freelance</p>
        </div>

        <div className="p-5 rounded-lg border border-[var(--border)] bg-[var(--surface)] space-y-1">
          <div className="flex items-center justify-between text-xs text-[var(--text-muted)] font-medium">
            <span>Pengeluaran Bulan Ini</span>
            <ArrowUpRight className="w-4 h-4 text-[var(--expense)]" />
          </div>
          <div className="text-2xl font-bold tracking-tight tabular-numbers text-[var(--expense)]">
            -{formatIDR(totalExpense)}
          </div>
          <p className="text-xs text-[var(--text-muted)]">Terkendali dalam batas anggaran</p>
        </div>
      </section>

      {/* Quick Input Box */}
      <section className="p-4 rounded-lg border border-[var(--border)] bg-[var(--surface)] space-y-2">
        <div className="flex items-center gap-1.5 text-xs font-medium text-[var(--text-muted)]">
          <Sparkles className="w-3.5 h-3.5 text-[var(--accent)]" />
          <span>Input Cepat (NLU Shorthand)</span>
        </div>
        <div className="flex flex-col sm:flex-row gap-2">
          <input
            type="text"
            placeholder="Contoh: kopi kenangan 22rb gopay atau bonus 500rb bca"
            className="flex-1 px-3 py-2 text-sm rounded-md border border-[var(--border)] bg-[var(--background)] focus:outline-none focus:ring-1 focus:ring-[var(--accent)]"
          />
          <button className="px-4 py-2 text-sm font-medium rounded-md bg-[var(--foreground)] text-[var(--background)] hover:opacity-90 transition-opacity">
            Parse & Catat
          </button>
        </div>
      </section>

      {/* Main Grid: Accounts & Recent Ledger */}
      <section className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Accounts Column */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold tracking-tight text-[var(--foreground)]">Daftar Rekening</h2>
            <span className="text-xs text-[var(--text-muted)]">{ACCOUNTS.length} Akun</span>
          </div>
          <div className="space-y-2">
            {ACCOUNTS.map((acc) => (
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

        {/* Ledger Column */}
        <div className="lg:col-span-2 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold tracking-tight text-[var(--foreground)]">Transaksi Terakhir</h2>
            <div className="flex items-center gap-1 text-xs text-[var(--text-muted)]">
              <Clock className="w-3.5 h-3.5" />
              <span>Real-time Ledger</span>
            </div>
          </div>

          <div className="rounded-md border border-[var(--border)] bg-[var(--surface)] divide-y divide-[var(--border)]">
            {TRANSACTIONS.map((tx) => (
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
                      {tx.category} • {tx.account} • {tx.date}
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
    </main>
  );
}
