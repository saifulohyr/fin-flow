import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { GET } from "@/app/api/finances/route";

vi.mock("@neondatabase/serverless", () => ({
  neon: vi.fn(),
}));

import { neon } from "@neondatabase/serverless";

describe("GET /api/finances", () => {
  const originalEnv = process.env;

  beforeEach(() => {
    vi.resetModules();
    process.env = { ...originalEnv };
  });

  afterEach(() => {
    process.env = originalEnv;
    vi.clearAllMocks();
  });

  it("returns 500 if DATABASE_URL is not configured", async () => {
    delete process.env.DATABASE_URL;

    const res = await GET();
    const json = await res.json();

    expect(res.status).toBe(500);
    expect(json).toEqual({ error: "DATABASE_URL not configured" });
  });

  it("returns 200 with accounts, categories, and transactions on success", async () => {
    process.env.DATABASE_URL = "postgres://user:pass@localhost:5432/db";

    const mockAccounts = [{ id: "acc-1", name: "BCA", type: "bank", balance: 5000000 }];
    const mockCategories = [{ id: "cat-1", name: "Food", type: "expense" }];
    const mockTransactions = [{ id: "tx-1", amount: 50000, type: "expense", categoryId: "cat-1" }];

    const mockSql = vi.fn()
      .mockResolvedValueOnce(mockAccounts)
      .mockResolvedValueOnce(mockCategories)
      .mockResolvedValueOnce(mockTransactions);

    vi.mocked(neon).mockReturnValue(mockSql as unknown as ReturnType<typeof neon>);

    const res = await GET();
    const json = await res.json();

    expect(res.status).toBe(200);
    expect(json.status).toBe("connected");
    expect(json.database).toBe("Neon Serverless Postgres (SSL)");
    expect(json.data.accounts).toEqual(mockAccounts);
    expect(json.data.categories).toEqual(mockCategories);
    expect(json.data.transactions).toEqual(mockTransactions);
  });

  it("handles SQL query errors gracefully with 500 status", async () => {
    process.env.DATABASE_URL = "postgres://user:pass@localhost:5432/db";

    const mockSql = vi.fn().mockRejectedValue(new Error("Connection terminated unexpectedly"));
    vi.mocked(neon).mockReturnValue(mockSql as unknown as ReturnType<typeof neon>);

    const res = await GET();
    const json = await res.json();

    expect(res.status).toBe(500);
    expect(json.error).toBe("Database query failed");
    expect(json.details).toBe("Connection terminated unexpectedly");
  });
});
