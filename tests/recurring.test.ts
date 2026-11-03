import { describe, it, expect } from "vitest";
import { recurringTransactionSchema, RecurringTransactionInput } from "@/lib/validations/recurring";
import {
  calculateMonthlyCommitment,
  getUpcomingBills,
  projectCashflow,
  computeNextDueDate,
  calculateCashflowRunway,
  breakdownObligationsByCategory,
  processDueRecurring,
} from "@/lib/recurring-engine";
import {
  validateRecurringAction,
  getUpcomingBillsAction,
  processDueRecurringAction,
  getCashflowProjectionAction,
  getRecurringSummaryAction,
} from "@/actions/recurring";

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
    {
      id: "rec-4",
      title: "Kopi Harian",
      amount: 20000,
      categoryId: "Makanan",
      accountId: "acc-bca",
      frequency: "daily",
      startDate: "2026-11-01",
      nextDueDate: "2026-11-02",
      isActive: true,
      autoDeduct: false,
    },
  ];

  it("calculates total monthly commitment correctly", () => {
    // 350,000 (monthly) + 20,000 (yearly/12) + 600,000 (daily * 30) = 970,000
    const commitment = calculateMonthlyCommitment(sampleItems);
    expect(commitment).toBe(970000);
  });

  it("filters upcoming bills within next 7 days", () => {
    const upcoming = getUpcomingBills(sampleItems, "2026-11-01", 7);
    expect(upcoming.map((u) => u.id)).toEqual(["rec-1", "rec-4"]);
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

    // monthlyIncome: 6,000,000
    // fixed expense: 970,000
    // discretionary: 50,000 * 30 = 1,500,000
    // net: 10,000,000 + 6,000,000 - 970,000 - 1,500,000 = 13,530,000
    expect(projection.fixedExpenseTotal).toBe(970000);
    expect(projection.discretionaryExpenseTotal).toBe(1500000);
    expect(projection.projectedBalance).toBe(13530000);
  });

  describe("computeNextDueDate", () => {
    it("increments daily by 1 day", () => {
      expect(computeNextDueDate("2026-11-03", "daily")).toBe("2026-11-04");
    });

    it("increments weekly by 7 days", () => {
      expect(computeNextDueDate("2026-11-03", "weekly")).toBe("2026-11-10");
    });

    it("increments monthly preserving day of month", () => {
      expect(computeNextDueDate("2026-04-15", "monthly")).toBe("2026-05-15");
    });

    it("clamps monthly to last day of shorter month", () => {
      expect(computeNextDueDate("2026-01-31", "monthly")).toBe("2026-02-28");
    });

    it("increments yearly by 1 year", () => {
      expect(computeNextDueDate("2026-11-03", "yearly")).toBe("2027-11-03");
    });

    it("clamps yearly leap day to Feb 28 on non-leap years", () => {
      expect(computeNextDueDate("2024-02-29", "yearly")).toBe("2025-02-28");
    });
  });

  describe("calculateCashflowRunway", () => {
    it("returns Infinity when cashflow is positive or break-even", () => {
      const res = calculateCashflowRunway(5000000, 0);
      expect(res.runwayMonths).toBe(Infinity);
      expect(res.isSolvent).toBe(true);
    });

    it("calculates runway months on net burn", () => {
      // 10jt / 2jt deficit = 5.0 months
      const res = calculateCashflowRunway(10000000, 2000000);
      expect(res.runwayMonths).toBe(5);
      expect(res.isSolvent).toBe(true);
    });

    it("returns 0 runway if balance is zero or negative", () => {
      const res = calculateCashflowRunway(0, 1000000);
      expect(res.runwayMonths).toBe(0);
      expect(res.isSolvent).toBe(false);
    });
  });

  describe("breakdownObligationsByCategory", () => {
    it("aggregates active obligations per category", () => {
      const breakdown = breakdownObligationsByCategory(sampleItems);
      expect(breakdown["Tagihan"].totalMonthly).toBe(370000);
      expect(breakdown["Tagihan"].count).toBe(2);
      expect(breakdown["Makanan"].totalMonthly).toBe(600000);
      expect(breakdown["Kebugaran"]).toBeUndefined(); // inactive item
    });
  });

  describe("processDueRecurring", () => {
    it("processes due items, instantiates transactions, and advances nextDueDate", () => {
      const result = processDueRecurring(sampleItems, "2026-11-05");
      // Due up to 2026-11-05: rec-1 (due 11-05) and rec-4 (due 11-02)
      expect(result.dueItems).toHaveLength(2);
      expect(result.generatedTransactions).toHaveLength(2);

      const internetTx = result.generatedTransactions.find((t) => t.recurringId === "rec-1");
      expect(internetTx).toBeDefined();
      expect(internetTx?.amount).toBe(350000);
      expect(internetTx?.date).toBe("2026-11-05");

      // Updated recurring items
      const updatedRec1 = result.updatedRecurringItems.find((r) => r.id === "rec-1");
      expect(updatedRec1?.nextDueDate).toBe("2026-12-05");

      const updatedRec4 = result.updatedRecurringItems.find((r) => r.id === "rec-4");
      expect(updatedRec4?.nextDueDate).toBe("2026-11-03");
    });
  });
});

