import { describe, it, expect } from "vitest";
import {
  calculateNetWorth,
  calculateMonthlyTotals,
  calculateBurnRate,
  calculateRunwayMonths,
  calculateCategoryBreakdown,
  type RawAccount,
  type RawTransaction,
} from "@/lib/finance-engine";
import { parseTransactionNLU } from "@/lib/nlu-parser";
import { formatIDR, parseIDRShorthand } from "@/lib/currency";
import { AccountSchema, TransactionSchema } from "@/lib/validations/transaction";

describe("Finance Engine - Comprehensive Edge Cases", () => {
  it("calculateNetWorth handles empty list and negative balances (liabilities)", () => {
    expect(calculateNetWorth([])).toBe(0);

    const accountsWithDebt: RawAccount[] = [
      { id: "1", name: "BCA Tabungan", type: "bank", balance: 10_000_000 },
      { id: "2", name: "Paylater", type: "bank", balance: -2_500_000 },
      { id: "3", name: "Tunai", type: "cash", balance: 500_000 },
    ];
    expect(calculateNetWorth(accountsWithDebt)).toBe(8_000_000);
  });

  it("calculateMonthlyTotals excludes transfer transactions from income and expense", () => {
    const transactions: RawTransaction[] = [
      { id: "t1", amount: 5_000_000, type: "income", categoryId: "gaji", date: "2026-10-01" },
      { id: "t2", amount: 1_000_000, type: "expense", categoryId: "makan", date: "2026-10-05" },
      { id: "t3", amount: 2_000_000, type: "transfer", categoryId: "transfer", date: "2026-10-06" },
    ];
    const totals = calculateMonthlyTotals(transactions, "2026-10");
    expect(totals.income).toBe(5_000_000);
    expect(totals.expense).toBe(1_000_000);
    expect(totals.netCashflow).toBe(4_000_000);
    expect(totals.savingsRate).toBe(80);
  });

  it("calculateMonthlyTotals clamps negative savings rate to 0% during deficit", () => {
    const deficitTx: RawTransaction[] = [
      { id: "t1", amount: 1_000_000, type: "income", categoryId: "gaji", date: "2026-10-01" },
      { id: "t2", amount: 3_000_000, type: "expense", categoryId: "sewa", date: "2026-10-02" },
    ];
    const totals = calculateMonthlyTotals(deficitTx, "2026-10");
    expect(totals.netCashflow).toBe(-2_000_000);
    expect(totals.savingsRate).toBe(0);
  });

  it("calculateMonthlyTotals returns 0 for month without transactions", () => {
    const tx: RawTransaction[] = [
      { id: "t1", amount: 1_000_000, type: "income", categoryId: "gaji", date: "2026-10-01" },
    ];
    const totals = calculateMonthlyTotals(tx, "2026-11");
    expect(totals).toEqual({
      income: 0,
      expense: 0,
      netCashflow: 0,
      savingsRate: 0,
    });
  });

  it("calculateBurnRate handles non-positive days safely", () => {
    expect(calculateBurnRate(500_000, -5)).toBe(0);
    expect(calculateBurnRate(500_000, 0)).toBe(0);
    expect(calculateBurnRate(100_000, 3)).toBe(33333);
  });

  it("calculateRunwayMonths handles zero and negative boundaries correctly", () => {
    expect(calculateRunwayMonths(10_000_000, 0)).toBe(999);
    expect(calculateRunwayMonths(10_000_000, -100)).toBe(999);
    expect(calculateRunwayMonths(0, 5_000_000)).toBe(0);
    expect(calculateRunwayMonths(-500_000, 5_000_000)).toBe(0);
    expect(calculateRunwayMonths(5_000_000, 2_000_000)).toBe(2.5);
  });

  it("calculateCategoryBreakdown returns empty array when no expenses exist", () => {
    const tx: RawTransaction[] = [
      { id: "t1", amount: 5_000_000, type: "income", categoryId: "gaji", date: "2026-10-01" },
      { id: "t2", amount: 1_000_000, type: "transfer", categoryId: "transfer", date: "2026-10-02" },
    ];
    expect(calculateCategoryBreakdown(tx, "2026-10")).toEqual([]);
    expect(calculateCategoryBreakdown([], "2026-10")).toEqual([]);
  });
});

