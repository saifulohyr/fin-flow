/* eslint-disable @typescript-eslint/no-explicit-any */
import { describe, it, expect } from "vitest";
import {
  summarizeDebts,
  projectPayoff,
  calculateDebtToAssetRatio,
  projectAllPayoffs,
  DebtEntry,
} from "@/lib/debt-engine";
import {
  debtSchema,
  createDebtSchema,
  DebtInput,
} from "@/lib/validations/debt";
import {
  validateDebtAction,
  validateCreateDebtAction,
  getDebtSummaryAction,
  getDebtPayoffProjectionAction,
  getAllDebtPayoffProjectionsAction,
  getDebtToAssetRatioAction,
  recordDebtPaymentAction,
} from "@/actions/debt";

const baseDebt: DebtEntry = {
  id: "debt-001",
  name: "Cicilan Laptop",
  type: "installment",
  outstandingBalance: 12_000_000,
  interestRateAnnual: 0,
  monthlyPayment: 1_000_000,
  status: "active",
};

const baseDebtInput: DebtInput = {
  id: "debt-input-001",
  name: "Kredit Usaha Rakyat",
  type: "personal_loan",
  principalAmount: 50_000_000,
  outstandingBalance: 30_000_000,
  interestRateAnnual: 6,
  monthlyPayment: 1_500_000,
  startDate: "2025-01-15",
  dueDate: "2027-01-15",
  accountId: "acc-123",
  status: "active",
  color: "#b45309",
  note: "Bunga subsidi pemerintah",
};

