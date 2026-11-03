import { RecurringTransactionInput, RecurringFrequency } from "./validations/recurring";

export interface RecurringSummary {
  monthlyFixedCommitment: number;
  activeCount: number;
  upcomingBillsCount: number;
}

export interface GeneratedTransaction {
  id: string;
  recurringId: string;
  title: string;
  amount: number;
  categoryId: string;
  accountId: string;
  type: "expense";
  date: string;
  note: string;
}

export interface ProcessedDueResult {
  dueItems: RecurringTransactionInput[];
  generatedTransactions: GeneratedTransaction[];
  updatedRecurringItems: RecurringTransactionInput[];
}

export interface RunwayResult {
  runwayMonths: number;
  isSolvent: boolean;
}

function formatDate(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

/**
 * Computes the subsequent due date based on recurrence frequency.
 * ponytail: clamps to last day of destination month for monthly/yearly cycles; upgrade to recurrence RRULE parser when complex schedules needed.
 */
export function computeNextDueDate(currentDueDateStr: string, frequency: RecurringFrequency): string {
  const [yearStr, monthStr, dayStr] = currentDueDateStr.split("-");
  const year = parseInt(yearStr, 10);
  const month = parseInt(monthStr, 10);
  const day = parseInt(dayStr, 10);

  const date = new Date(year, month - 1, day);

  switch (frequency) {
    case "daily":
      date.setDate(date.getDate() + 1);
      return formatDate(date);
    case "weekly":
      date.setDate(date.getDate() + 7);
      return formatDate(date);
    case "monthly": {
      const targetMonth = month; // 0-indexed: (month - 1) + 1
      const targetYear = year + Math.floor(targetMonth / 12);
      const normalizedMonth = targetMonth % 12;
      const daysInTargetMonth = new Date(targetYear, normalizedMonth + 1, 0).getDate();
      const clampedDay = Math.min(day, daysInTargetMonth);
      return formatDate(new Date(targetYear, normalizedMonth, clampedDay));
    }
    case "yearly": {
      const targetYear = year + 1;
      const daysInTargetMonth = new Date(targetYear, month, 0).getDate();
      const clampedDay = Math.min(day, daysInTargetMonth);
      return formatDate(new Date(targetYear, month - 1, clampedDay));
    }
  }
}

/**
 * Normalizes all recurring frequencies into an estimated monthly commitment in IDR.
 * ponytail: assumes 52 weeks / 12 months = 4.33 weeks/mo; upgrade to precise day-count convention when banking API integrates.
 */
export function calculateMonthlyCommitment(items: RecurringTransactionInput[]): number {
  return items
    .filter((item) => item.isActive)
    .reduce((total, item) => {
      switch (item.frequency) {
        case "daily":
          return total + item.amount * 30;
        case "weekly":
          return total + Math.round((item.amount * 52) / 12);
        case "monthly":
          return total + item.amount;
        case "yearly":
          return total + Math.round(item.amount / 12);
        default:
          return total;
      }
    }, 0);
}

/**
 * Filters and returns items whose nextDueDate falls within `daysAhead` from referenceDate.
 */
export function getUpcomingBills(
  items: RecurringTransactionInput[],
  referenceDateStr: string,
  daysAhead: number = 7
): RecurringTransactionInput[] {
  const refTime = new Date(referenceDateStr).getTime();
  const maxTime = refTime + daysAhead * 24 * 60 * 60 * 1000;

  return items.filter((item) => {
    if (!item.isActive) return false;
    const dueTime = new Date(item.nextDueDate).getTime();
    return dueTime >= refTime && dueTime <= maxTime;
  });
}

/**
 * Projects net cashflow for next N days considering fixed commitments and baseline daily discretionary burn.
 */
export function projectCashflow(
  currentBalance: number,
  monthlyIncome: number,
  recurringItems: RecurringTransactionInput[],
  dailyBurn: number,
  daysToProject: number = 30
): { projectedBalance: number; fixedExpenseTotal: number; discretionaryExpenseTotal: number } {
  const dailyIncome = monthlyIncome / 30;
  const fixedExpenseTotal = Math.round((calculateMonthlyCommitment(recurringItems) / 30) * daysToProject);
  const discretionaryExpenseTotal = dailyBurn * daysToProject;
  const projectedIncome = Math.round(dailyIncome * daysToProject);

  const projectedBalance = currentBalance + projectedIncome - fixedExpenseTotal - discretionaryExpenseTotal;

  return {
    projectedBalance,
    fixedExpenseTotal,
    discretionaryExpenseTotal,
  };
}

/**
 * Calculates financial runway in months based on current balance and net monthly deficit.
 * ponytail: assumes static burn rate; upgrade to Monte Carlo or trend-weighted simulation when 90-day history exists.
 */
export function calculateCashflowRunway(currentBalance: number, monthlyNetBurn: number): RunwayResult {
  if (currentBalance <= 0) {
    return { runwayMonths: 0, isSolvent: false };
  }
  if (monthlyNetBurn <= 0) {
    return { runwayMonths: Infinity, isSolvent: true };
  }

  const months = Number((currentBalance / monthlyNetBurn).toFixed(1));
  return {
    runwayMonths: months,
    isSolvent: true,
  };
}

/**
 * Aggregates active recurring obligations grouped by category.
 */
export function breakdownObligationsByCategory(
  items: RecurringTransactionInput[]
): Record<string, { totalMonthly: number; count: number }> {
  const breakdown: Record<string, { totalMonthly: number; count: number }> = {};

  for (const item of items) {
    if (!item.isActive) continue;
    if (!breakdown[item.categoryId]) {
      breakdown[item.categoryId] = { totalMonthly: 0, count: 0 };
    }

    let monthlyVal = item.amount;
    if (item.frequency === "daily") monthlyVal = item.amount * 30;
    else if (item.frequency === "weekly") monthlyVal = Math.round((item.amount * 52) / 12);
    else if (item.frequency === "yearly") monthlyVal = Math.round(item.amount / 12);

    breakdown[item.categoryId].totalMonthly += monthlyVal;
    breakdown[item.categoryId].count += 1;
  }

  return breakdown;
}

/**
 * Processes recurring items due on or before referenceDate, returning generated transactions and updated dates.
 */
export function processDueRecurring(
  items: RecurringTransactionInput[],
  referenceDateStr: string
): ProcessedDueResult {
  const refTime = new Date(referenceDateStr).getTime();
  const dueItems: RecurringTransactionInput[] = [];
  const generatedTransactions: GeneratedTransaction[] = [];
  const updatedRecurringItems: RecurringTransactionInput[] = [];

  for (const item of items) {
    const dueTime = new Date(item.nextDueDate).getTime();
    if (item.isActive && dueTime <= refTime) {
      dueItems.push(item);
      const executionDate = item.nextDueDate;
      const nextDueDate = computeNextDueDate(item.nextDueDate, item.frequency);

      generatedTransactions.push({
        id: `tx-rec-${item.id}-${executionDate}`,
        recurringId: item.id,
        title: item.title,
        amount: item.amount,
        categoryId: item.categoryId,
        accountId: item.accountId,
        type: "expense",
        date: executionDate,
        note: `Pembayaran rutin otomatis: ${item.title}`,
      });

      updatedRecurringItems.push({
        ...item,
        nextDueDate,
      });
    } else {
      updatedRecurringItems.push(item);
    }
  }

  return {
    dueItems,
    generatedTransactions,
    updatedRecurringItems,
  };
}
