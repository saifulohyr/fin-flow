import { describe, it, expect } from "vitest";
import { filterAccountsByType, getTotalBalanceByType, type AccountSummary } from "@/lib/account-utils";

describe("account-utils", () => {
  const sampleAccounts: AccountSummary[] = [
    { id: "1", name: "BCA", type: "bank", balance: 1000000 },
    { id: "2", name: "Mandiri", type: "bank", balance: 2500000 },
    { id: "3", name: "GoPay", type: "ewallet", balance: 150000 },
  ];

  it("filters accounts by type", () => {
    const banks = filterAccountsByType(sampleAccounts, "bank");
    expect(banks).toHaveLength(2);
    expect(banks.map((b) => b.name)).toEqual(["BCA", "Mandiri"]);
  });

  it("calculates total balance by type correctly", () => {
    expect(getTotalBalanceByType(sampleAccounts, "bank")).toBe(3500000);
    expect(getTotalBalanceByType(sampleAccounts, "ewallet")).toBe(150000);
    expect(getTotalBalanceByType(sampleAccounts, "crypto")).toBe(0);
  });
});
