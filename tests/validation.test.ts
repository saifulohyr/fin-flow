import { describe, it, expect } from "vitest";
import { AccountSchema, TransactionSchema } from "@/lib/validations/transaction";

describe("Account validation schema", () => {
  it("validates valid bank account", () => {
    const valid = AccountSchema.safeParse({
      id: "acc-1",
      name: "BCA Tabungan",
      type: "bank",
      balance: 10000000,
      accountNumber: "1234567890",
      color: "#047857",
    });
    expect(valid.success).toBe(true);
  });

  it("fails on invalid account type", () => {
    const invalid = AccountSchema.safeParse({
      id: "acc-2",
      name: "Dompet",
      type: "crypto_vault",
      balance: 50000,
    });
    expect(invalid.success).toBe(false);
  });
});

describe("Transaction validation schema", () => {
  it("validates standard expense", () => {
    const valid = TransactionSchema.safeParse({
      id: "tx-1",
      amount: 35000,
      type: "expense",
      accountId: "acc-1",
      categoryId: "cat-food",
      date: "2026-10-31",
      note: "Makan siang warteg",
    });
    expect(valid.success).toBe(true);
  });

  it("fails on negative amount", () => {
    const invalid = TransactionSchema.safeParse({
      id: "tx-2",
      amount: -5000,
      type: "expense",
      accountId: "acc-1",
      categoryId: "cat-food",
      date: "2026-10-31",
    });
    expect(invalid.success).toBe(false);
  });

  it("requires toAccountId for transfer transactions", () => {
    const transferWithoutTo = TransactionSchema.safeParse({
      id: "tx-3",
      amount: 100000,
      type: "transfer",
      accountId: "acc-1",
      categoryId: "cat-transfer",
      date: "2026-10-31",
    });
    expect(transferWithoutTo.success).toBe(false);

    const validTransfer = TransactionSchema.safeParse({
      id: "tx-4",
      amount: 100000,
      type: "transfer",
      accountId: "acc-1",
      toAccountId: "acc-2",
      categoryId: "cat-transfer",
      date: "2026-10-31",
    });
    expect(validTransfer.success).toBe(true);
  });
});
