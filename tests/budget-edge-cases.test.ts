import { describe, it, expect } from "vitest";
import {
  calculateBudgetProgress,
  calculateOverallBudgetHealth,
  projectPeriodSpend,
} from "@/lib/budget-engine";
import { validateBudgetAction, evaluateBudgetAlertsAction } from "@/actions/budget";
import { BudgetInput } from "@/lib/validations/budget";
import { RawTransaction } from "@/lib/finance-engine";

describe("Budget Engine - Date & Period Boundary Edge Cases", () => {
  it("computes 29 days for leap year February (2024) vs 28 days for non-leap year (2025)", () => {
    const leapBudget: BudgetInput = {
      id: "bgt-leap",
      categoryId: "groceries",
      amount: 1000000,
      period: "monthly",
      startDate: "2024-02-15",
      notifyThreshold: 80,
    };
    const leapTx: RawTransaction[] = [
      { id: "tx-feb29", amount: 100000, type: "expense", categoryId: "groceries", date: "2024-02-29" },
    ];
    const leapProgress = calculateBudgetProgress(leapBudget, leapTx, "2024-02-01");
    expect(leapProgress.spent).toBe(100000);

    const nonLeapBudget: BudgetInput = {
      id: "bgt-non-leap",
      categoryId: "groceries",
      amount: 1000000,
      period: "monthly",
      startDate: "2025-02-10",
      notifyThreshold: 80,
    };
    const nonLeapTx: RawTransaction[] = [
      // 2025-02-29 does not exist; if a tx is dated 2025-03-01, it must be excluded
      { id: "tx-mar01", amount: 100000, type: "expense", categoryId: "groceries", date: "2025-03-01" },
    ];
    const nonLeapProgress = calculateBudgetProgress(nonLeapBudget, nonLeapTx, "2025-02-01");
    expect(nonLeapProgress.spent).toBe(0);
  });

  it("handles weekly budget spanning across month and year boundaries", () => {
    // Spanning Oct to Nov
    const crossMonthWeekly: BudgetInput = {
      id: "bgt-cross-month",
      categoryId: "dining",
      amount: 500000,
      period: "weekly",
      startDate: "2026-10-28", // ends 2026-11-03
      notifyThreshold: 80,
    };
    const crossMonthTxs: RawTransaction[] = [
      { id: "t1", amount: 100000, type: "expense", categoryId: "dining", date: "2026-10-28" }, // exact start
      { id: "t2", amount: 150000, type: "expense", categoryId: "dining", date: "2026-11-01" }, // middle
      { id: "t3", amount: 200000, type: "expense", categoryId: "dining", date: "2026-11-03" }, // exact end
      { id: "t4", amount: 300000, type: "expense", categoryId: "dining", date: "2026-11-04" }, // out of range
    ];
    const progress = calculateBudgetProgress(crossMonthWeekly, crossMonthTxs, "2026-10-28");
    expect(progress.spent).toBe(450000); // 100k + 150k + 200k
    expect(progress.remaining).toBe(50000);
    expect(progress.percentage).toBe(90);
    expect(progress.status).toBe("warning");

    // Spanning Dec to Jan (Year transition)
    const crossYearWeekly: BudgetInput = {
      id: "bgt-cross-year",
      categoryId: "holiday",
      amount: 1000000,
      period: "weekly",
      startDate: "2026-12-28", // ends 2027-01-03
      notifyThreshold: 80,
    };
    const crossYearTxs: RawTransaction[] = [
      { id: "ty1", amount: 400000, type: "expense", categoryId: "holiday", date: "2026-12-31" },
      { id: "ty2", amount: 400000, type: "expense", categoryId: "holiday", date: "2027-01-02" },
      { id: "ty3", amount: 250000, type: "expense", categoryId: "holiday", date: "2027-01-04" }, // after end
    ];
    const yearProgress = calculateBudgetProgress(crossYearWeekly, crossYearTxs, "2026-12-28");
    expect(yearProgress.spent).toBe(800000);
    expect(yearProgress.remaining).toBe(200000);
    expect(yearProgress.percentage).toBe(80);
    expect(yearProgress.status).toBe("warning");
  });

  it("handles yearly budget spanning full calendar year regardless of startDate day/month", () => {
    const yearlyBudget: BudgetInput = {
      id: "bgt-year",
      categoryId: "investment",
      amount: 12000000,
      period: "yearly",
      startDate: "2026-06-15",
      notifyThreshold: 80,
    };
    const yearlyTxs: RawTransaction[] = [
      { id: "ty-jan", amount: 1000000, type: "expense", categoryId: "investment", date: "2026-01-15" },
      { id: "ty-dec", amount: 2000000, type: "expense", categoryId: "investment", date: "2026-12-30" },
      { id: "ty-prev", amount: 500000, type: "expense", categoryId: "investment", date: "2025-12-31" }, // prev year
    ];
    const progress = calculateBudgetProgress(yearlyBudget, yearlyTxs, "2026-06-15");
    expect(progress.spent).toBe(3000000);
    expect(progress.remaining).toBe(9000000);
    expect(progress.percentage).toBe(25);
    expect(progress.status).toBe("safe");
  });

  it("honors custom endDate override over standard period rules", () => {
    const customBudget: BudgetInput = {
      id: "bgt-custom",
      categoryId: "project",
      amount: 2000000,
      period: "monthly",
      startDate: "2026-11-10",
      endDate: "2026-11-20", // custom 10-day window
      notifyThreshold: 80,
    };
    const customTxs: RawTransaction[] = [
      { id: "tc-before", amount: 100000, type: "expense", categoryId: "project", date: "2026-11-09" },
      { id: "tc-in1", amount: 500000, type: "expense", categoryId: "project", date: "2026-11-10" },
      { id: "tc-in2", amount: 500000, type: "expense", categoryId: "project", date: "2026-11-20" },
      { id: "tc-after", amount: 200000, type: "expense", categoryId: "project", date: "2026-11-21" },
    ];
    const progress = calculateBudgetProgress(customBudget, customTxs, "2026-11-10");
    expect(progress.spent).toBe(1000000);
    expect(progress.remaining).toBe(1000000);
    expect(progress.percentage).toBe(50);
  });
});

