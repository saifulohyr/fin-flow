import { describe, it, expect } from "vitest";
import { formatIDR, parseIDRShorthand } from "@/lib/currency";

describe("currency utilities", () => {
  it("formats IDR values correctly", () => {
    const formatted = formatIDR(150000);
    expect(formatted).toContain("150.000");
  });

  it("parses plain numbers", () => {
    expect(parseIDRShorthand("50000")).toBe(50000);
    expect(parseIDRShorthand(" 12000 ")).toBe(12000);
  });

  it("parses shorthand thousand (k, rb, ribu)", () => {
    expect(parseIDRShorthand("35k")).toBe(35000);
    expect(parseIDRShorthand("35rb")).toBe(35000);
    expect(parseIDRShorthand("75ribu")).toBe(75000);
    expect(parseIDRShorthand("2.5rb")).toBe(2500);
  });

  it("parses shorthand million (jt, juta)", () => {
    expect(parseIDRShorthand("1.5jt")).toBe(1500000);
    expect(parseIDRShorthand("2,5jt")).toBe(2500000);
    expect(parseIDRShorthand("10juta")).toBe(10000000);
  });

  it("returns null on invalid input", () => {
    expect(parseIDRShorthand("makan siang")).toBeNull();
    expect(parseIDRShorthand("")).toBeNull();
  });
});
