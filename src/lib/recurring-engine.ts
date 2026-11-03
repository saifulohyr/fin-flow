import { RecurringTransactionInput } from "./validations/recurring";

export interface RecurringSummary {
  monthlyFixedCommitment: number;
  activeCount: number;
  upcomingBillsCount: number;
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
