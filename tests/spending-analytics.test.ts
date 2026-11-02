import { describe, it, expect } from "vitest";
import {
  aggregateSpendingByDate,
  calculateSpendingStats,
  calculateSpendingGrowth,
} from "@/lib/spending-analytics";
import {
  getSpendingAnalyticsAction,
  comparePeriodSpendingAction,
} from "@/actions/analytics";

describe("spending-analytics core logic", () => {
  const sampleTransactions = [
    { date: "2026-11-01", amount: 25000, type: "expense" },
    { date: "2026-11-01", amount: 15000, type: "expense" },
    { date: "2026-11-01", amount: 5000000, type: "income" },
    { date: "2026-11-02", amount: 35000, type: "expense" },
    { date: "2026-11-03", amount: 120000, type: "expense" },
  ];

  it("aggregates expenses by date properly and ignores income", () => {
    const result = aggregateSpendingByDate(sampleTransactions);
    expect(result).toHaveLength(3);
    expect(result[0]).toEqual({ date: "2026-11-01", total: 40000 });
    expect(result[1]).toEqual({ date: "2026-11-02", total: 35000 });
    expect(result[2]).toEqual({ date: "2026-11-03", total: 120000 });
  });

  it("returns empty array when no expenses exist", () => {
    const txs = [{ date: "2026-11-01", amount: 100000, type: "income" }];
    expect(aggregateSpendingByDate(txs)).toEqual([]);
  });

  it("calculates spending stats accurately", () => {
    const stats = calculateSpendingStats(sampleTransactions);
    expect(stats.totalSpending).toBe(195000); // 40000 + 35000 + 120000
    expect(stats.activeExpenseDays).toBe(3);
    expect(stats.dailyAverage).toBe(65000); // 195000 / 3
    expect(stats.peakDay).toEqual({ date: "2026-11-03", amount: 120000 });
  });

  it("handles empty transactions gracefully in calculateSpendingStats", () => {
    const stats = calculateSpendingStats([]);
    expect(stats.totalSpending).toBe(0);
    expect(stats.dailyAverage).toBe(0);
    expect(stats.peakDay).toBeNull();
    expect(stats.activeExpenseDays).toBe(0);
  });

  it("calculates period spending growth percentage correctly", () => {
    expect(calculateSpendingGrowth(100000, 150000)).toBe(50);
    expect(calculateSpendingGrowth(200000, 150000)).toBe(-25);
    expect(calculateSpendingGrowth(0, 50000)).toBe(100);
    expect(calculateSpendingGrowth(0, 0)).toBe(0);
  });
});

describe("spending-analytics server actions", () => {
  const sampleTransactions = [
    { date: "2026-11-01", amount: 50000, type: "expense" },
    { date: "2026-11-02", amount: 75000, type: "expense" },
    { date: "2026-11-05", amount: 100000, type: "expense" },
  ];

  it("filters transactions by date range via server action", async () => {
    const res = await getSpendingAnalyticsAction(sampleTransactions, {
      startDate: "2026-11-02",
      endDate: "2026-11-04",
    });

    expect(res.success).toBe(true);
    expect(res.data?.daily).toHaveLength(1);
    expect(res.data?.daily[0].date).toBe("2026-11-02");
    expect(res.data?.stats.totalSpending).toBe(75000);
  });

  it("validates invalid date parameters in server action", async () => {
    const invalidStart = await getSpendingAnalyticsAction(sampleTransactions, {
      startDate: "invalid-date",
    });
    expect(invalidStart.success).toBe(false);
    expect(invalidStart.error).toContain("startDate");

    const invalidEnd = await getSpendingAnalyticsAction(sampleTransactions, {
      endDate: "2026/11/02",
    });
    expect(invalidEnd.success).toBe(false);
    expect(invalidEnd.error).toContain("endDate");
  });

  it("compares period spending via server action", async () => {
    const res = await comparePeriodSpendingAction(120000, 100000);
    expect(res.success).toBe(true);
    expect(res.data?.growthRate).toBe(20);
    expect(res.data?.isIncreased).toBe(true);
  });

  it("rejects negative totals in comparePeriodSpendingAction", async () => {
    const res = await comparePeriodSpendingAction(-100, 500);
    expect(res.success).toBe(false);
    expect(res.error).toBeDefined();
  });
});
