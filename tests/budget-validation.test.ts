import { describe, it, expect } from "vitest";
import { BudgetSchema } from "@/lib/validations/budget";

describe("Budget validation schema", () => {
  it("validates valid monthly budget", () => {
    const valid = BudgetSchema.safeParse({
      id: "bgt-1",
      categoryId: "cat-groceries",
      amount: 1500000,
      period: "monthly",
      startDate: "2026-11-01",
      notifyThreshold: 80,
    });
    expect(valid.success).toBe(true);
  });

  it("fails on zero or negative budget amount", () => {
    const invalid = BudgetSchema.safeParse({
      id: "bgt-2",
      categoryId: "cat-groceries",
      amount: 0,
      period: "monthly",
      startDate: "2026-11-01",
    });
    expect(invalid.success).toBe(false);
  });

  it("fails on invalid date format", () => {
    const invalid = BudgetSchema.safeParse({
      id: "bgt-3",
      categoryId: "cat-groceries",
      amount: 500000,
      period: "monthly",
      startDate: "01-11-2026",
    });
    expect(invalid.success).toBe(false);
  });

  it("fails on invalid notifyThreshold", () => {
    const invalid = BudgetSchema.safeParse({
      id: "bgt-4",
      categoryId: "cat-groceries",
      amount: 500000,
      period: "monthly",
      startDate: "2026-11-01",
      notifyThreshold: 150,
    });
    expect(invalid.success).toBe(false);
  });
});
