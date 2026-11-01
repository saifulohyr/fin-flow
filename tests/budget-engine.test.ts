import { describe, it, expect } from "vitest";
import {
  calculateBudgetProgress,
  calculateOverallBudgetHealth,
  projectPeriodSpend,
} from "@/lib/budget-engine";
import { validateBudgetAction, evaluateBudgetAlertsAction } from "@/actions/budget";
import { BudgetInput } from "@/lib/validations/budget";
import { RawTransaction } from "@/lib/finance-engine";

describe("Budget Engine Business Logic", () => {
  const budgetMonthly: BudgetInput = {
    id: "bgt-1",
    categoryId: "food",
    amount: 1000000,
    period: "monthly",
    startDate: "2026-11-01",
    notifyThreshold: 80,
  };

  const sampleTransactions: RawTransaction[] = [
    { id: "tx-1", amount: 300000, type: "expense", categoryId: "food", date: "2026-11-03" },
    { id: "tx-2", amount: 400000, type: "expense", categoryId: "food", date: "2026-11-10" },
    { id: "tx-3", amount: 200000, type: "expense", categoryId: "transport", date: "2026-11-05" },
    { id: "tx-4", amount: 500000, type: "income", categoryId: "freelance", date: "2026-11-08" },
    { id: "tx-5", amount: 600000, type: "expense", categoryId: "food", date: "2026-10-25" }, // Out of period
  ];

  it("calculates safe status when spend is below threshold", () => {
    const progress = calculateBudgetProgress(budgetMonthly, sampleTransactions, "2026-11-12");
    expect(progress.spent).toBe(700000);
    expect(progress.remaining).toBe(300000);
    expect(progress.percentage).toBe(70);
    expect(progress.status).toBe("safe");
    expect(progress.overspentAmount).toBe(0);
    expect(progress.dailyRecommended).toBeGreaterThan(0);
  });

  it("calculates warning status when spend hits notifyThreshold", () => {
    const warningTxs: RawTransaction[] = [
      ...sampleTransactions,
      { id: "tx-warn", amount: 150000, type: "expense", categoryId: "food", date: "2026-11-15" },
    ];
    const progress = calculateBudgetProgress(budgetMonthly, warningTxs, "2026-11-16");
    expect(progress.spent).toBe(850000);
    expect(progress.percentage).toBe(85);
    expect(progress.status).toBe("warning");
  });

  it("calculates exceeded status and overspent amount", () => {
    const exceededTxs: RawTransaction[] = [
      ...sampleTransactions,
      { id: "tx-exceed", amount: 400000, type: "expense", categoryId: "food", date: "2026-11-20" },
    ];
    const progress = calculateBudgetProgress(budgetMonthly, exceededTxs, "2026-11-20");
    expect(progress.spent).toBe(1100000);
    expect(progress.remaining).toBe(-100000);
    expect(progress.percentage).toBe(110);
    expect(progress.status).toBe("exceeded");
    expect(progress.overspentAmount).toBe(100000);
    expect(progress.dailyRecommended).toBe(0);
  });

  it("calculates weekly budget period accurately", () => {
    const weeklyBudget: BudgetInput = {
      id: "bgt-w1",
      categoryId: "food",
      amount: 300000,
      period: "weekly",
      startDate: "2026-11-01",
      notifyThreshold: 80,
    };
    const progress = calculateBudgetProgress(weeklyBudget, sampleTransactions, "2026-11-04");
    expect(progress.spent).toBe(300000);
    expect(progress.percentage).toBe(100);
    expect(progress.status).toBe("warning");
  });

  it("aggregates overall budget health across multiple categories", () => {
    const transportBudget: BudgetInput = {
      id: "bgt-2",
      categoryId: "transport",
      amount: 500000,
      period: "monthly",
      startDate: "2026-11-01",
      notifyThreshold: 80,
    };

    const overall = calculateOverallBudgetHealth(
      [budgetMonthly, transportBudget],
      sampleTransactions,
      "2026-11-15"
    );

    expect(overall.totalBudgeted).toBe(1500000);
    expect(overall.totalSpent).toBe(900000);
    expect(overall.remaining).toBe(600000);
    expect(overall.percentage).toBe(60);
    expect(overall.safeCount).toBe(2);
    expect(overall.warningCount).toBe(0);
    expect(overall.exceededCount).toBe(0);
  });

  it("projects period spending velocity", () => {
    const projection = projectPeriodSpend(700000, 10, 30);
    expect(projection.burnRatePerDay).toBe(70000);
    expect(projection.projectedTotal).toBe(2100000);
  });
});

describe("Budget Server Actions", () => {
  it("validates valid budget submission action", async () => {
    const res = await validateBudgetAction({
      id: "bgt-action-1",
      categoryId: "groceries",
      amount: 750000,
      period: "monthly",
      startDate: "2026-11-01",
      notifyThreshold: 85,
    });

    expect(res.success).toBe(true);
    expect(res.data?.amount).toBe(750000);
  });

  it("returns validation errors for invalid action payload", async () => {
    const res = await validateBudgetAction({
      id: "bgt-action-2",
      categoryId: "",
      amount: -100,
      period: "monthly",
      startDate: "invalid-date",
    });

    expect(res.success).toBe(false);
    expect(res.fieldErrors).toBeDefined();
    expect(res.fieldErrors?.categoryId).toBeDefined();
    expect(res.fieldErrors?.amount).toBeDefined();
    expect(res.fieldErrors?.startDate).toBeDefined();
  });

  it("generates budget alert notifications via server action", async () => {
    const budgets: BudgetInput[] = [
      {
        id: "bgt-alert-1",
        categoryId: "food",
        amount: 500000,
        period: "monthly",
        startDate: "2026-11-01",
        notifyThreshold: 80,
      },
    ];

    const transactions: RawTransaction[] = [
      { id: "tx-a", amount: 450000, type: "expense", categoryId: "food", date: "2026-11-05" },
    ];

    const res = await evaluateBudgetAlertsAction(budgets, transactions, "2026-11-06");
    expect(res.success).toBe(true);
    expect(res.data).toHaveLength(1);
    expect(res.data?.[0].severity).toBe("warning");
    expect(res.data?.[0].percentage).toBe(90);
  });
});
