import { db } from '@/db';
import { accounts } from '@/db/schema';
import { eq } from 'drizzle-orm';

/** Returns all account rows. */
export async function getAllAccounts() {
  return db.select().from(accounts);
}

/**
 * Returns a single account by ID, or `undefined` when not found.
 * Callers should handle the undefined case before proceeding.
 */
export async function getAccountById(id: string) {
  const rows = await db.select().from(accounts).where(eq(accounts.id, id)).limit(1);
  return rows[0];
}

/**
 * Inserts a new account row.
 * Default color is brand green (#047857) matching the design system.
 */
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

/**
 * Updates the balance of an existing account.
 * Returns an empty array when the account ID does not exist.
 */
export async function updateAccountBalance(id: string, balance: number) {
  return db.update(accounts).set({ balance, updatedAt: new Date() }).where(eq(accounts.id, id)).returning();
}

/** Hard-deletes an account. Cascades to linked transactions. */
export async function deleteAccount(id: string) {
  return db.delete(accounts).where(eq(accounts.id, id)).returning();
}
