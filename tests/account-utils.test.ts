import { describe, it, expect } from "vitest";
import {
  filterAccountsByType,
  getTotalBalanceByType,
  calculateAssetAllocation,
  type AccountSummary,
} from "@/lib/account-utils";

describe("account-utils", () => {
  const sampleAccounts: AccountSummary[] = [
    { id: "1", name: "BCA", type: "bank", balance: 1000000 },
    { id: "2", name: "Mandiri", type: "Bank", balance: 2500000 },
    { id: "3", name: "GoPay", type: "ewallet", balance: 150000 },
  ];

  it("filters accounts by type case-insensitively", () => {
    const banks = filterAccountsByType(sampleAccounts, "bank");
    expect(banks).toHaveLength(2);
    expect(banks.map((b) => b.name)).toEqual(["BCA", "Mandiri"]);

    const banksUpper = filterAccountsByType(sampleAccounts, "BANK");
    expect(banksUpper).toHaveLength(2);
  });

  it("calculates total balance by type correctly", () => {
    expect(getTotalBalanceByType(sampleAccounts, "bank")).toBe(3500000);
    expect(getTotalBalanceByType(sampleAccounts, "ewallet")).toBe(150000);
    expect(getTotalBalanceByType(sampleAccounts, "crypto")).toBe(0);
  });

  it("computes asset allocation distribution accurately", () => {
    const accounts: AccountSummary[] = [
      { id: "1", name: "BCA", type: "Bank", balance: 8000000 },
      { id: "2", name: "GoPay", type: "E-Wallet", balance: 2000000 },
    ];
    const allocation = calculateAssetAllocation(accounts);
    expect(allocation).toHaveLength(2);

    const bankAlloc = allocation.find((a) => a.type === "Bank");
    expect(bankAlloc).toBeDefined();
    expect(bankAlloc?.totalBalance).toBe(8000000);
    expect(bankAlloc?.percentage).toBe(80);
    expect(bankAlloc?.count).toBe(1);

    const walletAlloc = allocation.find((a) => a.type === "E-Wallet");
    expect(walletAlloc).toBeDefined();
    expect(walletAlloc?.totalBalance).toBe(2000000);
    expect(walletAlloc?.percentage).toBe(20);
    expect(walletAlloc?.count).toBe(1);
  });

  it("handles empty accounts array in asset allocation gracefully", () => {
    const allocation = calculateAssetAllocation([]);
    expect(allocation).toEqual([]);
  });
});
