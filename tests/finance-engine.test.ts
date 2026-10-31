import { describe, it, expect } from "vitest";
import {
  calculateNetWorth,
  calculateMonthlyTotals,
  calculateBurnRate,
  calculateRunwayMonths,
  calculateCategoryBreakdown,
  type RawAccount,
  type RawTransaction,
} from "@/lib/finance-engine";

describe("Finance Engine Calculations", () => {
  const accounts: RawAccount[] = [
    { id: "1", name: "BCA", type: "bank", balance: 15000000 },
    { id: "2", name: "GoPay", type: "ewallet", balance: 500000 },
    { id: "3", name: "Cash", type: "cash", balance: 250000 },
  ];

  const transactions: RawTransaction[] = [
    { id: "t1", amount: 10000000, type: "income", categoryId: "salary", date: "2026-10-01" },
    { id: "t2", amount: 2000000, type: "income", categoryId: "freelance", date: "2026-10-15" },
    { id: "t3", amount: 1500000, type: "expense", categoryId: "food", date: "2026-10-05" },
    { id: "t4", amount: 500000, type: "expense", categoryId: "transport", date: "2026-10-10" },
    { id: "t5", amount: 1000000, type: "expense", categoryId: "food", date: "2026-10-20" },
    { id: "t6", amount: 3000000, type: "expense", categoryId: "food", date: "2026-09-20" }, // Different month
  ];

  it("calculates total net worth correctly", () => {
    expect(calculateNetWorth(accounts)).toBe(15750000);
  });

  it("calculates monthly totals and savings rate accurately", () => {
    const oct = calculateMonthlyTotals(transactions, "2026-10");
    expect(oct.income).toBe(12000000);
    expect(oct.expense).toBe(3000000);
    expect(oct.netCashflow).toBe(9000000);
    expect(oct.savingsRate).toBe(75); // (9jt / 12jt) * 100
  });

  it("calculates daily burn rate", () => {
    expect(calculateBurnRate(3000000, 30)).toBe(100000);
    expect(calculateBurnRate(0, 30)).toBe(0);
    expect(calculateBurnRate(1000000, 0)).toBe(0);
  });

  it("calculates liquid assets runway in months", () => {
    expect(calculateRunwayMonths(15000000, 3000000)).toBe(5);
    expect(calculateRunwayMonths(0, 3000000)).toBe(0);
    expect(calculateRunwayMonths(10000000, 0)).toBe(999);
  });

  it("calculates category breakdown percentages in descending order", () => {
    const breakdown = calculateCategoryBreakdown(transactions, "2026-10");
    expect(breakdown).toHaveLength(2);
    expect(breakdown[0].categoryId).toBe("food");
    expect(breakdown[0].amount).toBe(2500000);
    expect(breakdown[0].percentage).toBe(83.3);

    expect(breakdown[1].categoryId).toBe("transport");
    expect(breakdown[1].amount).toBe(500000);
    expect(breakdown[1].percentage).toBe(16.7);
  });
});