describe("Debt Engine - Edge Cases & Calculations", () => {
  describe("summarizeDebts", () => {
    it("handles empty debt array gracefully", () => {
      const summary = summarizeDebts([]);
      expect(summary.totalDebt).toBe(0);
      expect(summary.totalMonthlyPayment).toBe(0);
      expect(summary.debtCount).toBe(0);
      expect(summary.activeDebtCount).toBe(0);
      expect(summary.highestDebt).toBeNull();
    });

    it("filters out paid_off and defaulted debts from active sums", () => {
      const debts: DebtEntry[] = [
        { ...baseDebt, id: "d1", outstandingBalance: 10_000_000, status: "active" },
        { ...baseDebt, id: "d2", outstandingBalance: 20_000_000, status: "paid_off" },
        { ...baseDebt, id: "d3", outstandingBalance: 15_000_000, status: "defaulted" },
      ];
      const summary = summarizeDebts(debts);
      expect(summary.debtCount).toBe(3);
      expect(summary.activeDebtCount).toBe(1);
      expect(summary.totalDebt).toBe(10_000_000);
      expect(summary.highestDebt?.id).toBe("d1");
    });

    it("identifies highest debt when multiple active debts exist", () => {
      const debts: DebtEntry[] = [
        { ...baseDebt, id: "d1", outstandingBalance: 5_000_000, status: "active" },
        { ...baseDebt, id: "d2", outstandingBalance: 45_000_000, status: "active" },
        { ...baseDebt, id: "d3", outstandingBalance: 25_000_000, status: "active" },
      ];
      const summary = summarizeDebts(debts);
      expect(summary.highestDebt?.id).toBe("d2");
      expect(summary.highestDebt?.outstandingBalance).toBe(45_000_000);
      expect(summary.totalDebt).toBe(75_000_000);
    });

    it("handles all debts paid off or defaulted", () => {
      const debts: DebtEntry[] = [
        { ...baseDebt, id: "d1", outstandingBalance: 5_000_000, status: "paid_off" },
        { ...baseDebt, id: "d2", outstandingBalance: 10_000_000, status: "defaulted" },
      ];
      const summary = summarizeDebts(debts);
      expect(summary.activeDebtCount).toBe(0);
      expect(summary.totalDebt).toBe(0);
      expect(summary.totalMonthlyPayment).toBe(0);
      expect(summary.highestDebt).toBeNull();
    });
  });

  describe("projectPayoff - Projections & Amortization Edge Cases", () => {
    it("handles zero interest debt with exact division", () => {
      const debt: DebtEntry = {
        ...baseDebt,
        outstandingBalance: 6_000_000,
        monthlyPayment: 2_000_000,
        interestRateAnnual: 0,
      };
      const projection = projectPayoff(debt, "2026-03");
      expect(projection.monthsToPayoff).toBe(3);
      expect(projection.totalInterestPaid).toBe(0);
      expect(projection.payoffDate).toBe("2026-06");
    });

    it("handles zero interest debt with remainder in final month", () => {
      const debt: DebtEntry = {
        ...baseDebt,
        outstandingBalance: 5_000_000,
        monthlyPayment: 2_000_000,
        interestRateAnnual: 0,
      };
      // Month 1: 3M, Month 2: 1M, Month 3: 0
      const projection = projectPayoff(debt, "2026-01");
      expect(projection.monthsToPayoff).toBe(3);
      expect(projection.payoffDate).toBe("2026-04");
    });

    it("rolls over years correctly across December boundary", () => {
      const debt: DebtEntry = {
        ...baseDebt,
        outstandingBalance: 2_000_000,
        monthlyPayment: 1_000_000,
        interestRateAnnual: 0,
      };
      const projection = projectPayoff(debt, "2026-11");
      // Month 1 (Nov): 1M left -> Dec 2026
      // Month 2 (Dec): 0 left -> Jan 2027
      expect(projection.monthsToPayoff).toBe(2);
      expect(projection.payoffDate).toBe("2027-01");
    });

    it("handles inactive debts immediately with 0 months", () => {
      const paidDebt: DebtEntry = { ...baseDebt, status: "paid_off" };
      const defaultedDebt: DebtEntry = { ...baseDebt, status: "defaulted" };

      expect(projectPayoff(paidDebt, "2026-05").monthsToPayoff).toBe(0);
      expect(projectPayoff(paidDebt, "2026-05").payoffDate).toBe("2026-05");
      expect(projectPayoff(defaultedDebt, "2026-05").monthsToPayoff).toBe(0);
    });

    it("handles zero or negative balance debt immediately", () => {
      const zeroBalance: DebtEntry = { ...baseDebt, outstandingBalance: 0 };
      const res = projectPayoff(zeroBalance, "2026-01");
      expect(res.monthsToPayoff).toBe(0);
      expect(res.totalInterestPaid).toBe(0);
      expect(res.payoffDate).toBe("2026-01");
    });

    it("guards against infinite loop when monthlyPayment <= interest by enforcing minPayment", () => {
      // 100M at 24% annual = 2% per month = 2,000,000 monthly interest.
      // If monthlyPayment is only 1,000,000, minPayment guard forces effectivePayment = 2,000,001.
      const debt: DebtEntry = {
        ...baseDebt,
        outstandingBalance: 100_000_000,
        interestRateAnnual: 24,
        monthlyPayment: 1_000_000,
      };
      const res = projectPayoff(debt, "2026-01");
      expect(res.monthsToPayoff).toBeGreaterThan(0);
      expect(res.monthsToPayoff).toBeLessThanOrEqual(600);
      expect(res.totalInterestPaid).toBeGreaterThan(0);
    });

    it("hits MAX_MONTHS safety cap (600 months) for extremely large debt with minimum payment", () => {
      const hugeDebt: DebtEntry = {
        ...baseDebt,
        outstandingBalance: 1_000_000_000,
        interestRateAnnual: 12,
        monthlyPayment: 10_000_001, // barely pays 1 IDR of principal each month
      };
      const res = projectPayoff(hugeDebt, "2026-01");
      expect(res.monthsToPayoff).toBe(600);
    });
  });

  describe("calculateDebtToAssetRatio", () => {
    it("returns healthy status when ratio < 0.4", () => {
      const res = calculateDebtToAssetRatio(100_000_000, 39_900_000);
      expect(res.ratio).toBe(0.399);
      expect(res.status).toBe("healthy");
    });

    it("returns caution status at exactly 0.4 boundary", () => {
      const res = calculateDebtToAssetRatio(100_000_000, 40_000_000);
      expect(res.ratio).toBe(0.4);
      expect(res.status).toBe("caution");
    });

    it("returns caution status up to 0.599", () => {
      const res = calculateDebtToAssetRatio(100_000_000, 59_900_000);
      expect(res.ratio).toBe(0.599);
      expect(res.status).toBe("caution");
    });

    it("returns high_risk status at exactly 0.6 boundary", () => {
      const res = calculateDebtToAssetRatio(100_000_000, 60_000_000);
      expect(res.ratio).toBe(0.6);
      expect(res.status).toBe("high_risk");
    });

    it("returns high_risk when debt significantly exceeds assets", () => {
      const res = calculateDebtToAssetRatio(50_000_000, 150_000_000);
      expect(res.ratio).toBe(3);
      expect(res.status).toBe("high_risk");
    });

    it("handles zero assets with positive debt gracefully", () => {
      const res = calculateDebtToAssetRatio(0, 10_000_000);
      expect(res.ratio).toBe(999);
      expect(res.status).toBe("high_risk");
    });

    it("handles zero assets with zero debt as healthy", () => {
      const res = calculateDebtToAssetRatio(0, 0);
      expect(res.ratio).toBe(0);
      expect(res.status).toBe("healthy");
    });
  });

  describe("projectAllPayoffs", () => {
    it("returns empty array when no active debts exist", () => {
      const debts: DebtEntry[] = [
        { ...baseDebt, id: "d1", status: "paid_off" },
        { ...baseDebt, id: "d2", status: "defaulted" },
      ];
      expect(projectAllPayoffs(debts, "2026-01")).toEqual([]);
    });

    it("filters and projects only active debts", () => {
      const debts: DebtEntry[] = [
        { ...baseDebt, id: "d1", status: "active", outstandingBalance: 2_000_000, monthlyPayment: 1_000_000, interestRateAnnual: 0 },
        { ...baseDebt, id: "d2", status: "paid_off" },
        { ...baseDebt, id: "d3", status: "active", outstandingBalance: 4_000_000, monthlyPayment: 2_000_000, interestRateAnnual: 0 },
      ];
      const results = projectAllPayoffs(debts, "2026-01");
      expect(results).toHaveLength(2);
      expect(results[0].debtId).toBe("d1");
      expect(results[1].debtId).toBe("d3");
    });
  });
});

