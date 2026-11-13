export interface DailySpending {
  date: string;
  total: number;
}

export interface SpendingStats {
  totalSpending: number;
  dailyAverage: number;
  peakDay: { date: string; amount: number } | null;
  activeExpenseDays: number;
}

/**
 * Aggregates expense transactions by date in ascending chronological order.
 * ponytail: in-memory aggregation; upgrade to SQL groupBy when dataset exceeds 10k rows.
 */
export function aggregateSpendingByDate(
  transactions: { date: string; amount: number; type: string }[]
): DailySpending[] {
  const map = new Map<string, number>();

  for (const t of transactions) {
    if (t.type === "expense") {
      const current = map.get(t.date) || 0;
      map.set(t.date, current + t.amount);
    }
  }

  return Array.from(map.entries())
    .map(([date, total]) => ({ date, total }))
    .sort((a, b) => a.date.localeCompare(b.date));
}

/**
 * Calculates summary metrics (total, daily average, peak day) from transactions.
 * ponytail: single-pass summary; upgrade to DB window query when server-backed.
 */
export function calculateSpendingStats(
  transactions: { date: string; amount: number; type: string }[]
): SpendingStats {
  const daily = aggregateSpendingByDate(transactions);

  if (daily.length === 0) {
    return {
      totalSpending: 0,
      dailyAverage: 0,
      peakDay: null,
      activeExpenseDays: 0,
    };
  }

  let totalSpending = 0;
  let peakDay: { date: string; amount: number } | null = null;

  for (const item of daily) {
    totalSpending += item.total;
    if (!peakDay || item.total > peakDay.amount) {
      peakDay = { date: item.date, amount: item.total };
    }
  }

  const activeExpenseDays = daily.length;
  const dailyAverage = Math.round(totalSpending / activeExpenseDays);

  return {
    totalSpending,
    dailyAverage,
    peakDay,
    activeExpenseDays,
  };
}

/**
 * Calculates percentage change between two spending periods.
 */
export function calculateSpendingGrowth(previousTotal: number, currentTotal: number): number {
  if (previousTotal === 0) {
    return currentTotal > 0 ? 100 : 0;
  }
  const growth = ((currentTotal - previousTotal) / previousTotal) * 100;
  return Number(growth.toFixed(1));
}

/**
 * Returns spend totals per category for expense transactions.
 * Useful for category breakdown charts and budget vs. actual comparisons.
 * ponytail: in-memory reduce; replace with SQL GROUP BY when server-backed.
 */
export function getCategoryBreakdown(
  transactions: { category: string; amount: number; type: string }[],
): Record<string, number> {
  const map: Record<string, number> = {};
  for (const t of transactions) {
    if (t.type !== "expense") continue;
    map[t.category] = (map[t.category] ?? 0) + t.amount;
  }
  return map;
}
