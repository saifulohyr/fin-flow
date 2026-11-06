import { db } from '@/db';
import { transactions } from '@/db/schema';
import { eq } from 'drizzle-orm';

export async function getAllTransactions() {
  return db.select().from(transactions);
}

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

export async function deleteTransaction(id: string) {
  return db.delete(transactions).where(eq(transactions.id, id)).returning();
}
