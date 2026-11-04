import { z } from "zod";

export const goalCategoryEnum = z.enum([
  "emergency_fund",
  "sinking_fund",
  "investment",
  "purchase",
  "education",
  "other",
]);

export const goalPriorityEnum = z.enum(["low", "medium", "high"]);

export type GoalCategory = z.infer<typeof goalCategoryEnum>;
export type GoalPriority = z.infer<typeof goalPriorityEnum>;

export const savingsGoalSchema = z.object({
  id: z.string().min(1, "ID target tabungan wajib diisi"),
  name: z.string().min(1, "Nama target tabungan wajib diisi"),
  targetAmount: z.number().int().positive("Target nominal harus berupa angka bulat positif"),
  currentAmount: z.number().int().min(0, "Nominal terkumpul tidak boleh negatif").default(0),
  targetDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Format tanggal target harus YYYY-MM-DD"),
  category: goalCategoryEnum.default("sinking_fund"),
  priority: goalPriorityEnum.default("medium"),
  accountId: z.string().optional().nullable(),
  color: z.string().regex(/^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/, "Format warna heksadesimal tidak valid").default("#047857"),
  isCompleted: z.boolean().default(false),
});

export const createSavingsGoalSchema = savingsGoalSchema.omit({
  id: true,
  isCompleted: true,
}).extend({
  id: z.string().optional(),
  currentAmount: z.number().int().min(0).default(0),
});

export type SavingsGoalInput = z.infer<typeof savingsGoalSchema>;
export type CreateSavingsGoalInput = z.infer<typeof createSavingsGoalSchema>;
