import { z } from "zod";

export const recurringFrequencyEnum = z.enum(["daily", "weekly", "monthly", "yearly"]);
export type RecurringFrequency = z.infer<typeof recurringFrequencyEnum>;

export const recurringTransactionSchema = z.object({
  id: z.string().min(1, "ID wajib diisi"),
  title: z.string().min(1, "Judul pengeluaran rutin wajib diisi"),
  amount: z.number().int().positive("Nominal harus berupa angka positif"),
  categoryId: z.string().min(1, "Kategori wajib dipilih"),
  accountId: z.string().min(1, "Rekening sumber wajib dipilih"),
  frequency: recurringFrequencyEnum,
  startDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Format tanggal mulai harus YYYY-MM-DD"),
  nextDueDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Format tanggal jatuh tempo harus YYYY-MM-DD"),
  isActive: z.boolean().default(true),
  autoDeduct: z.boolean().default(false),
});

export type RecurringTransactionInput = z.infer<typeof recurringTransactionSchema>;
