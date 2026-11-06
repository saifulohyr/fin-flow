import { describe, it, expect } from "vitest";
import {
  evaluateEmergencyFund,
  evaluateDebtService,
  evaluateSavingsRate,
  evaluateSolvency,
  evaluateBudgetDiscipline,
  evaluateFinancialHealth,
} from "./financial-health-engine";

describe("evaluateEmergencyFund", () => {
  it("grades >= 6 months as excellent with full 25 score", () => {
    const res = evaluateEmergencyFund(30_000_000, 5_000_000); // 6.0 months
    expect(res.months).toBe(6);
    expect(res.runwayDays).toBe(180);
    expect(res.score).toBe(25);
    expect(res.status).toBe("excellent");
  });

  it("grades 3 to 6 months as healthy", () => {
    const res = evaluateEmergencyFund(15_000_000, 5_000_000); // 3.0 months
    expect(res.months).toBe(3);
    expect(res.score).toBe(18);
    expect(res.status).toBe("healthy");
  });

  it("grades 1 to 3 months as warning", () => {
    const res = evaluateEmergencyFund(7_500_000, 5_000_000); // 1.5 months
    expect(res.months).toBe(1.5);
    expect(res.score).toBeGreaterThanOrEqual(8);
    expect(res.score).toBeLessThan(18);
    expect(res.status).toBe("warning");
  });

  it("grades < 1 month as critical", () => {
    const res = evaluateEmergencyFund(2_000_000, 5_000_000); // 0.4 months
    expect(res.months).toBe(0.4);
    expect(res.status).toBe("critical");
    expect(res.score).toBeLessThan(8);
  });

  it("handles zero essential burn gracefully", () => {
    const res = evaluateEmergencyFund(10_000_000, 0);
    expect(res.months).toBe(12);
    expect(res.score).toBe(25);
    expect(res.status).toBe("excellent");

    const zeroRes = evaluateEmergencyFund(0, 0);
    expect(zeroRes.score).toBe(0);
    expect(zeroRes.status).toBe("critical");
  });
});

describe("evaluateDebtService", () => {
  it("gives full score for zero debt", () => {
    const res = evaluateDebtService(0, 10_000_000, 0);
    expect(res.dsrPercent).toBe(0);
    expect(res.score).toBe(20);
    expect(res.status).toBe("excellent");
  });

  it("evaluates healthy DSR (<= 30%)", () => {
    const res = evaluateDebtService(2_000_000, 10_000_000, 50_000_000); // 20%
    expect(res.dsrPercent).toBe(20);
    expect(res.score).toBeGreaterThanOrEqual(15);
    expect(res.status).toBe("healthy");
  });

  it("flags warning when DSR is 30%-45%", () => {
    const res = evaluateDebtService(3_500_000, 10_000_000, 50_000_000); // 35%
    expect(res.dsrPercent).toBe(35);
    expect(res.status).toBe("warning");
  });

  it("flags critical when DSR > 45%", () => {
    const res = evaluateDebtService(5_500_000, 10_000_000, 50_000_000); // 55%
    expect(res.dsrPercent).toBe(55);
    expect(res.status).toBe("critical");
  });

  it("handles zero income with active debt", () => {
    const res = evaluateDebtService(1_000_000, 0, 10_000_000);
    expect(res.score).toBe(0);
    expect(res.status).toBe("critical");
  });
});

describe("evaluateSavingsRate", () => {
  it("rates savings >= 30% as excellent", () => {
    const res = evaluateSavingsRate(10_000_000, 6_000_000); // 40%
    expect(res.savingsRatePercent).toBe(40);
    expect(res.score).toBe(20);
    expect(res.status).toBe("excellent");
  });

  it("rates savings 20-30% as healthy", () => {
    const res = evaluateSavingsRate(10_000_000, 7_500_000); // 25%
    expect(res.savingsRatePercent).toBe(25);
    expect(res.score).toBeGreaterThanOrEqual(15);
    expect(res.status).toBe("healthy");
  });

  it("flags deficit when expenses exceed income", () => {
    const res = evaluateSavingsRate(10_000_000, 12_000_000); // -20%
    expect(res.savingsRatePercent).toBe(-20);
    expect(res.score).toBe(0);
    expect(res.status).toBe("critical");
  });
});

describe("evaluateSolvency", () => {
  it("rates high net worth solvency (>= 70%) as excellent", () => {
    const res = evaluateSolvency(100_000_000, 20_000_000); // 80%
    expect(res.solvencyPercent).toBe(80);
    expect(res.score).toBe(20);
    expect(res.status).toBe("excellent");
  });

  it("handles negative equity (insolvent)", () => {
    const res = evaluateSolvency(20_000_000, 50_000_000); // -150%
    expect(res.solvencyPercent).toBe(-150);
    expect(res.score).toBe(0);
    expect(res.status).toBe("critical");
  });
});

describe("evaluateBudgetDiscipline", () => {
  it("returns default neutral score when unbudgeted", () => {
    const res = evaluateBudgetDiscipline(undefined, undefined);
    expect(res.score).toBe(12);
    expect(res.status).toBe("healthy");
  });

  it("awards 15 pts for spending <= 90%", () => {
    const res = evaluateBudgetDiscipline(10_000_000, 8_000_000);
    expect(res.disciplinePercent).toBe(80);
    expect(res.score).toBe(15);
    expect(res.status).toBe("excellent");
  });

  it("penalizes overspending > 115%", () => {
    const res = evaluateBudgetDiscipline(10_000_000, 13_000_000); // 130%
    expect(res.disciplinePercent).toBe(130);
    expect(res.score).toBeLessThanOrEqual(5);
    expect(res.status).toBe("critical");
  });
});

describe("evaluateFinancialHealth composite", () => {
  it("produces prime score for stellar financial profile", () => {
    const evalResult = evaluateFinancialHealth({
      liquidAssets: 60_000_000,
      totalAssets: 150_000_000,
      totalDebt: 10_000_000,
      monthlyIncome: 20_000_000,
      monthlyExpenses: 12_000_000,
      monthlyEssentialBurn: 8_000_000, // 7.5 months runway
      monthlyDebtPayment: 1_000_000, // 5% DSR
      budgetedAmount: 12_000_000,
      actualBudgetSpend: 10_000_000,
    });

    expect(evalResult.overallScore).toBeGreaterThanOrEqual(85);
    expect(evalResult.grade).toBe("prime");
    expect(evalResult.gradeLabel).toBe("Sangat Sehat");
    expect(evalResult.pillars).toHaveLength(5);
    expect(evalResult.runwayMonths).toBe(7.5);
  });

  it("produces critical grade for underwater profile", () => {
    const evalResult = evaluateFinancialHealth({
      liquidAssets: 1_000_000,
      totalAssets: 10_000_000,
      totalDebt: 30_000_000,
      monthlyIncome: 5_000_000,
      monthlyExpenses: 6_000_000,
      monthlyEssentialBurn: 4_500_000,
      monthlyDebtPayment: 3_000_000, // 60% DSR
    });

    expect(evalResult.overallScore).toBeLessThan(50);
    expect(evalResult.grade).toBe("critical");
    expect(evalResult.recommendations.length).toBeGreaterThan(0);
  });
});