describe("Budget Engine - Transaction Filtering & Calculation Edge Cases", () => {
  const baseBudget: BudgetInput = {
    id: "bgt-base",
    categoryId: "tech",
    amount: 1000000,
    period: "monthly",
    startDate: "2026-11-01",
    notifyThreshold: 80,
  };

  it("strictly excludes income and transfer transactions even with matching categoryId", () => {
    const mixedTxs: RawTransaction[] = [
      { id: "t-inc", amount: 500000, type: "income", categoryId: "tech", date: "2026-11-05" },
      { id: "t-trf", amount: 300000, type: "transfer", categoryId: "tech", date: "2026-11-06" },
      { id: "t-exp", amount: 200000, type: "expense", categoryId: "tech", date: "2026-11-07" },
    ];
    const progress = calculateBudgetProgress(baseBudget, mixedTxs, "2026-11-10");
    expect(progress.spent).toBe(200000);
    expect(progress.remaining).toBe(800000);
  });

  it("handles zero matching transactions correctly without NaN values", () => {
    const progress = calculateBudgetProgress(baseBudget, [], "2026-11-01");
    expect(progress.spent).toBe(0);
    expect(progress.remaining).toBe(1000000);
    expect(progress.percentage).toBe(0);
    expect(progress.status).toBe("safe");
    expect(progress.overspentAmount).toBe(0);
    expect(progress.dailyRecommended).toBeGreaterThan(0);
  });

  it("evaluates exact threshold boundaries (79.9% vs 80.0% vs 100.0% vs 100.1%)", () => {
    // 79.9% -> safe
    const tx799: RawTransaction[] = [
      { id: "t-799", amount: 799000, type: "expense", categoryId: "tech", date: "2026-11-05" },
    ];
    const p799 = calculateBudgetProgress(baseBudget, tx799, "2026-11-05");
    expect(p799.percentage).toBe(79.9);
    expect(p799.status).toBe("safe");

    // Exact 80.0% -> warning
    const tx800: RawTransaction[] = [
      { id: "t-800", amount: 800000, type: "expense", categoryId: "tech", date: "2026-11-05" },
    ];
    const p800 = calculateBudgetProgress(baseBudget, tx800, "2026-11-05");
    expect(p800.percentage).toBe(80);
    expect(p800.status).toBe("warning");

    // Exact 100.0% -> warning
    const tx1000: RawTransaction[] = [
      { id: "t-1000", amount: 1000000, type: "expense", categoryId: "tech", date: "2026-11-05" },
    ];
    const p1000 = calculateBudgetProgress(baseBudget, tx1000, "2026-11-05");
    expect(p1000.percentage).toBe(100);
    expect(p1000.status).toBe("warning");
    expect(p1000.overspentAmount).toBe(0);

    // 100.1% -> exceeded
    const tx1001: RawTransaction[] = [
      { id: "t-1001", amount: 1001000, type: "expense", categoryId: "tech", date: "2026-11-05" },
    ];
    const p1001 = calculateBudgetProgress(baseBudget, tx1001, "2026-11-05");
    expect(p1001.percentage).toBe(100.1);
    expect(p1001.status).toBe("exceeded");
    expect(p1001.overspentAmount).toBe(1000);
    expect(p1001.dailyRecommended).toBe(0);
  });

  it("clamps daysRemaining to minimum 1 when referenceDate is past endDate", () => {
    const expiredRefProgress = calculateBudgetProgress(
      baseBudget,
      [{ id: "t-old", amount: 500000, type: "expense", categoryId: "tech", date: "2026-11-05" }],
      "2026-12-10" // past 2026-11-30
    );
    expect(expiredRefProgress.daysRemaining).toBe(1);
    expect(expiredRefProgress.dailyRecommended).toBe(500000);
  });
});