describe("Debt Schema & Validations", () => {
  describe("debtSchema validations", () => {
    it("accepts valid full debt object", () => {
      const parsed = debtSchema.safeParse(baseDebtInput);
      expect(parsed.success).toBe(true);
      if (parsed.success) {
        expect(parsed.data.name).toBe("Kredit Usaha Rakyat");
        expect(parsed.data.status).toBe("active");
      }
    });

    it("accepts 3-digit and 6-digit hex colors", () => {
      expect(debtSchema.safeParse({ ...baseDebtInput, color: "#fff" }).success).toBe(true);
      expect(debtSchema.safeParse({ ...baseDebtInput, color: "#10b981" }).success).toBe(true);
      expect(debtSchema.safeParse({ ...baseDebtInput, color: "red" }).success).toBe(false);
      expect(debtSchema.safeParse({ ...baseDebtInput, color: "#12345" }).success).toBe(false);
      expect(debtSchema.safeParse({ ...baseDebtInput, color: "123456" }).success).toBe(false);
    });

    it("rejects non-integer principal and negative balance", () => {
      expect(debtSchema.safeParse({ ...baseDebtInput, principalAmount: 10_000.5 }).success).toBe(false);
      expect(debtSchema.safeParse({ ...baseDebtInput, principalAmount: 0 }).success).toBe(false);
      expect(debtSchema.safeParse({ ...baseDebtInput, outstandingBalance: -500 }).success).toBe(false);
    });

    it("validates interestRateAnnual boundary [0, 100]", () => {
      expect(debtSchema.safeParse({ ...baseDebtInput, interestRateAnnual: 0 }).success).toBe(true);
      expect(debtSchema.safeParse({ ...baseDebtInput, interestRateAnnual: 100 }).success).toBe(true);
      expect(debtSchema.safeParse({ ...baseDebtInput, interestRateAnnual: -0.1 }).success).toBe(false);
      expect(debtSchema.safeParse({ ...baseDebtInput, interestRateAnnual: 100.1 }).success).toBe(false);
    });

    it("validates valid debt types and rejects unknown types", () => {
      const validTypes = ["credit_card", "personal_loan", "mortgage", "vehicle_loan", "installment", "other"];
      for (const t of validTypes) {
        expect(debtSchema.safeParse({ ...baseDebtInput, type: t }).success).toBe(true);
      }
      expect(debtSchema.safeParse({ ...baseDebtInput, type: "crypto_loan" }).success).toBe(false);
    });

    it("validates date format YYYY-MM-DD", () => {
      expect(debtSchema.safeParse({ ...baseDebtInput, startDate: "2026-12-31" }).success).toBe(true);
      expect(debtSchema.safeParse({ ...baseDebtInput, startDate: "2026/12/31" }).success).toBe(false);
      expect(debtSchema.safeParse({ ...baseDebtInput, startDate: "31-12-2026" }).success).toBe(false);
      expect(debtSchema.safeParse({ ...baseDebtInput, startDate: "invalid-date" }).success).toBe(false);
    });

    it("allows optional and nullable fields", () => {
      const minimalDebt = {
        id: "d-min",
        name: "Hutang Teman",
        type: "other" as const,
        principalAmount: 1_000_000,
        outstandingBalance: 1_000_000,
        monthlyPayment: 250_000,
        startDate: "2026-01-01",
        dueDate: null,
        accountId: null,
        note: null,
      };
      const parsed = debtSchema.safeParse(minimalDebt);
      expect(parsed.success).toBe(true);
      if (parsed.success) {
        expect(parsed.data.interestRateAnnual).toBe(0);
        expect(parsed.data.status).toBe("active");
        expect(parsed.data.color).toBe("#b45309");
      }
    });
  });

  describe("createDebtSchema validations", () => {
    it("allows omitting id and status when creating", () => {
      const createData = { ...baseDebtInput } as Partial<typeof baseDebtInput>;
      delete createData.id;
      delete createData.status;
      const parsed = createDebtSchema.safeParse(createData);
      expect(parsed.success).toBe(true);
    });

    it("allows omitting outstandingBalance upon creation (can default or compute)", () => {
      const createData = { ...baseDebtInput } as Partial<typeof baseDebtInput>;
      delete createData.id;
      delete createData.status;
      delete createData.outstandingBalance;
      const parsed = createDebtSchema.safeParse(createData);
      expect(parsed.success).toBe(true);
    });
  });
});

