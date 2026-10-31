import { z } from "zod";

export const AccountTypeSchema = z.enum(["bank", "ewallet", "cash", "investment"]);

export const AccountSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(2, "Nama akun minimal 2 karakter").max(50),
  type: AccountTypeSchema,
  balance: z.number().int("Saldo harus bilangan bulat"),
  accountNumber: z.string().optional(),
  color: z.string().regex(/^#[0-9a-fA-F]{6}$/, "Format hex color tidak valid").default("#047857"),
});

export const TransactionTypeSchema = z.enum(["income", "expense", "transfer"]);

export const TransactionSchema = z.object({
  id: z.string().min(1),
  amount: z.number().positive("Nominal harus lebih besar dari 0").int(),
  type: TransactionTypeSchema,
  accountId: z.string().min(1, "Akun wajib dipilih"),
  toAccountId: z.string().optional(),
  categoryId: z.string().min(1, "Kategori wajib dipilih"),
  note: z.string().max(255).optional(),
  date: z.string().datetime().or(z.string().regex(/^\d{4}-\d{2}-\d{2}$/)),
}).refine(
  (data) => {
    if (data.type === "transfer" && !data.toAccountId) {
      return false;
    }
    return true;
  },
  {
    message: "Transfer membutuhkan rekening tujuan (toAccountId)",
    path: ["toAccountId"],
  }
);

export type AccountInput = z.infer<typeof AccountSchema>;
export type TransactionInput = z.infer<typeof TransactionSchema>;
