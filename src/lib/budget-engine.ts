import { BudgetInput } from "./validations/budget";
import { RawTransaction } from "./finance-engine";

export type BudgetStatus = "safe" | "warning" | "exceeded";

export interface BudgetProgress {
  budgetId: string;
  categoryId: string;
  amount: number;
  spent: number;
  remaining: number;
  percentage: number;
  status: BudgetStatus;
  overspentAmount: number;
  dailyRecommended: number;
  daysRemaining: number;
}

export interface OverallBudgetHealth {
  totalBudgeted: number;
  totalSpent: number;
  remaining: number;
  percentage: number;
  safeCount: number;
  warningCount: number;
  exceededCount: number;
}

function getPeriodDateRange(budget: BudgetInput): { start: string; end: string } {
  if (budget.endDate) {
    return { start: budget.startDate, end: budget.endDate };
  }

  const [yearStr, monthStr, dayStr] = budget.startDate.split("-");
  const year = parseInt(yearStr, 10);
  const month = parseInt(monthStr, 10);
  const day = parseInt(dayStr, 10);

  if (budget.period === "weekly") {
    const end = new Date(Date.UTC(year, month - 1, day + 6));
    return {
      start: budget.startDate,
      end: end.toISOString().slice(0, 10),
    };
  }

  if (budget.period === "yearly") {
    return {
      start: `${yearStr}-01-01`,
      end: `${yearStr}-12-31`,
    };
  }

  // default monthly: full calendar month of startDate
  const lastDay = new Date(Date.UTC(year, month, 0)).getUTCDate();
  const padMonth = String(month).padStart(2, "0");
  return {
    start: `${yearStr}-${padMonth}-01`,
    end: `${yearStr}-${padMonth}-${String(lastDay).padStart(2, "0")}`,
  };
}

export function calculateBudgetProgress(
  budget: BudgetInput,
  transactions: RawTransaction[],
  referenceDate?: string
): BudgetProgress {
  const { start, end } = getPeriodDateRange(budget);
  const today = referenceDate || budget.startDate;

  // Filter transactions by matching category, expense type, and within period range
  const matchingTransactions = transactions.filter(
    (tx) =>
      tx.type === "expense" &&
      tx.categoryId === budget.categoryId &&
      tx.date >= start &&
      tx.date <= end
  );

  const spent = matchingTransactions.reduce((acc, tx) => acc + tx.amount, 0);
  const remaining = budget.amount - spent;
  const percentage =
    budget.amount > 0 ? Number(((spent / budget.amount) * 100).toFixed(1)) : 0;

  const thresholdPercent = budget.notifyThreshold ?? 80;
  const warningLimit = (budget.amount * thresholdPercent) / 100;

  let status: BudgetStatus = "safe";
  if (spent > budget.amount) {
    status = "exceeded";
  } else if (spent >= warningLimit) {
    status = "warning";
  }

  const overspentAmount = Math.max(0, spent - budget.amount);

  // Pacing calculations
  const refDateObj = new Date(today);
  const endDateObj = new Date(end);
  const msPerDay = 1000 * 60 * 60 * 24;
  const diffDays = Math.ceil((endDateObj.getTime() - refDateObj.getTime()) / msPerDay);
  const daysRemaining = Math.max(1, diffDays);

  const dailyRecommended =
    remaining > 0 ? Math.max(0, Math.floor(remaining / daysRemaining)) : 0;

  return {
    budgetId: budget.id,
    categoryId: budget.categoryId,
    amount: budget.amount,
    spent,
    remaining,
    percentage,
    status,
    overspentAmount,
    dailyRecommended,
    daysRemaining,
  };
}

export function calculateOverallBudgetHealth(
  budgets: BudgetInput[],
  transactions: RawTransaction[],
  referenceDate?: string
): OverallBudgetHealth {
  if (budgets.length === 0) {
    return {
      totalBudgeted: 0,
      totalSpent: 0,
      remaining: 0,
      percentage: 0,
      safeCount: 0,
      warningCount: 0,
      exceededCount: 0,
    };
  }

  let totalBudgeted = 0;
  let totalSpent = 0;
  let safeCount = 0;
  let warningCount = 0;
  let exceededCount = 0;

  for (const bgt of budgets) {
    const progress = calculateBudgetProgress(bgt, transactions, referenceDate);
    totalBudgeted += bgt.amount;
    totalSpent += progress.spent;

    if (progress.status === "safe") safeCount++;
    else if (progress.status === "warning") warningCount++;
    else if (progress.status === "exceeded") exceededCount++;
  }

  const remaining = totalBudgeted - totalSpent;
  const percentage =
    totalBudgeted > 0 ? Number(((totalSpent / totalBudgeted) * 100).toFixed(1)) : 0;

  return {
    totalBudgeted,
    totalSpent,
    remaining,
    percentage,
    safeCount,
    warningCount,
    exceededCount,
  };
}

export function projectPeriodSpend(
  spent: number,
  daysElapsed: number,
  totalDays: number
): { projectedTotal: number; burnRatePerDay: number } {
  if (daysElapsed <= 0 || spent <= 0) {
    return { projectedTotal: spent, burnRatePerDay: 0 };
  }

  const burnRatePerDay = Math.round(spent / daysElapsed);
  const projectedTotal = Math.round(burnRatePerDay * totalDays);

  return { projectedTotal, burnRatePerDay };
}
