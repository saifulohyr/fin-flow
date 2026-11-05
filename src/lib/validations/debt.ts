import { z } from "zod";

export const debtTypeEnum = z.enum([
  "credit_card",
  "personal_loan",
  "mortgage",
  "vehicle_loan",
  "installment",
  "other",
]);

export const debtStatusEnum = z.enum(["active", "paid_off", "defaulted"]);

export type DebtType = z.infer<typeof debtTypeEnum>;
export type DebtStatus = z.infer<typeof debtStatusEnum>;

export const debtSchema = z.object({
  id: z.string().min(1, "ID utang wajib diisi"),
  name: z.string().min(1, "Nama utang wajib diisi"),
  type: debtTypeEnum.default("personal_loan"),
  principalAmount: z.number().int().positive("Nominal pokok harus positif"),
  outstandingBalance: z.number().int().min(0, "Sisa utang tidak boleh negatif"),
  interestRateAnnual: z.number().min(0).max(100).default(0), // percent
  monthlyPayment: z.number().int().positive("Cicilan bulanan harus positif"),
  startDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Format tanggal harus YYYY-MM-DD"),
  dueDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional().nullable(),
  accountId: z.string().optional().nullable(),
  status: debtStatusEnum.default("active"),
  color: z
    .string()
    .regex(/^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/, "Format warna heksadesimal tidak valid")
    .default("#b45309"),
  note: z.string().optional().nullable(),
});

export const createDebtSchema = debtSchema
  .omit({ id: true, status: true })
  .extend({
    id: z.string().optional(),
    outstandingBalance: z.number().int().min(0).optional(),
  });

export type DebtInput = z.infer<typeof debtSchema>;
export type CreateDebtInput = z.infer<typeof createDebtSchema>;
