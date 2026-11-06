import { db } from '@/db';
import { accounts } from '@/db/schema';
import { eq } from 'drizzle-orm';

export async function getAllAccounts() {
  return db.select().from(accounts);
}

export async function createAccount(data: {
  id: string;
  name: string;
  type: 'bank' | 'ewallet' | 'cash' | 'investment';
  balance: number;
  accountNumber?: string;
  color?: string;
}) {
  return db.insert(accounts).values({
    ...data,
    color: data.color ?? '#047857',
    createdAt: new Date(),
    updatedAt: new Date(),
  }).returning();
}

export async function updateAccountBalance(id: string, balance: number) {
  return db.update(accounts).set({ balance, updatedAt: new Date() }).where(eq(accounts.id, id)).returning();
}

export async function deleteAccount(id: string) {
  return db.delete(accounts).where(eq(accounts.id, id)).returning();
}
