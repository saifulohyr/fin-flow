import { describe, it, expect } from "vitest";
import { accounts, categories, transactions } from "@/db/schema";
import { getTableColumns } from "drizzle-orm";

describe("Database schema definitions", () => {
  it("defines accounts table columns correctly", () => {
    const cols = getTableColumns(accounts);
    expect(cols.id).toBeDefined();
    expect(cols.name).toBeDefined();
    expect(cols.balance).toBeDefined();
    expect(cols.type).toBeDefined();
  });

  it("defines categories table columns correctly", () => {
    const cols = getTableColumns(categories);
    expect(cols.id).toBeDefined();
    expect(cols.name).toBeDefined();
    expect(cols.type).toBeDefined();
  });

  it("defines transactions table columns with relations", () => {
    const cols = getTableColumns(transactions);
    expect(cols.id).toBeDefined();
    expect(cols.amount).toBeDefined();
    expect(cols.accountId).toBeDefined();
    expect(cols.categoryId).toBeDefined();
  });
});