describe("Debt Server Actions - Edge Cases", () => {
  describe("validateDebtAction & validateCreateDebtAction", () => {
    it("returns field errors on invalid input", async () => {
      const res = await validateDebtAction({ name: "" });
      expect(res.success).toBe(false);
      expect(res.fieldErrors).toBeDefined();
    });

    it("returns formatted error message on create validation failure", async () => {
      const res = await validateCreateDebtAction({ principalAmount: -100 });
      expect(res.success).toBe(false);
      expect(res.error).toContain("Validasi penambahan utang gagal");
    });
  });

  describe("getDebtSummaryAction", () => {
    it("returns error if input is not an array", async () => {
      const res = await getDebtSummaryAction(undefined as any);
      expect(res.success).toBe(false);
      expect(res.error).toBe("Daftar utang harus berupa array.");
    });

    it("summarizes empty array without error", async () => {
      const res = await getDebtSummaryAction([]);
      expect(res.success).toBe(true);
      expect(res.data?.totalDebt).toBe(0);
      expect(res.data?.debtCount).toBe(0);
    });
  });

  describe("getDebtPayoffProjectionAction & getAllDebtPayoffProjectionsAction", () => {
    it("uses current YYYY-MM fallback when fromYearMonth is omitted", async () => {
      const res = await getDebtPayoffProjectionAction(baseDebtInput);
      expect(res.success).toBe(true);
      expect(res.data?.payoffDate).toMatch(/^\d{4}-\d{2}$/);
    });

    it("rejects invalid fromYearMonth format in single projection", async () => {
      const res = await getDebtPayoffProjectionAction(baseDebtInput, "2026/05");
      expect(res.success).toBe(false);
      expect(res.error).toContain("Format fromYearMonth harus YYYY-MM");
    });

    it("rejects invalid debt input in single projection", async () => {
      const res = await getDebtPayoffProjectionAction({ ...baseDebtInput, principalAmount: -5 } as any);
      expect(res.success).toBe(false);
      expect(res.error).toBe("Data utang tidak valid.");
    });

    it("rejects non-array in getAllDebtPayoffProjectionsAction", async () => {
      const res = await getAllDebtPayoffProjectionsAction("not-array" as any);
      expect(res.success).toBe(false);
      expect(res.error).toBe("Daftar utang harus berupa array.");
    });

    it("rejects invalid fromYearMonth in getAllDebtPayoffProjectionsAction", async () => {
      const res = await getAllDebtPayoffProjectionsAction([baseDebtInput], "invalid-month");
      expect(res.success).toBe(false);
      expect(res.error).toContain("Format fromYearMonth harus YYYY-MM");
    });

    it("uses default YYYY-MM fallback in getAllDebtPayoffProjectionsAction when omitted", async () => {
      const res = await getAllDebtPayoffProjectionsAction([baseDebtInput]);
      expect(res.success).toBe(true);
      expect(res.data).toHaveLength(1);
    });
  });

  describe("getDebtToAssetRatioAction", () => {
    it("rejects negative total assets", async () => {
      const res = await getDebtToAssetRatioAction(-50_000, [baseDebtInput]);
      expect(res.success).toBe(false);
      expect(res.error).toBe("Total aset harus berupa angka non-negatif.");
    });

    it("rejects NaN or non-number total assets", async () => {
      const resNaN = await getDebtToAssetRatioAction(NaN, [baseDebtInput]);
      expect(resNaN.success).toBe(false);
      const resStr = await getDebtToAssetRatioAction("100000" as any, [baseDebtInput]);
      expect(resStr.success).toBe(false);
    });

    it("rejects non-array debts parameter", async () => {
      const res = await getDebtToAssetRatioAction(10_000_000, null as any);
      expect(res.success).toBe(false);
      expect(res.error).toBe("Daftar utang harus berupa array.");
    });

    it("calculates correct ratio when total assets is zero", async () => {
      const res = await getDebtToAssetRatioAction(0, [baseDebtInput]);
      expect(res.success).toBe(true);
      expect(res.data?.ratio).toBe(999);
      expect(res.data?.status).toBe("high_risk");
    });

    it("calculates healthy ratio when assets exceed debt sufficiently", async () => {
      const res = await getDebtToAssetRatioAction(100_000_000, [baseDebtInput]); // 30M debt / 100M assets = 0.3
      expect(res.success).toBe(true);
      expect(res.data?.ratio).toBe(0.3);
      expect(res.data?.status).toBe("healthy");
    });
  });

  describe("recordDebtPaymentAction", () => {
    it("handles exact balance payoff without overpayment flag", async () => {
      const debt = { ...baseDebtInput, outstandingBalance: 5_000_000 };
      const res = await recordDebtPaymentAction(debt, 5_000_000);
      expect(res.success).toBe(true);
      expect(res.data?.newBalance).toBe(0);
      expect(res.data?.overpaid).toBe(false);
    });

    it("clamps balance to zero and flags overpaid on excess payment", async () => {
      const debt = { ...baseDebtInput, outstandingBalance: 5_000_000 };
      const res = await recordDebtPaymentAction(debt, 6_000_000);
      expect(res.success).toBe(true);
      expect(res.data?.newBalance).toBe(0);
      expect(res.data?.overpaid).toBe(true);
    });

    it("rejects zero or negative payment amounts", async () => {
      const resZero = await recordDebtPaymentAction(baseDebtInput, 0);
      expect(resZero.success).toBe(false);
      expect(resZero.error).toContain("Nominal pembayaran harus berupa angka positif");

      const resNeg = await recordDebtPaymentAction(baseDebtInput, -1_000);
      expect(resNeg.success).toBe(false);

      const resNaN = await recordDebtPaymentAction(baseDebtInput, NaN);
      expect(resNaN.success).toBe(false);
    });

    it("rejects payments on defaulted debts", async () => {
      const defaulted = { ...baseDebtInput, status: "defaulted" as const };
      const res = await recordDebtPaymentAction(defaulted, 1_000_000);
      expect(res.success).toBe(false);
      expect(res.error).toBe("Hanya utang aktif yang bisa dilunasi.");
    });

    it("rejects invalid debt schema payload", async () => {
      const invalidDebt = { ...baseDebtInput, name: "" };
      const res = await recordDebtPaymentAction(invalidDebt as any, 1_000_000);
      expect(res.success).toBe(false);
      expect(res.error).toBe("Data utang tidak valid.");
    });
  });
});