describe("Overall Budget Health & Velocity Projections", () => {
  it("returns zeroed health metrics when budgets array is empty", () => {
    const health = calculateOverallBudgetHealth([], []);
    expect(health).toEqual({
      totalBudgeted: 0,
      totalSpent: 0,
      remaining: 0,
      percentage: 0,
      safeCount: 0,
      warningCount: 0,
      exceededCount: 0,
    });
  });

  it("handles spend projection with zero or negative elapsed days", () => {
    const zeroDays = projectPeriodSpend(100000, 0, 30);
    expect(zeroDays.projectedTotal).toBe(100000);
    expect(zeroDays.burnRatePerDay).toBe(0);

    const negativeDays = projectPeriodSpend(100000, -2, 30);
    expect(negativeDays.projectedTotal).toBe(100000);
    expect(negativeDays.burnRatePerDay).toBe(0);

    const zeroSpend = projectPeriodSpend(0, 10, 30);
    expect(zeroSpend.projectedTotal).toBe(0);
    expect(zeroSpend.burnRatePerDay).toBe(0);
  });
});

describe("Budget Actions - Edge Cases and Error Boundaries", () => {
  it("rejects non-array parameters gracefully in evaluateBudgetAlertsAction", async () => {
    const res = await evaluateBudgetAlertsAction(
      null as any,
      []
    );
    expect(res.success).toBe(false);
    expect(res.error).toBe("Data input anggaran atau transaksi tidak valid.");

    const res2 = await evaluateBudgetAlertsAction(
      [],
      null as any
    );
    expect(res2.success).toBe(false);
  });

  it("omits safe budgets from alert notifications", async () => {
    const safeBudgets: BudgetInput[] = [
      {
        id: "b-safe",
        categoryId: "books",
        amount: 500000,
        period: "monthly",
        startDate: "2026-11-01",
        notifyThreshold: 80,
      },
    ];
    const lowSpendTxs: RawTransaction[] = [
      { id: "t-low", amount: 100000, type: "expense", categoryId: "books", date: "2026-11-05" },
    ];

    const res = await evaluateBudgetAlertsAction(safeBudgets, lowSpendTxs, "2026-11-06");
    expect(res.success).toBe(true);
    expect(res.data).toEqual([]);
  });

  it("correctly generates both warning and exceeded alerts in the same evaluation pass", async () => {
    const budgets: BudgetInput[] = [
      {
        id: "b-warn",
        categoryId: "dining",
        amount: 1000000,
        period: "monthly",
        startDate: "2026-11-01",
        notifyThreshold: 80,
      },
      {
        id: "b-exceed",
        categoryId: "transport",
        amount: 500000,
        period: "monthly",
        startDate: "2026-11-01",
        notifyThreshold: 80,
      },
    ];

    const txs: RawTransaction[] = [
      { id: "t1", amount: 850000, type: "expense", categoryId: "dining", date: "2026-11-10" },
      { id: "t2", amount: 600000, type: "expense", categoryId: "transport", date: "2026-11-10" },
    ];

    const res = await evaluateBudgetAlertsAction(budgets, txs, "2026-11-11");
    expect(res.success).toBe(true);
    expect(res.data).toHaveLength(2);

    const warnAlert = res.data?.find((a) => a.budgetId === "b-warn");
    expect(warnAlert?.severity).toBe("warning");
    expect(warnAlert?.percentage).toBe(85);
    expect(warnAlert?.message).toContain("85%");

    const exceedAlert = res.data?.find((a) => a.budgetId === "b-exceed");
    expect(exceedAlert?.severity).toBe("exceeded");
    expect(exceedAlert?.percentage).toBe(120);
    expect(exceedAlert?.message).toContain("terlampaui sebesar");
  });
});
