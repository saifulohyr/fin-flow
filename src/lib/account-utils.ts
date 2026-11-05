export interface AccountSummary {
  id: string;
  name: string;
  type: string;
  balance: number;
}

export interface AssetAllocationItem {
  type: string;
  totalBalance: number;
  percentage: number;
  count: number;
}

export function filterAccountsByType(accounts: AccountSummary[], type: string): AccountSummary[] {
  return accounts.filter((acc) => acc.type.toLowerCase() === type.toLowerCase());
}

export function getTotalBalanceByType(accounts: AccountSummary[], type: string): number {
  return filterAccountsByType(accounts, type).reduce((sum, acc) => sum + acc.balance, 0);
}

/**
 * Calculates asset distribution across distinct account types.
 * ponytail: simple in-memory reducer; scale with SQL group-by for large userbases.
 */
export function calculateAssetAllocation(accounts: AccountSummary[]): AssetAllocationItem[] {
  const totalBalance = accounts.reduce((sum, acc) => sum + acc.balance, 0);
  const types = Array.from(new Set(accounts.map((acc) => acc.type)));

  return types.map((type) => {
    const total = getTotalBalanceByType(accounts, type);
    const count = filterAccountsByType(accounts, type).length;
    const percentage = totalBalance > 0 ? Math.round((total / totalBalance) * 100) : 0;
    return {
      type,
      totalBalance: total,
      percentage,
      count,
    };
  });
}
