import { describe, it, expect } from "vitest";
import {
  INITIAL_ACCOUNTS,
  INITIAL_TRANSACTIONS,
  INITIAL_BUDGETS,
  INITIAL_RECURRING,
  INITIAL_SAVINGS_GOALS,
  INITIAL_DEBTS,
} from "@/lib/initial-data";

describe("Mobile Navigation & Dedicated Pages Data Integrity", () => {
  it("provides valid initial accounts dataset", () => {
    expect(INITIAL_ACCOUNTS.length).toBeGreaterThan(0);
    for (const acc of INITIAL_ACCOUNTS) {
      expect(acc.id).toBeDefined();
      expect(typeof acc.balance).toBe("number");
    }
  });

  it("provides valid initial transactions dataset", () => {
    expect(INITIAL_TRANSACTIONS.length).toBeGreaterThan(0);
    for (const tx of INITIAL_TRANSACTIONS) {
      expect(tx.id).toBeDefined();
      expect(tx.amount).toBeGreaterThan(0);
      expect(["income", "expense", "transfer"]).toContain(tx.type);
    }
  });

  it("provides valid initial budgets dataset", () => {
    expect(INITIAL_BUDGETS.length).toBeGreaterThan(0);
    for (const b of INITIAL_BUDGETS) {
      expect(b.amount).toBeGreaterThan(0);
      expect(b.categoryId).toBeDefined();
    }
  });

  it("provides valid initial recurring commitments dataset", () => {
    expect(INITIAL_RECURRING.length).toBeGreaterThan(0);
    for (const r of INITIAL_RECURRING) {
      expect(r.amount).toBeGreaterThan(0);
      expect(r.nextDueDate).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    }
  });

  it("provides valid initial savings goals dataset", () => {
    expect(INITIAL_SAVINGS_GOALS.length).toBeGreaterThan(0);
    for (const g of INITIAL_SAVINGS_GOALS) {
      expect(g.targetAmount).toBeGreaterThan(0);
      expect(g.currentAmount).toBeGreaterThanOrEqual(0);
    }
  });

  it("provides valid initial debts dataset", () => {
    expect(INITIAL_DEBTS.length).toBeGreaterThan(0);
    for (const d of INITIAL_DEBTS) {
      expect(d.outstandingBalance).toBeGreaterThan(0);
      expect(d.monthlyPayment).toBeGreaterThan(0);
    }
  });
});