describe("recurring server actions", () => {
  const testItems: RecurringTransactionInput[] = [
    {
      id: "rec-act-1",
      title: "Listrik Pascabayar",
      amount: 450000,
      categoryId: "Tagihan",
      accountId: "acc-bca",
      frequency: "monthly",
      startDate: "2026-01-01",
      nextDueDate: "2026-11-05",
      isActive: true,
      autoDeduct: true,
    },
  ];

  it("validateRecurringAction validates valid payload", async () => {
    const res = await validateRecurringAction(testItems[0]);
    expect(res.success).toBe(true);
    expect(res.data?.title).toBe("Listrik Pascabayar");
  });

  it("validateRecurringAction rejects invalid payload", async () => {
    const res = await validateRecurringAction({ title: "" });
    expect(res.success).toBe(false);
    expect(res.error).toBeDefined();
  });

  it("getUpcomingBillsAction computes upcoming items and total", async () => {
    const res = await getUpcomingBillsAction(testItems, "2026-11-01", 7);
    expect(res.success).toBe(true);
    expect(res.data?.upcoming).toHaveLength(1);
    expect(res.data?.totalUpcomingAmount).toBe(450000);
  });

  it("processDueRecurringAction produces valid transactions", async () => {
    const res = await processDueRecurringAction(testItems, "2026-11-06");
    expect(res.success).toBe(true);
    expect(res.data?.generatedTransactions).toHaveLength(1);
    expect(res.data?.updatedRecurringItems[0].nextDueDate).toBe("2026-12-05");
  });

  it("getCashflowProjectionAction projects runway and balance", async () => {
    const res = await getCashflowProjectionAction({
      currentBalance: 5000000,
      monthlyIncome: 3000000,
      recurringItems: testItems,
      dailyBurn: 100000, // 3,000,000 / month
      daysToProject: 30,
    });
    expect(res.success).toBe(true);
    expect(res.data?.fixedExpenseTotal).toBe(450000);
    // net burn: 450,000 + 3,000,000 - 3,000,000 = 450,000 deficit / mo
    // runway: 5,000,000 / 450,000 ~ 11.1 months
    expect(res.data?.runway.isSolvent).toBe(true);
    expect(res.data?.runway.runwayMonths).toBe(11.1);
  });

  it("getRecurringSummaryAction returns commitments and breakdown", async () => {
    const res = await getRecurringSummaryAction(testItems);
    expect(res.success).toBe(true);
    expect(res.data?.monthlyFixedCommitment).toBe(450000);
    expect(res.data?.activeCount).toBe(1);
    expect(res.data?.categoryBreakdown["Tagihan"].totalMonthly).toBe(450000);
  });
});
