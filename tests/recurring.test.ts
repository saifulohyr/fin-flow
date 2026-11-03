import { describe, it, expect } from "vitest";
import { recurringTransactionSchema, RecurringTransactionInput } from "@/lib/validations/recurring";
import {
  calculateMonthlyCommitment,
  getUpcomingBills,
  projectCashflow,
} from "@/lib/recurring-engine";

describe("recurring transaction validation", () => {
  it("validates correct recurring transaction input", () => {
    const valid = {
      id: "rec-1",
      title: "Langganan Cloud VPS",
      amount: 150000,
      categoryId: "Tagihan & Utilitas",
      accountId: "acc-mandiri",
      frequency: "monthly" as const,
      startDate: "2026-01-01",
      nextDueDate: "2026-11-15",
      isActive: true,
      autoDeduct: true,
    };

    const res = recurringTransactionSchema.safeParse(valid);
    expect(res.success).toBe(true);
  });

  it("fails when amount is not positive", () => {
    const invalid = {
      id: "rec-2",
      title: "Bad data",
      amount: -50000,
      categoryId: "Tagihan",
      accountId: "acc-1",
      frequency: "monthly" as const,
      startDate: "2026-01-01",
      nextDueDate: "2026-11-15",
    };

    const res = recurringTransactionSchema.safeParse(invalid);
    expect(res.success).toBe(false);
  });
});

describe("recurring engine calculations", () => {
  const sampleItems: RecurringTransactionInput[] = [
    {
      id: "rec-1",
      title: "Internet Fiber",
      amount: 350000,
      categoryId: "Tagihan",
      accountId: "acc-bca",
      frequency: "monthly",
      startDate: "2026-01-01",
      nextDueDate: "2026-11-05",
      isActive: true,
      autoDeduct: true,
    },
    {
      id: "rec-2",
      title: "Domain Renewal",
      amount: 240000,
      categoryId: "Tagihan",
      accountId: "acc-mandiri",
      frequency: "yearly",
      startDate: "2026-01-01",
      nextDueDate: "2026-12-01",
      isActive: true,
      autoDeduct: false,
    },
    {
      id: "rec-3",
      title: "Gym Membership",
      amount: 500000,
      categoryId: "Kebugaran",
      accountId: "acc-bca",
      frequency: "monthly",
      startDate: "2026-01-01",
      nextDueDate: "2026-11-20",
      isActive: false, // inactive, should not count
      autoDeduct: false,
    },
  ];

  it("calculates total monthly commitment correctly", () => {
    // 350,000 (monthly) + 240,000 / 12 (yearly = 20,000) = 370,000
    const commitment = calculateMonthlyCommitment(sampleItems);
    expect(commitment).toBe(370000);
  });

  it("filters upcoming bills within next 7 days", () => {
    const upcoming = getUpcomingBills(sampleItems, "2026-11-01", 7);
    expect(upcoming).toHaveLength(1);
    expect(upcoming[0].id).toBe("rec-1");
  });

  it("projects cashflow accurately for 30 days", () => {
    const currentBalance = 10000000;
    const monthlyIncome = 6000000;
    const dailyDiscretionaryBurn = 50000; // 1.5jt per 30 days

    const projection = projectCashflow(
      currentBalance,
      monthlyIncome,
      sampleItems,
      dailyDiscretionaryBurn,
      30
    );

    // monthlyIncome + 6,000,000
    // fixed expense: 370,000
    // discretionary: 50,000 * 30 = 1,500,000
    // net: 10,000,000 + 6,000,000 - 370,000 - 1,500,000 = 14,130,000
    expect(projection.fixedExpenseTotal).toBe(370000);
    expect(projection.discretionaryExpenseTotal).toBe(1500000);
    expect(projection.projectedBalance).toBe(14130000);
  });
});
