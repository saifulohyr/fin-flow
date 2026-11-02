export interface AccountSummary {
  id: string;
  name: string;
  type: string;
  balance: number;
}

export function filterAccountsByType(accounts: AccountSummary[], type: string): AccountSummary[] {
  return accounts.filter((acc) => acc.type === type);
}

export function getTotalBalanceByType(accounts: AccountSummary[], type: string): number {
  return filterAccountsByType(accounts, type).reduce((sum, acc) => sum + acc.balance, 0);
}
