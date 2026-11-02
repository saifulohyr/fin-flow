export interface DailySpending {
  date: string;
  total: number;
}

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
