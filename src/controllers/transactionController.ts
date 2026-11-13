import { db } from '@/db';
import { transactions } from '@/db/schema';
import { eq } from 'drizzle-orm';

/** Returns all transactions ordered by date descending. */
export async function getAllTransactions() {
  return db.select().from(transactions);
}

/**
 * Inserts a new transaction row.
 * `title` is stored in the `note` column; falls back to null when both omitted.
 */
export async function createTransaction(data: {
  id: string;
  title?: string;
  amount: number;
  type: 'income' | 'expense' | 'transfer';
  categoryId?: string;
  accountId: string;
  date: string;
  note?: string;
}) {
  return db.insert(transactions).values({
    id: data.id,
    amount: data.amount,
    type: data.type,
    accountId: data.accountId,
    categoryId: data.categoryId ?? 'cat-default',
    note: data.note ?? data.title ?? null,
    date: data.date,
    createdAt: new Date(),
  }).returning();
}

/**
 * Partial update for mutable transaction fields.
 * Amount, note, date, and categoryId may be changed; type and accountId are intentionally
 * excluded to avoid invalidating balance history without a compensating entry.
 */
export async function updateTransaction(
  id: string,
  patch: {
    amount?: number;
    note?: string;
    date?: string;
    categoryId?: string;
  },
) {
  if (Object.keys(patch).length === 0) return [];
  return db.update(transactions).set(patch).where(eq(transactions.id, id)).returning();
}

/** Hard-deletes a transaction by primary key. */
export async function deleteTransaction(id: string) {
  return db.delete(transactions).where(eq(transactions.id, id)).returning();
}
