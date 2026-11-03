import { describe, it, expect } from "vitest";
import { RecurringTransactionInput } from "@/lib/validations/recurring";
import {
  computeNextDueDate,
  calculateMonthlyCommitment,
  getUpcomingBills,
  projectCashflow,
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

describe("Recurring Engine - Due Date Rollover & Leap Year Edge Cases", () => {
  it("handles daily frequency rollover across month and leap year boundaries", () => {
    // Regular month transition
    expect(computeNextDueDate("2026-04-30", "daily")).toBe("2026-05-01");
    // Year-end transition
    expect(computeNextDueDate("2026-12-31", "daily")).toBe("2027-01-01");
    // Leap year Feb 28 to Feb 29
    expect(computeNextDueDate("2024-02-28", "daily")).toBe("2024-02-29");
    // Leap year Feb 29 to Mar 01
    expect(computeNextDueDate("2024-02-29", "daily")).toBe("2024-03-01");
    // Non-leap year Feb 28 to Mar 01
    expect(computeNextDueDate("2025-02-28", "daily")).toBe("2025-03-01");
  });

  it("handles weekly frequency rollover across month and year boundaries", () => {
    // Across month boundary
    expect(computeNextDueDate("2026-05-28", "weekly")).toBe("2026-06-04");
    // Across year boundary
    expect(computeNextDueDate("2026-12-28", "weekly")).toBe("2027-01-04");
    // Across leap day
    expect(computeNextDueDate("2024-02-26", "weekly")).toBe("2024-03-04");
  });

  it("handles monthly frequency across year boundaries and variable month lengths", () => {
    // Nov -> Dec
    expect(computeNextDueDate("2026-11-15", "monthly")).toBe("2026-12-15");
    // Dec -> Jan next year
    expect(computeNextDueDate("2026-12-15", "monthly")).toBe("2027-01-15");
    // Jan 31 -> Feb 29 (leap year 2024)
    expect(computeNextDueDate("2024-01-31", "monthly")).toBe("2024-02-29");
    // Jan 31 -> Feb 28 (non-leap year 2026)
    expect(computeNextDueDate("2026-01-31", "monthly")).toBe("2026-02-28");
    // Mar 31 -> Apr 30 (31 to 30 days)
    expect(computeNextDueDate("2026-03-31", "monthly")).toBe("2026-04-30");
    // May 31 -> Jun 30
    expect(computeNextDueDate("2026-05-31", "monthly")).toBe("2026-06-30");
    // Aug 31 -> Sep 30
    expect(computeNextDueDate("2026-08-31", "monthly")).toBe("2026-09-30");
    // Oct 31 -> Nov 30
    expect(computeNextDueDate("2026-10-31", "monthly")).toBe("2026-11-30");
  });

  it("handles yearly frequency across leap and non-leap years", () => {
    // Normal year to year
    expect(computeNextDueDate("2026-06-15", "yearly")).toBe("2027-06-15");
    // Leap day Feb 29 rolled to Feb 28 on next non-leap year
    expect(computeNextDueDate("2024-02-29", "yearly")).toBe("2025-02-28");
    // Year-end rollover
    expect(computeNextDueDate("2026-12-31", "yearly")).toBe("2027-12-31");
  });
});

describe("Recurring Engine - Commitment & Calculation Edge Cases", () => {
  it("returns zero commitment when given empty items array or all inactive items", () => {
    expect(calculateMonthlyCommitment([])).toBe(0);

    const inactiveItems: RecurringTransactionInput[] = [
      {
        id: "rec-in-1",
        title: "Dormant Sub",
        amount: 250000,
        categoryId: "Entertainment",
        accountId: "acc-1",
        frequency: "monthly",
        startDate: "2026-01-01",
        nextDueDate: "2026-11-15",
        isActive: false,
        autoDeduct: false,
      },
      {
        id: "rec-in-2",
        title: "Cancelled Daily Coffee",
        amount: 30000,
        categoryId: "Food",
        accountId: "acc-1",
        frequency: "daily",
        startDate: "2026-01-01",
        nextDueDate: "2026-11-04",
        isActive: false,
        autoDeduct: false,
      },
    ];
    expect(calculateMonthlyCommitment(inactiveItems)).toBe(0);
  });

  it("calculates weekly recurring commitment accurately with rounding", () => {
    const weeklyItem: RecurringTransactionInput[] = [
      {
        id: "rec-wk",
        title: "Weekly Grocery",
        amount: 175000,
        categoryId: "Groceries",
        accountId: "acc-1",
        frequency: "weekly",
        startDate: "2026-01-01",
        nextDueDate: "2026-11-10",
        isActive: true,
        autoDeduct: false,
      },
    ];
    // 175,000 * 52 / 12 = 758,333.33 -> Math.round -> 758333
    expect(calculateMonthlyCommitment(weeklyItem)).toBe(758333);
  });

  it("handles high amount transactions without precision loss", () => {
    const bigItems: RecurringTransactionInput[] = [
      {
        id: "rec-big-1",
        title: "Annual Server Infrastructure",
        amount: 120000000, // 120jt / year -> 10jt / month
        categoryId: "Operations",
        accountId: "acc-biz",
        frequency: "yearly",
        startDate: "2026-01-01",
        nextDueDate: "2026-12-31",
        isActive: true,
        autoDeduct: true,
      },
      {
        id: "rec-big-2",
        title: "Office Rent",
        amount: 25000000, // 25jt / month
        categoryId: "Operations",
        accountId: "acc-biz",
        frequency: "monthly",
        startDate: "2026-01-01",
        nextDueDate: "2026-11-05",
        isActive: true,
        autoDeduct: true,
      },
    ];
    expect(calculateMonthlyCommitment(bigItems)).toBe(35000000);
  });
});

describe("Recurring Engine - Upcoming Bills Window Edge Cases", () => {
  const items: RecurringTransactionInput[] = [
    {
      id: "rec-today",
      title: "Due Today",
      amount: 100000,
      categoryId: "Tagihan",
      accountId: "acc-1",
      frequency: "monthly",
      startDate: "2026-11-01",
      nextDueDate: "2026-11-03",
      isActive: true,
      autoDeduct: true,
    },
    {
      id: "rec-tomorrow",
      title: "Due Tomorrow",
      amount: 200000,
      categoryId: "Tagihan",
      accountId: "acc-1",
      frequency: "monthly",
      startDate: "2026-11-01",
      nextDueDate: "2026-11-04",
      isActive: true,
      autoDeduct: false,
    },
    {
      id: "rec-exact-7d",
      title: "Due on Day 7 Exact",
      amount: 300000,
      categoryId: "Tagihan",
      accountId: "acc-1",
      frequency: "monthly",
      startDate: "2026-11-01",
      nextDueDate: "2026-11-10",
      isActive: true,
      autoDeduct: false,
    },
    {
      id: "rec-day-8",
      title: "Due on Day 8 Outside Window",
      amount: 400000,
      categoryId: "Tagihan",
      accountId: "acc-1",
      frequency: "monthly",
      startDate: "2026-11-01",
      nextDueDate: "2026-11-11",
      isActive: true,
      autoDeduct: false,
    },
    {
      id: "rec-past",
      title: "Past Due",
      amount: 500000,
      categoryId: "Tagihan",
      accountId: "acc-1",
      frequency: "monthly",
      startDate: "2026-10-01",
      nextDueDate: "2026-11-02",
      isActive: true,
      autoDeduct: false,
    },
    {
      id: "rec-inactive-window",
      title: "Inactive in Window",
      amount: 150000,
      categoryId: "Tagihan",
      accountId: "acc-1",
      frequency: "monthly",
      startDate: "2026-11-01",
      nextDueDate: "2026-11-05",
      isActive: false,
      autoDeduct: false,
    },
  ];

  it("includes bills due today and boundary, excludes past and future outside boundary", () => {
    const upcoming = getUpcomingBills(items, "2026-11-03", 7);
    const ids = upcoming.map((b) => b.id);

    expect(ids).toContain("rec-today");
    expect(ids).toContain("rec-tomorrow");
    expect(ids).toContain("rec-exact-7d");
    expect(ids).not.toContain("rec-day-8");
    expect(ids).not.toContain("rec-past");
    expect(ids).not.toContain("rec-inactive-window");
  });

  it("handles daysAhead = 0 (only items due on the exact reference date)", () => {
    const todayOnly = getUpcomingBills(items, "2026-11-03", 0);
    expect(todayOnly.map((b) => b.id)).toEqual(["rec-today"]);
  });

  it("returns empty array when items list is empty", () => {
    expect(getUpcomingBills([], "2026-11-03", 7)).toEqual([]);
  });
});

describe("Recurring Engine - Runway & Projection Edge Cases", () => {
  it("handles zero and negative balance in calculateCashflowRunway", () => {
    const zeroRes = calculateCashflowRunway(0, 500000);
    expect(zeroRes.runwayMonths).toBe(0);
    expect(zeroRes.isSolvent).toBe(false);

    const negativeRes = calculateCashflowRunway(-2500000, 500000);
    expect(negativeRes.runwayMonths).toBe(0);
    expect(negativeRes.isSolvent).toBe(false);
  });

  it("handles surplus cashflow (negative monthly deficit)", () => {
    // When monthly net burn <= 0 (saving money or break even)
    const surplusRes = calculateCashflowRunway(10000000, -500000);
    expect(surplusRes.runwayMonths).toBe(Infinity);
    expect(surplusRes.isSolvent).toBe(true);

    const breakEvenRes = calculateCashflowRunway(10000000, 0);
    expect(breakEvenRes.runwayMonths).toBe(Infinity);
    expect(breakEvenRes.isSolvent).toBe(true);
  });

  it("calculates runway with single-decimal precision", () => {
    // 7,000,000 / 2,000,000 = 3.5 months
    const res = calculateCashflowRunway(7000000, 2000000);
    expect(res.runwayMonths).toBe(3.5);
    expect(res.isSolvent).toBe(true);

    // 10,000,000 / 3,000,000 = 3.3333... -> 3.3
    const res2 = calculateCashflowRunway(10000000, 3000000);
    expect(res2.runwayMonths).toBe(3.3);
  });

  it("handles 0-day projection and zero discretionary burn", () => {
    const res = projectCashflow(5000000, 10000000, [], 0, 0);
    expect(res.projectedBalance).toBe(5000000);
    expect(res.fixedExpenseTotal).toBe(0);
    expect(res.discretionaryExpenseTotal).toBe(0);
  });

  it("handles 60-day projection with multiple recurring frequencies", () => {
    const sample: RecurringTransactionInput[] = [
      {
        id: "daily-lunch",
        title: "Daily Lunch",
        amount: 25000,
        categoryId: "Food",
        accountId: "acc-1",
        frequency: "daily", // 750,000 / mo
        startDate: "2026-11-01",
        nextDueDate: "2026-11-02",
        isActive: true,
        autoDeduct: false,
      },
    ];
    // dailyIncome for 6jt/mo = 200,000. For 60 days: 12,000,000
    // fixedExpenseTotal = (750,000 / 30) * 60 = 1,500,000
    // discretionaryExpenseTotal = 50,000 * 60 = 3,000,000
    // projectedBalance = 10jt + 12jt - 1.5jt - 3jt = 17,500,000
    const res = projectCashflow(10000000, 6000000, sample, 50000, 60);
    expect(res.fixedExpenseTotal).toBe(1500000);
    expect(res.discretionaryExpenseTotal).toBe(3000000);
    expect(res.projectedBalance).toBe(17500000);
  });
});

describe("Recurring Engine - Category Breakdown Edge Cases", () => {
  it("returns empty object for empty or inactive-only inputs", () => {
    expect(breakdownObligationsByCategory([])).toEqual({});

    const inactiveOnly: RecurringTransactionInput[] = [
      {
        id: "r1",
        title: "Sub",
        amount: 100000,
        categoryId: "Entertainment",
        accountId: "acc-1",
        frequency: "monthly",
        startDate: "2026-01-01",
        nextDueDate: "2026-11-15",
        isActive: false,
        autoDeduct: false,
      },
    ];
    expect(breakdownObligationsByCategory(inactiveOnly)).toEqual({});
  });

  it("aggregates multiple items with different frequencies in same category", () => {
    const items: RecurringTransactionInput[] = [
      {
        id: "c1",
        title: "Daily Snack",
        amount: 10000, // * 30 = 300,000
        categoryId: "Konsumsi",
        accountId: "acc-1",
        frequency: "daily",
        startDate: "2026-01-01",
        nextDueDate: "2026-11-02",
        isActive: true,
        autoDeduct: false,
      },
      {
        id: "c2",
        title: "Weekly Grocery",
        amount: 150000, // * 52 / 12 = 650,000
        categoryId: "Konsumsi",
        accountId: "acc-1",
        frequency: "weekly",
        startDate: "2026-01-01",
        nextDueDate: "2026-11-08",
        isActive: true,
        autoDeduct: false,
      },
      {
        id: "c3",
        title: "Monthly Dining Out",
        amount: 400000, // 400,000
        categoryId: "Konsumsi",
        accountId: "acc-1",
        frequency: "monthly",
        startDate: "2026-01-01",
        nextDueDate: "2026-11-25",
        isActive: true,
        autoDeduct: false,
      },
      {
        id: "c4",
        title: "Yearly Food Festival Pass",
        amount: 1200000, // / 12 = 100,000
        categoryId: "Konsumsi",
        accountId: "acc-1",
        frequency: "yearly",
        startDate: "2026-01-01",
        nextDueDate: "2026-12-10",
        isActive: true,
        autoDeduct: false,
      },
    ];

    const breakdown = breakdownObligationsByCategory(items);
    expect(breakdown["Konsumsi"]).toBeDefined();
    expect(breakdown["Konsumsi"].count).toBe(4);
    // 300,000 + 650,000 + 400,000 + 100,000 = 1,450,000
    expect(breakdown["Konsumsi"].totalMonthly).toBe(1450000);
  });
});

describe("Recurring Engine - Due Processing Edge Cases", () => {
  it("does not process items when none are due", () => {
    const futureItems: RecurringTransactionInput[] = [
      {
        id: "rec-future",
        title: "Future Bill",
        amount: 200000,
        categoryId: "Tagihan",
        accountId: "acc-1",
        frequency: "monthly",
        startDate: "2026-11-01",
        nextDueDate: "2026-11-20",
        isActive: true,
        autoDeduct: false,
      },
    ];
    const res = processDueRecurring(futureItems, "2026-11-05");
    expect(res.dueItems).toHaveLength(0);
    expect(res.generatedTransactions).toHaveLength(0);
    expect(res.updatedRecurringItems[0].nextDueDate).toBe("2026-11-20");
  });

  it("ignores past due items if marked inactive", () => {
    const overdueInactive: RecurringTransactionInput[] = [
      {
        id: "rec-inactive-due",
        title: "Old Inactive Subscription",
        amount: 99000,
        categoryId: "Digital",
        accountId: "acc-1",
        frequency: "monthly",
        startDate: "2026-01-01",
        nextDueDate: "2026-10-15",
        isActive: false,
        autoDeduct: false,
      },
    ];
    const res = processDueRecurring(overdueInactive, "2026-11-03");
    expect(res.dueItems).toHaveLength(0);
    expect(res.generatedTransactions).toHaveLength(0);
    expect(res.updatedRecurringItems[0].nextDueDate).toBe("2026-10-15");
  });

  it("correctly advances weekly and yearly items when due", () => {
    const items: RecurringTransactionInput[] = [
      {
        id: "rec-wk-due",
        title: "Katering Mingguan",
        amount: 150000,
        categoryId: "Konsumsi",
        accountId: "acc-1",
        frequency: "weekly",
        startDate: "2026-10-01",
        nextDueDate: "2026-11-03",
        isActive: true,
        autoDeduct: true,
      },
      {
        id: "rec-yr-due",
        title: "Pajak Kendaraan Tahunan",
        amount: 1500000,
        categoryId: "Pajak",
        accountId: "acc-1",
        frequency: "yearly",
        startDate: "2025-11-03",
        nextDueDate: "2026-11-03",
        isActive: true,
        autoDeduct: false,
      },
    ];

    const res = processDueRecurring(items, "2026-11-03");
    expect(res.dueItems).toHaveLength(2);
    expect(res.generatedTransactions).toHaveLength(2);

    const updatedWeekly = res.updatedRecurringItems.find((r) => r.id === "rec-wk-due");
    expect(updatedWeekly?.nextDueDate).toBe("2026-11-10");

    const updatedYearly = res.updatedRecurringItems.find((r) => r.id === "rec-yr-due");
    expect(updatedYearly?.nextDueDate).toBe("2027-11-03");

    // Check transaction properties
    const txWeekly = res.generatedTransactions.find((t) => t.recurringId === "rec-wk-due");
    expect(txWeekly?.type).toBe("expense");
    expect(txWeekly?.date).toBe("2026-11-03");
    expect(txWeekly?.note).toContain("Katering Mingguan");
  });
});

describe("Recurring Server Actions - Validation & Error Edge Cases", () => {
  it("rejects invalid dates and missing required fields in validateRecurringAction", async () => {
    const missingFields = await validateRecurringAction({
      title: "Missing Account",
      amount: 50000,
      frequency: "monthly",
    });
    expect(missingFields.success).toBe(false);
    expect(missingFields.fieldErrors?.accountId).toBeDefined();

    const invalidFrequency = await validateRecurringAction({
      title: "Bad Frequency",
      amount: 50000,
      categoryId: "Tagihan",
      accountId: "acc-1",
      frequency: "quarterly", // unsupported
      startDate: "2026-11-01",
      nextDueDate: "2026-11-15",
    });
    expect(invalidFrequency.success).toBe(false);

    const invalidDateFormat = await validateRecurringAction({
      title: "Bad Date",
      amount: 50000,
      categoryId: "Tagihan",
      accountId: "acc-1",
      frequency: "monthly",
      startDate: "01/11/2026",
      nextDueDate: "15/11/2026",
    });
    expect(invalidDateFormat.success).toBe(false);
  });

  it("handles malformed referenceDate in getUpcomingBillsAction", async () => {
    const badDate = await getUpcomingBillsAction([], "2026/11/03");
    expect(badDate.success).toBe(false);
    expect(badDate.error).toContain("harus YYYY-MM-DD");

    const emptyDateValidFallback = await getUpcomingBillsAction([]);
    expect(emptyDateValidFallback.success).toBe(true);
    expect(emptyDateValidFallback.data?.upcoming).toEqual([]);
  });

  it("handles malformed referenceDate in processDueRecurringAction", async () => {
    const badDate = await processDueRecurringAction([], "03-11-2026");
    expect(badDate.success).toBe(false);
    expect(badDate.error).toContain("harus YYYY-MM-DD");

    const omittedDateValidFallback = await processDueRecurringAction([]);
    expect(omittedDateValidFallback.success).toBe(true);
    expect(omittedDateValidFallback.data?.dueItems).toEqual([]);
  });

  it("validates negative inputs and invalid types in getCashflowProjectionAction", async () => {
    const negativeIncome = await getCashflowProjectionAction({
      currentBalance: 5000000,
      monthlyIncome: -1000,
      recurringItems: [],
      dailyBurn: 50000,
    });
    expect(negativeIncome.success).toBe(false);
    expect(negativeIncome.error).toContain("negatif");

    const negativeBurn = await getCashflowProjectionAction({
      currentBalance: 5000000,
      monthlyIncome: 5000000,
      recurringItems: [],
      dailyBurn: -20000,
    });
    expect(negativeBurn.success).toBe(false);
    expect(negativeBurn.error).toContain("negatif");

    const invalidBalance = await getCashflowProjectionAction({
      currentBalance: NaN,
      monthlyIncome: 5000000,
      recurringItems: [],
      dailyBurn: 20000,
    });
    expect(invalidBalance.success).toBe(false);
    expect(invalidBalance.error).toContain("valid");
  });

  it("rejects non-array input in getRecurringSummaryAction", async () => {
    // @ts-expect-error test non-array runtime payload
    const nullRes = await getRecurringSummaryAction(null);
    expect(nullRes.success).toBe(false);
    expect(nullRes.error).toContain("tidak valid");

    // @ts-expect-error test object runtime payload
    const objRes = await getRecurringSummaryAction({ items: [] });
    expect(objRes.success).toBe(false);

    const emptyArrayRes = await getRecurringSummaryAction([]);
    expect(emptyArrayRes.success).toBe(true);
    expect(emptyArrayRes.data?.monthlyFixedCommitment).toBe(0);
    expect(emptyArrayRes.data?.activeCount).toBe(0);
    expect(emptyArrayRes.data?.categoryBreakdown).toEqual({});
  });
});
