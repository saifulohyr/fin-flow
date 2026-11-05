import { describe, it, expect } from "vitest";
import { summarizeDebts, calculateDebtToAssetRatio, DebtEntry } from "@/lib/debt-engine";

describe("debt dashboard view calculations", () => {
  const sampleDebts: DebtEntry[] = [
    {
      id: "debt-1",
      name: "Cicilan Laptop",
      type: "installment",
      outstandingBalance: 3500000,
      interestRateAnnual: 9.5,
      monthlyPayment: 850000,
      status: "active",
    },
    {
      id: "debt-2",
      name: "Kartu Kredit",
      type: "credit_card",
      outstandingBalance: 1250000,
      interestRateAnnual: 18,
      monthlyPayment: 450000,
      status: "active",
    },
  ];

  it("calculates summary correctly for dashboard rendering", () => {
    const summary = summarizeDebts(sampleDebts);
    expect(summary.totalDebt).toBe(4750000);
    expect(summary.totalMonthlyPayment).toBe(1300000);
    expect(summary.activeDebtCount).toBe(2);
  });

  it("evaluates healthy debt-to-asset ratio", () => {
    const ratio = calculateDebtToAssetRatio(21040000, 4750000);
    expect(ratio.status).toBe("healthy");
    expect(ratio.ratio).toBeLessThan(0.4);
  });
});
