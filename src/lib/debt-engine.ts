/**
 * Debt Tracker Engine
 * Payoff schedule, interest projection, debt-to-asset ratio.
 */

export interface DebtEntry {
  id: string;
  name: string;
  type: string;
  outstandingBalance: number; // IDR rupiah (integer)
  interestRateAnnual: number; // percent e.g. 12 = 12%
  monthlyPayment: number;
  status: "active" | "paid_off" | "defaulted";
}

export interface DebtSummary {
  totalDebt: number;
  totalMonthlyPayment: number;
  debtCount: number;
  activeDebtCount: number;
  highestDebt: DebtEntry | null;
}

export interface PayoffProjection {
  debtId: string;
  debtName: string;
  monthsToPayoff: number;
  totalInterestPaid: number;
  payoffDate: string; // YYYY-MM
}

export interface DebtToAssetRatio {
  totalAssets: number;
  totalDebt: number;
  ratio: number; // 0–1+; <0.4 healthy, 0.4–0.6 caution, >0.6 high risk
  status: "healthy" | "caution" | "high_risk";
}

/** Aggregate active-debt summary. */
export function summarizeDebts(debts: DebtEntry[]): DebtSummary {
  const active = debts.filter((d) => d.status === "active");
  const totalDebt = active.reduce((s, d) => s + d.outstandingBalance, 0);
  const totalMonthlyPayment = active.reduce((s, d) => s + d.monthlyPayment, 0);
  const highestDebt =
    active.length > 0
      ? active.reduce((max, d) => (d.outstandingBalance > max.outstandingBalance ? d : max), active[0])
      : null;

  return {
    totalDebt,
    totalMonthlyPayment,
    debtCount: debts.length,
    activeDebtCount: active.length,
    highestDebt,
  };
}

/**
 * Project payoff for a single debt using fixed monthly payment + monthly compounding.
 * ponytail: assumes fixed monthly payment; add extra payment / snowball variant when multiple debts.
 */
export function projectPayoff(debt: DebtEntry, fromYearMonth: string): PayoffProjection {
  const { id, name, outstandingBalance, interestRateAnnual, monthlyPayment } = debt;
  const monthlyRate = interestRateAnnual / 100 / 12;

  if (outstandingBalance <= 0 || debt.status !== "active") {
    return {
      debtId: id,
      debtName: name,
      monthsToPayoff: 0,
      totalInterestPaid: 0,
      payoffDate: fromYearMonth,
    };
  }

  // Minimum viable payment guard: at least cover first month's interest
  const minPayment = monthlyRate > 0 ? Math.ceil(outstandingBalance * monthlyRate) + 1 : 1;
  const effectivePayment = Math.max(monthlyPayment, minPayment);

  let balance = outstandingBalance;
  let months = 0;
  let totalInterestPaid = 0;
  const MAX_MONTHS = 600; // 50-year safety cap

  while (balance > 0 && months < MAX_MONTHS) {
    const interest = monthlyRate > 0 ? Math.round(balance * monthlyRate) : 0;
    totalInterestPaid += interest;
    balance = balance + interest - effectivePayment;
    if (balance < 0) balance = 0;
    months++;
  }

  // Advance fromYearMonth by `months`
  const [y, m] = fromYearMonth.split("-").map(Number);
  const totalMonths = y * 12 + m - 1 + months;
  const payoffYear = Math.floor(totalMonths / 12);
  const payoffMonth = (totalMonths % 12) + 1;
  const payoffDate = `${payoffYear}-${String(payoffMonth).padStart(2, "0")}`;

  return { debtId: id, debtName: name, monthsToPayoff: months, totalInterestPaid, payoffDate };
}

/** Debt-to-asset ratio for net-worth health check. */
export function calculateDebtToAssetRatio(totalAssets: number, totalDebt: number): DebtToAssetRatio {
  const ratio = totalAssets > 0 ? +(totalDebt / totalAssets).toFixed(3) : totalDebt > 0 ? 999 : 0;
  const status: DebtToAssetRatio["status"] =
    ratio < 0.4 ? "healthy" : ratio < 0.6 ? "caution" : "high_risk";
  return { totalAssets, totalDebt, ratio, status };
}

/** Project payoff for all active debts. */
export function projectAllPayoffs(debts: DebtEntry[], fromYearMonth: string): PayoffProjection[] {
  return debts.filter((d) => d.status === "active").map((d) => projectPayoff(d, fromYearMonth));
}
