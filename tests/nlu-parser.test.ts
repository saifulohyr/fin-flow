import { describe, it, expect } from "vitest";
import { parseTransactionNLU } from "@/lib/nlu-parser";

describe("NLU Quick Input Parser", () => {
  it("parses expense with shorthand and account", () => {
    const res = parseTransactionNLU("kopi kenangan 22rb gopay");
    expect(res.amount).toBe(22000);
    expect(res.account).toBe("GoPay");
    expect(res.category).toBe("Makanan & Minuman");
    expect(res.type).toBe("expense");
    expect(res.title).toBe("kopi kenangan");
  });

  it("parses salary income with account", () => {
    const res = parseTransactionNLU("gaji bulanan kantor 8.5jt bca");
    expect(res.amount).toBe(8500000);
    expect(res.account).toBe("BCA Tabungan");
    expect(res.category).toBe("Gaji & Upah");
    expect(res.type).toBe("income");
    expect(res.title).toBe("gaji bulanan kantor");
  });

  it("parses transport expense defaults to cash if no account specified", () => {
    const res = parseTransactionNLU("bensin pertamax 100k");
    expect(res.amount).toBe(100000);
    expect(res.account).toBe("Tunai / Cash");
    expect(res.category).toBe("Transportasi");
    expect(res.type).toBe("expense");
  });

  it("handles empty or whitespace strings gracefully", () => {
    const res = parseTransactionNLU("   ");
    expect(res.amount).toBeNull();
    expect(res.title).toBe("");
  });
});
