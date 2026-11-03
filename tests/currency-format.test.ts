import { describe, it, expect } from "vitest";
import { formatPercentage } from "@/lib/currency";

describe("formatPercentage", () => {
  it("formats positive percentages with prefix", () => {
    expect(formatPercentage(12.5)).toBe("+12.5%");
    expect(formatPercentage(5)).toBe("+5.0%");
  });

  it("formats negative percentages cleanly", () => {
    expect(formatPercentage(-4.2)).toBe("-4.2%");
  });

  it("formats zero percentage", () => {
    expect(formatPercentage(0)).toBe("0.0%");
  });
});