describe("NLU Quick Input Parser - Edge Cases & Extended Vocab", () => {
  it("identifies bank accounts correctly across aliases", () => {
    const aliases: Record<string, string> = {
      mandiri: "Bank Mandiri",
      bri: "Bank BRI",
      jago: "Bank Jago",
      ovo: "OVO",
      dana: "DANA",
      shopeepay: "ShopeePay",
      tunai: "Tunai / Cash",
    };

    for (const [alias, expectedName] of Object.entries(aliases)) {
      const parsed = parseTransactionNLU(`beli sate 25k ${alias}`);
      expect(parsed.account).toBe(expectedName);
      expect(parsed.amount).toBe(25000);
      expect(parsed.type).toBe("expense");
    }
  });

  it("detects utility keywords and classifies under Tagihan & Utilitas", () => {
    const plnTx = parseTransactionNLU("token listrik pln 200rb bca");
    expect(plnTx.category).toBe("Tagihan & Utilitas");
    expect(plnTx.amount).toBe(200000);
    expect(plnTx.account).toBe("BCA Tabungan");
    expect(plnTx.type).toBe("expense");

    const wifiTx = parseTransactionNLU("bayar wifi indihome 380rb mandiri");
    expect(wifiTx.category).toBe("Tagihan & Utilitas");
    expect(wifiTx.amount).toBe(380000);
    expect(wifiTx.account).toBe("Bank Mandiri");
  });

  it("detects freelance and bonus income keywords correctly", () => {
    const freelance = parseTransactionNLU("proyek website freelance 4.5jt jago");
    expect(freelance.type).toBe("income");
    expect(freelance.category).toBe("Freelance");
    expect(freelance.amount).toBe(4500000);
    expect(freelance.account).toBe("Bank Jago");

    const bonus = parseTransactionNLU("bonus akhir tahun 10jt bca");
    expect(bonus.type).toBe("income");
    expect(bonus.category).toBe("Bonus & Hadiah");
    expect(bonus.amount).toBe(10000000);
  });

  it("falls back to default title when only keyword tokens are supplied", () => {
    const res = parseTransactionNLU("gaji 10jt bca");
    expect(res.amount).toBe(10000000);
    expect(res.account).toBe("BCA Tabungan");
    expect(res.category).toBe("Gaji & Upah");
    expect(res.type).toBe("income");
    expect(res.title).toBe("gaji");
  });

  it("handles uppercase inputs and multiple redundant spaces", () => {
    const res = parseTransactionNLU("   MAKAN   SIANG   PADANG   35RB   GOPAY   ");
    expect(res.amount).toBe(35000);
    expect(res.account).toBe("GoPay");
    expect(res.category).toBe("Makanan & Minuman");
    expect(res.type).toBe("expense");
  });

  it("handles inputs without any numerical amount", () => {
    const res = parseTransactionNLU("makan siang padang gopay");
    expect(res.amount).toBeNull();
    expect(res.account).toBe("GoPay");
    expect(res.category).toBe("Makanan & Minuman");
    expect(res.title).toBe("makan siang padang");
  });
});

describe("Currency Utilities - Shorthand and formatting edge cases", () => {
  it("parses billion units (m, miliar)", () => {
    expect(parseIDRShorthand("1m")).toBe(1_000_000_000);
    expect(parseIDRShorthand("2.5m")).toBe(2_500_000_000);
    expect(parseIDRShorthand("3miliar")).toBe(3_000_000_000);
  });

  it("parses zero amount correctly", () => {
    expect(parseIDRShorthand("0")).toBe(0);
    expect(parseIDRShorthand("0k")).toBe(0);
    expect(parseIDRShorthand("0jt")).toBe(0);
  });

  it("handles comma decimal notations for fractional numbers", () => {
    expect(parseIDRShorthand("1,5jt")).toBe(1_500_000);
    expect(parseIDRShorthand("22,5k")).toBe(22_500);
  });

  it("returns null for malformed multipliers and non-numeric strings", () => {
    expect(parseIDRShorthand("jt")).toBeNull();
    expect(parseIDRShorthand("k")).toBeNull();
    expect(parseIDRShorthand("abc100k")).toBeNull();
    expect(parseIDRShorthand("100xyz")).toBeNull();
    expect(parseIDRShorthand("$100")).toBeNull();
  });

  it("formats 0 and negative amounts cleanly with formatIDR", () => {
    const zero = formatIDR(0);
    expect(zero).toContain("0");

    const negative = formatIDR(-50000);
    expect(negative).toContain("50.000");
  });
});

