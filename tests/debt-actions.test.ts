import { describe, it, expect } from "vitest";
import {
  validateDebtAction,
  validateCreateDebtAction,
  getDebtSummaryAction,
  getDebtPayoffProjectionAction,
  getAllDebtPayoffProjectionsAction,
  getDebtToAssetRatioAction,
  recordDebtPaymentAction,
} from "@/actions/debt";
import type { DebtInput } from "@/lib/validations/debt";

const sampleDebt: DebtInput = {
  id: "d1",
  name: "KPR",
  type: "mortgage" as const,
  principalAmount: 120_000_000,
  outstandingBalance: 50_000_000,
  interestRateAnnual: 12,
  monthlyPayment: 2_000_000,
  startDate: "2023-01-01",
  status: "active" as const,
  color: "#b45309",
};

describe("validateDebtAction", () => {
  it("accepts valid debt", async () => {
    const res = await validateDebtAction(sampleDebt);
    expect(res.success).toBe(true);
    expect(res.data?.id).toBe("d1");
  });

  it("rejects empty name", async () => {
    const res = await validateDebtAction({ ...sampleDebt, name: "" });
    expect(res.success).toBe(false);
    expect(res.error).toContain("Validasi");
  });

  it("rejects negative principal", async () => {
    const res = await validateDebtAction({ ...sampleDebt, principalAmount: -1 });
    expect(res.success).toBe(false);
  });
});

describe("validateCreateDebtAction", () => {
  it("accepts payload without id", async () => {
    const { id, status, ...rest } = sampleDebt;
    const res = await validateCreateDebtAction(rest);
    expect(res.success).toBe(true);
  });
});

describe("getDebtSummaryAction", () => {
  it("summarizes active debts", async () => {
    const res = await getDebtSummaryAction([sampleDebt]);
    expect(res.success).toBe(true);
    expect(res.data?.totalDebt).toBe(50_000_000);
    expect(res.data?.activeDebtCount).toBe(1);
  });

  it("returns error for non-array", async () => {
    const res = await getDebtSummaryAction(null as any);
    expect(res.success).toBe(false);
  });
});

describe("getDebtPayoffProjectionAction", () => {
  it("projects payoff", async () => {
    const res = await getDebtPayoffProjectionAction(sampleDebt, "2026-01");
    expect(res.success).toBe(true);
    expect(res.data?.monthsToPayoff).toBeGreaterThan(0);
    expect(res.data?.payoffDate).toMatch(/^\d{4}-\d{2}$/);
  });

  it("rejects bad date format", async () => {
    const res = await getDebtPayoffProjectionAction(sampleDebt, "2026-01-01");
    expect(res.success).toBe(false);
  });
});

describe("getAllDebtPayoffProjectionsAction", () => {
  it("projects all active debts", async () => {
    const res = await getAllDebtPayoffProjectionsAction([sampleDebt], "2026-01");
    expect(res.success).toBe(true);
    expect(res.data).toHaveLength(1);
  });
});

describe("getDebtToAssetRatioAction", () => {
  it("returns healthy ratio", async () => {
    const res = await getDebtToAssetRatioAction(200_000_000, [sampleDebt]);
    expect(res.success).toBe(true);
    expect(res.data?.status).toBe("healthy");
  });

  it("rejects negative assets", async () => {
    const res = await getDebtToAssetRatioAction(-1, [sampleDebt]);
    expect(res.success).toBe(false);
  });
});

describe("recordDebtPaymentAction", () => {
  it("reduces balance", async () => {
    const res = await recordDebtPaymentAction(sampleDebt, 10_000_000);
    expect(res.success).toBe(true);
    expect(res.data?.newBalance).toBe(40_000_000);
    expect(res.data?.overpaid).toBe(false);
  });

  it("detects overpayment", async () => {
    const res = await recordDebtPaymentAction(sampleDebt, 60_000_000);
    expect(res.success).toBe(true);
    expect(res.data?.newBalance).toBe(0);
    expect(res.data?.overpaid).toBe(true);
  });

  it("rejects zero payment", async () => {
    const res = await recordDebtPaymentAction(sampleDebt, 0);
    expect(res.success).toBe(false);
  });

  it("rejects paid_off debt", async () => {
    const paid = { ...sampleDebt, status: "paid_off" as const };
    const res = await recordDebtPaymentAction(paid, 1_000_000);
    expect(res.success).toBe(false);
  });
});
