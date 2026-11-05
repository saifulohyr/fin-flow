import { describe, it, expect } from "vitest";
import {
  summarizeDebts,
  projectPayoff,
  calculateDebtToAssetRatio,
  projectAllPayoffs,
  type DebtEntry,
} from "./debt-engine";

const makeDebt = (overrides: Partial<DebtEntry> = {}): DebtEntry => ({
  id: "d1",
  name: "KPR",
  type: "mortgage",
  outstandingBalance: 120_000_000,
  interestRateAnnual: 12,
  monthlyPayment: 2_000_000,
  status: "active",
  ...overrides,
});

describe("summarizeDebts", () => {
  it("sums active debts only", () => {
    const debts: DebtEntry[] = [
      makeDebt({ id: "d1", outstandingBalance: 50_000_000 }),
      makeDebt({ id: "d2", outstandingBalance: 30_000_000, status: "paid_off" }),
    ];
    const s = summarizeDebts(debts);
    expect(s.totalDebt).toBe(50_000_000);
    expect(s.activeDebtCount).toBe(1);
    expect(s.debtCount).toBe(2);
    expect(s.totalMonthlyPayment).toBe(2_000_000);
    expect(s.highestDebt?.id).toBe("d1");
  });

  it("returns null highestDebt when all debts paid off", () => {
    const s = summarizeDebts([makeDebt({ status: "paid_off" })]);
    expect(s.highestDebt).toBeNull();
    expect(s.totalDebt).toBe(0);
  });
});

describe("projectPayoff", () => {
  it("pays off a zero-interest debt in correct months", () => {
    // 10M balance, 1M/month, 0% interest → 10 months
    const debt = makeDebt({ outstandingBalance: 10_000_000, interestRateAnnual: 0, monthlyPayment: 1_000_000 });
    const result = projectPayoff(debt, "2026-01");
    expect(result.monthsToPayoff).toBe(10);
    expect(result.totalInterestPaid).toBe(0);
    expect(result.payoffDate).toBe("2026-11");
  });

  it("returns 0 months for paid_off debt", () => {
    const result = projectPayoff(makeDebt({ status: "paid_off" }), "2026-01");
    expect(result.monthsToPayoff).toBe(0);
  });

  it("returns 0 months for zero balance", () => {
    const result = projectPayoff(makeDebt({ outstandingBalance: 0 }), "2026-01");
    expect(result.monthsToPayoff).toBe(0);
  });

  it("computes interest correctly for 12% annual over 1 month", () => {
    // 1M balance, 1% monthly, pay 110k → interest = 10k, net payment = 100k
    const debt = makeDebt({
      outstandingBalance: 1_000_000,
      interestRateAnnual: 12,
      monthlyPayment: 110_000,
    });
    const result = projectPayoff(debt, "2026-01");
    expect(result.totalInterestPaid).toBeGreaterThan(0);
    expect(result.monthsToPayoff).toBeGreaterThan(0);
  });
});

describe("calculateDebtToAssetRatio", () => {
  it("healthy when ratio < 0.4", () => {
    const r = calculateDebtToAssetRatio(100_000_000, 30_000_000);
    expect(r.ratio).toBe(0.3);
    expect(r.status).toBe("healthy");
  });

  it("caution when 0.4 ≤ ratio < 0.6", () => {
    const r = calculateDebtToAssetRatio(100_000_000, 50_000_000);
    expect(r.status).toBe("caution");
  });

  it("high_risk when ratio ≥ 0.6", () => {
    const r = calculateDebtToAssetRatio(100_000_000, 70_000_000);
    expect(r.status).toBe("high_risk");
  });

  it("handles zero assets with debt", () => {
    const r = calculateDebtToAssetRatio(0, 10_000_000);
    expect(r.ratio).toBe(999);
    expect(r.status).toBe("high_risk");
  });

  it("handles no debt no assets", () => {
    const r = calculateDebtToAssetRatio(0, 0);
    expect(r.ratio).toBe(0);
    expect(r.status).toBe("healthy");
  });
});

describe("projectAllPayoffs", () => {
  it("only projects active debts", () => {
    const debts: DebtEntry[] = [
      makeDebt({ id: "d1", status: "active" }),
      makeDebt({ id: "d2", status: "paid_off" }),
    ];
    const projections = projectAllPayoffs(debts, "2026-01");
    expect(projections).toHaveLength(1);
    expect(projections[0].debtId).toBe("d1");
  });
});
