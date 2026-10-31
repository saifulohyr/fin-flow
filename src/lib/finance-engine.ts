export interface RawAccount {
  id: string;
  name: string;
  type: string;
  balance: number;
}

export interface RawTransaction {
  id: string;
  amount: number;
  type: "income" | "expense" | "transfer";
  categoryId: string;
  date: string; // YYYY-MM-DD
}

export interface CategorySummary {
  categoryId: string;
  amount: number;
  percentage: number;
}

export function calculateNetWorth(accounts: RawAccount[]): number {
  return accounts.reduce((acc, curr) => acc + curr.balance, 0);
}

export function calculateMonthlyTotals(
  transactions: RawTransaction[],
  yearMonth: string
): { income: number; expense: number; netCashflow: number; savingsRate: number } {
  const filtered = transactions.filter((t) => t.date.startsWith(yearMonth));

  let income = 0;
  let expense = 0;

  for (const t of filtered) {
    if (t.type === "income") income += t.amount;
    if (t.type === "expense") expense += t.amount;
  }

  const netCashflow = income - expense;
  const savingsRate = income > 0 ? Math.max(0, Math.round((netCashflow / income) * 100)) : 0;

  return { income, expense, netCashflow, savingsRate };
}

export function calculateBurnRate(totalExpense: number, daysPassed: number): number {
  if (daysPassed <= 0) return 0;
  return Math.round(totalExpense / daysPassed);
}

export function calculateRunwayMonths(totalLiquidAssets: number, monthlyBurn: number): number {
  if (monthlyBurn <= 0) return 999;
  if (totalLiquidAssets <= 0) return 0;
  return Number((totalLiquidAssets / monthlyBurn).toFixed(1));
}

export function calculateCategoryBreakdown(
  transactions: RawTransaction[],
  yearMonth: string
): CategorySummary[] {
  const filtered = transactions.filter((t) => t.type === "expense" && t.date.startsWith(yearMonth));
  const total = filtered.reduce((sum, t) => sum + t.amount, 0);
  if (total === 0) return [];

  const map = new Map<string, number>();
  for (const t of filtered) {
    map.set(t.categoryId, (map.get(t.categoryId) ?? 0) + t.amount);
  }

  const result: CategorySummary[] = [];
  for (const [categoryId, amount] of map.entries()) {
    result.push({
      categoryId,
      amount,
      percentage: Number(((amount / total) * 100).toFixed(1)),
    });
  }

  return result.sort((a, b) => b.amount - a.amount);
}
