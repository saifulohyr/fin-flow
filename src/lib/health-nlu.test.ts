import { describe, it, expect } from "vitest";
import { extractHealthFieldsFromText, buildHealthInputFromChat } from "./health-nlu";

describe("extractHealthFieldsFromText", () => {
  it("extracts salary and expenses from Indonesian sentence", () => {
    const text = "gaji bulanan 10jt, pengeluaran 7jt, tabungan 30jt";
    const { extracted, partial, confidence } = extractHealthFieldsFromText(text);

    expect(partial.monthlyIncome).toBe(10_000_000);
    expect(partial.monthlyExpenses).toBe(7_000_000);
    expect(partial.liquidAssets).toBe(30_000_000);
    expect(confidence).toBeGreaterThan(0);
  });

  it("extracts debt and cicilan values", () => {
    const { partial } = extractHealthFieldsFromText("utang total 50jt cicilan bulanan 2jt");
    expect(partial.totalDebt).toBe(50_000_000);
    expect(partial.monthlyDebtPayment).toBe(2_000_000);
  });

  it("returns empty extracted array for unrecognizable text", () => {
    const { extracted, confidence } = extractHealthFieldsFromText("hari ini cuaca cerah");
    expect(extracted).toHaveLength(0);
    expect(confidence).toBe(0);
  });
});

describe("buildHealthInputFromChat", () => {
  it("merges extracted fields with existing partial input", () => {
    const existing = { liquidAssets: 20_000_000, totalDebt: 5_000_000 };
    const { input, fieldsFound } = buildHealthInputFromChat(
      "gaji 8jt pengeluaran 6jt",
      existing
    );

    expect(input.monthlyIncome).toBe(8_000_000);
    expect(input.monthlyExpenses).toBe(6_000_000);
    expect(input.liquidAssets).toBe(20_000_000); // from existing
    expect(input.totalDebt).toBe(5_000_000);     // from existing
    expect(fieldsFound).toBeGreaterThanOrEqual(2);
  });

  it("produces valid zero-default input for empty text", () => {
    const { input } = buildHealthInputFromChat("");
    expect(input.monthlyIncome).toBe(0);
    expect(input.liquidAssets).toBe(0);
    expect(input.totalDebt).toBe(0);
  });
});
