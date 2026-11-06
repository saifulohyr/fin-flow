import { describe, it, expect } from "vitest";
import {
  evaluateFinancialHealthAction,
  quickHealthSnapshotAction,
  compareHealthSnapshotsAction,
} from "./financial-health";

const validHealthyInput = {
  liquidAssets: 30_000_000,
  totalAssets: 100_000_000,
  totalDebt: 10_000_000,
  monthlyIncome: 15_000_000,
  monthlyExpenses: 8_000_000,
  monthlyEssentialBurn: 5_000_000,
  monthlyDebtPayment: 1_000_000,
  budgetedAmount: 9_000_000,
  actualBudgetSpend: 8_000_000,
};

describe("evaluateFinancialHealthAction", () => {
  it("evaluates a valid payload successfully", async () => {
    const res = await evaluateFinancialHealthAction(validHealthyInput);
    expect(res.success).toBe(true);
    expect(res.data).toBeDefined();
    expect(res.data?.evaluation.overallScore).toBeGreaterThanOrEqual(70);
    expect(res.data?.evaluation.pillars).toHaveLength(5);
    expect(res.data?.evaluatedAt).toBeDefined();
  });

  it("fails on negative numeric input", async () => {
    const res = await evaluateFinancialHealthAction({
      ...validHealthyInput,
      liquidAssets: -100,
    });
    expect(res.success).toBe(false);
    expect(res.error).toBeDefined();
  });

  it("fails on malformed data", async () => {
    const res = await evaluateFinancialHealthAction("not-an-object");
    expect(res.success).toBe(false);
  });
});

describe("quickHealthSnapshotAction", () => {
  it("defaults missing fields to 0 without throwing", async () => {
    const res = await quickHealthSnapshotAction({
      liquidAssets: 20_000_000,
      monthlyIncome: 10_000_000,
    });
    expect(res.success).toBe(true);
    expect(res.data).toBeDefined();
    expect(res.data?.evaluation.pillars).toHaveLength(5);
  });
});

describe("compareHealthSnapshotsAction", () => {
  it("calculates score deltas and grade change correctly", async () => {
    const improvedInput = {
      ...validHealthyInput,
      liquidAssets: 60_000_000,
      totalDebt: 0,
      monthlyDebtPayment: 0,
    };

    const res = await compareHealthSnapshotsAction(improvedInput, validHealthyInput);
    expect(res.success).toBe(true);
    expect(res.data?.scoreDelta).toBeGreaterThanOrEqual(0);
    expect(res.data?.pillarDeltas).toHaveLength(5);
  });
});