describe("Zod Validation Schemas - Boundary edge cases", () => {
  it("enforces account name length boundaries (2 to 50 chars)", () => {
    // 1 char -> invalid
    const tooShort = AccountSchema.safeParse({
      id: "acc-min",
      name: "A",
      type: "cash",
      balance: 1000,
    });
    expect(tooShort.success).toBe(false);

    // 2 chars -> valid
    const validMin = AccountSchema.safeParse({
      id: "acc-min",
      name: "AB",
      type: "cash",
      balance: 1000,
    });
    expect(validMin.success).toBe(true);

    // 50 chars -> valid
    const valid50 = AccountSchema.safeParse({
      id: "acc-50",
      name: "a".repeat(50),
      type: "bank",
      balance: 1000,
    });
    expect(valid50.success).toBe(true);

    // 51 chars -> invalid
    const invalid51 = AccountSchema.safeParse({
      id: "acc-51",
      name: "a".repeat(51),
      type: "bank",
      balance: 1000,
    });
    expect(invalid51.success).toBe(false);
  });

  it("enforces 6-digit hex color format", () => {
    const validHex = AccountSchema.safeParse({
      id: "acc-hex-1",
      name: "Kas",
      type: "cash",
      balance: 1000,
      color: "#10b981",
    });
    expect(validHex.success).toBe(true);

    const invalid3Hex = AccountSchema.safeParse({
      id: "acc-hex-2",
      name: "Kas",
      type: "cash",
      balance: 1000,
      color: "#fff",
    });
    expect(invalid3Hex.success).toBe(false);

    const invalidWord = AccountSchema.safeParse({
      id: "acc-hex-3",
      name: "Kas",
      type: "cash",
      balance: 1000,
      color: "green",
    });
    expect(invalidWord.success).toBe(false);
  });

  it("rejects non-integer balances and amounts", () => {
    const floatBalance = AccountSchema.safeParse({
      id: "acc-float",
      name: "Kas Kecil",
      type: "cash",
      balance: 10500.75,
    });
    expect(floatBalance.success).toBe(false);

    const floatTx = TransactionSchema.safeParse({
      id: "tx-float",
      amount: 15000.25,
      type: "expense",
      accountId: "acc-1",
      categoryId: "cat-1",
      date: "2026-10-31",
    });
    expect(floatTx.success).toBe(false);
  });

  it("accepts both YYYY-MM-DD and ISO 8601 datetime strings", () => {
    const ymd = TransactionSchema.safeParse({
      id: "tx-ymd",
      amount: 50000,
      type: "expense",
      accountId: "acc-1",
      categoryId: "cat-1",
      date: "2026-10-31",
    });
    expect(ymd.success).toBe(true);

    const iso = TransactionSchema.safeParse({
      id: "tx-iso",
      amount: 50000,
      type: "expense",
      accountId: "acc-1",
      categoryId: "cat-1",
      date: "2026-10-31T14:30:00.000Z",
    });
    expect(iso.success).toBe(true);

    const invalidDate = TransactionSchema.safeParse({
      id: "tx-invalid-date",
      amount: 50000,
      type: "expense",
      accountId: "acc-1",
      categoryId: "cat-1",
      date: "31-10-2026",
    });
    expect(invalidDate.success).toBe(false);
  });

  it("enforces note max length of 255 chars", () => {
    const validNote = TransactionSchema.safeParse({
      id: "tx-note-ok",
      amount: 10000,
      type: "expense",
      accountId: "acc-1",
      categoryId: "cat-1",
      date: "2026-10-31",
      note: "x".repeat(255),
    });
    expect(validNote.success).toBe(true);

    const tooLongNote = TransactionSchema.safeParse({
      id: "tx-note-too-long",
      amount: 10000,
      type: "expense",
      accountId: "acc-1",
      categoryId: "cat-1",
      date: "2026-10-31",
      note: "x".repeat(256),
    });
    expect(tooLongNote.success).toBe(false);
  });
});
