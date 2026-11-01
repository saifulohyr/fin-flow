import { z } from "zod";

export const BudgetPeriodSchema = z.enum(["weekly", "monthly", "yearly"]);

export const BudgetSchema = z.object({
  id: z.string().min(1),
  categoryId: z.string().min(1, "Kategori wajib dipilih"),
  amount: z.number().positive("Target anggaran harus lebih besar dari 0").int(),
  period: BudgetPeriodSchema.default("monthly"),
  startDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Format tanggal mulai harus YYYY-MM-DD"),
  endDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Format tanggal selesai harus YYYY-MM-DD").optional(),
  notifyThreshold: z.number().min(1).max(100).default(80),
});

export type BudgetInput = z.infer<typeof BudgetSchema>;
