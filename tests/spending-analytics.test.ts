import { describe, it, expect } from "vitest";
import { aggregateSpendingByDate } from "@/lib/spending-analytics";

describe("spending-analytics", () => {
  it("aggregates expenses by date properly and ignores income", () => {
    const txs = [
      { date: "2026-11-01", amount: 25000, type: "expense" },
      { date: "2026-11-01", amount: 15000, type: "expense" },
      { date: "2026-11-01", amount: 5000000, type: "income" },
      { date: "2026-11-02", amount: 35000, type: "expense" },
    ];

    const result = aggregateSpendingByDate(txs);
    expect(result).toHaveLength(2);
    expect(result[0]).toEqual({ date: "2026-11-01", total: 40000 });
    expect(result[1]).toEqual({ date: "2026-11-02", total: 35000 });
  });

  it("returns empty array when no expenses exist", () => {
    const txs = [{ date: "2026-11-01", amount: 100000, type: "income" }];
    expect(aggregateSpendingByDate(txs)).toEqual([]);
  });
});
