import { z } from "zod";

export const healthGradeSchema = z.enum(["prime", "healthy", "caution", "critical"]);

export const financialHealthInputSchema = z.object({
  liquidAssets: z.number().int().min(0, "Aset likuid tidak boleh negatif"),
  totalAssets: z.number().int().min(0, "Total aset tidak boleh negatif"),
  totalDebt: z.number().int().min(0, "Total hutang tidak boleh negatif"),
  monthlyIncome: z.number().int().min(0, "Pemasukan bulanan tidak boleh negatif"),
  monthlyExpenses: z.number().int().min(0, "Pengeluaran bulanan tidak boleh negatif"),
  monthlyEssentialBurn: z.number().int().min(0, "Pengeluaran esensial tidak boleh negatif"),
  monthlyDebtPayment: z.number().int().min(0, "Cicilan hutang bulanan tidak boleh negatif"),
  budgetedAmount: z.number().int().min(0).optional(),
  actualBudgetSpend: z.number().int().min(0).optional(),
});

export const financialHealthSnapshotSchema = z.object({
  id: z.string().min(1),
  snapshotDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Format tanggal harus YYYY-MM-DD"),
  overallScore: z.number().int().min(0).max(100),
  grade: healthGradeSchema,
  emergencyFundRatioMonths: z.number().int().min(0),
  debtServiceRatioBps: z.number().int().min(0),
  savingsRateBps: z.number().int(),
  solvencyRatioBps: z.number().int(),
  budgetDisciplineBps: z.number().int().min(0),
  monthlyIncome: z.number().int().min(0),
  monthlyExpenses: z.number().int().min(0),
  liquidAssets: z.number().int().min(0),
  totalDebt: z.number().int().min(0),
  runwayDays: z.number().int().min(0),
  notes: z.string().max(500).optional(),
});

export type HealthGrade = z.infer<typeof healthGradeSchema>;
export type FinancialHealthInput = z.infer<typeof financialHealthInputSchema>;
export type FinancialHealthSnapshot = z.infer<typeof financialHealthSnapshotSchema>;
