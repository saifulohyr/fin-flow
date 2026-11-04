import { describe, it, expect } from "vitest";
import {
  calculateGoalProgress,
  calculateMonthsRemaining,
  calculateMonthlySavingsRequired,
  evaluateGoalPacing,
  calculateSavingsGoalsSummary,
} from "@/lib/savings-engine";
import { savingsGoalSchema, SavingsGoalInput } from "@/lib/validations/savings-goal";

describe("Savings Engine & Sinking Funds Calculations", () => {
  describe("calculateGoalProgress", () => {
    it("calculates partial progress correctly", () => {
      const res = calculateGoalProgress(2_500_000, 10_000_000);
      expect(res.percentage).toBe(25);
      expect(res.remainingAmount).toBe(7_500_000);
      expect(res.isCompleted).toBe(false);
    });

    it("handles zero current amount", () => {
      const res = calculateGoalProgress(0, 5_000_000);
      expect(res.percentage).toBe(0);
      expect(res.remainingAmount).toBe(5_000_000);
      expect(res.isCompleted).toBe(false);
    });

    it("handles 100% completion", () => {
      const res = calculateGoalProgress(10_000_000, 10_000_000);
      expect(res.percentage).toBe(100);
      expect(res.remainingAmount).toBe(0);
      expect(res.isCompleted).toBe(true);
    });

    it("clamps overfunded goals to 100% and 0 remaining", () => {
      const res = calculateGoalProgress(12_000_000, 10_000_000);
      expect(res.percentage).toBe(100);
      expect(res.remainingAmount).toBe(0);
      expect(res.isCompleted).toBe(true);
    });

    it("handles non-positive target amount gracefully", () => {
      const res = calculateGoalProgress(100_000, 0);
      expect(res.percentage).toBe(100);
      expect(res.remainingAmount).toBe(0);
      expect(res.isCompleted).toBe(true);
    });
  });

  describe("calculateMonthsRemaining", () => {
    it("calculates positive horizon correctly", () => {
      const months = calculateMonthsRemaining("2027-05-01", "2026-11-01");
      expect(months).toBeGreaterThanOrEqual(6);
      expect(months).toBeLessThanOrEqual(7);
    });

    it("returns 0 for overdue or identical dates", () => {
      expect(calculateMonthsRemaining("2026-10-01", "2026-11-01")).toBe(0);
      expect(calculateMonthsRemaining("2026-11-01", "2026-11-01")).toBe(0);
    });

    it("returns at least 1 month for future date within same month period", () => {
      expect(calculateMonthsRemaining("2026-11-15", "2026-11-01")).toBe(1);
    });
  });

  describe("calculateMonthlySavingsRequired", () => {
    it("returns required monthly amount for active goal", () => {
      // 6_000_000 remaining, ~6 months
      const req = calculateMonthlySavingsRequired(10_000_000, 4_000_000, "2027-05-01", "2026-11-01");
      expect(req).toBeGreaterThan(0);
      expect(req).toBeLessThanOrEqual(1_000_000);
    });

    it("returns 0 if goal is already funded", () => {
      const req = calculateMonthlySavingsRequired(5_000_000, 5_500_000, "2027-01-01", "2026-11-01");
      expect(req).toBe(0);
    });

    it("returns remaining amount if months remaining is 0", () => {
      const req = calculateMonthlySavingsRequired(5_000_000, 2_000_000, "2026-10-01", "2026-11-01");
      expect(req).toBe(3_000_000);
    });
  });

  describe("evaluateGoalPacing", () => {
    const mockGoal: SavingsGoalInput = {
      id: "goal-1",
      name: "Dana Darurat 6 Bulan",
      targetAmount: 12_000_000,
      currentAmount: 6_000_000,
      targetDate: "2027-05-01",
      category: "emergency_fund",
      priority: "high",
      accountId: "acc-1",
      color: "#047857",
      isCompleted: false,
    };

    it("evaluates completed status if goal is complete", () => {
      const completedGoal: SavingsGoalInput = {
        ...mockGoal,
        currentAmount: 12_000_000,
        isCompleted: true,
      };
      const pacing = evaluateGoalPacing(completedGoal, 500_000, "2026-11-01");
      expect(pacing.status).toBe("completed");
      expect(pacing.requiredMonthlySavings).toBe(0);
      expect(pacing.projectedMonthsToComplete).toBe(0);
    });

    it("evaluates ahead status when planned contribution exceeds required by 15%+", () => {
      // remaining: 6m over ~6 months = ~1m required. Planned: 2m.
      const pacing = evaluateGoalPacing(mockGoal, 2_000_000, "2026-11-01");
      expect(pacing.status).toBe("ahead");
      expect(pacing.monthlyShortfallOrSurplus).toBeGreaterThan(0);
      expect(pacing.projectedMonthsToComplete).toBe(3);
    });

    it("evaluates behind status when planned contribution is below required", () => {
      const pacing = evaluateGoalPacing(mockGoal, 200_000, "2026-11-01");
      expect(pacing.status).toBe("behind");
      expect(pacing.monthlyShortfallOrSurplus).toBeLessThan(0);
      expect(pacing.projectedMonthsToComplete).toBe(30);
    });
  });

  describe("calculateSavingsGoalsSummary", () => {
    const goals: SavingsGoalInput[] = [
      {
        id: "goal-1",
        name: "Dana Darurat",
        targetAmount: 10_000_000,
        currentAmount: 5_000_000,
        targetDate: "2027-05-01",
        category: "emergency_fund",
        priority: "high",
        accountId: "acc-1",
        color: "#047857",
        isCompleted: false,
      },
      {
        id: "goal-2",
        name: "Qurban",
        targetAmount: 4_000_000,
        currentAmount: 4_000_000,
        targetDate: "2027-06-01",
        category: "sinking_fund",
        priority: "medium",
        accountId: "acc-2",
        color: "#0284c7",
        isCompleted: true,
      },
    ];

    it("aggregates portfolio targets, current amounts, and category distributions", () => {
      const summary = calculateSavingsGoalsSummary(goals, "2026-11-01");
      expect(summary.totalTargetAmount).toBe(14_000_000);
      expect(summary.totalCurrentAmount).toBe(9_000_000);
      expect(summary.overallProgress).toBe(64.3);
      expect(summary.activeCount).toBe(1);
      expect(summary.completedCount).toBe(1);
      expect(summary.categoryBreakdown.emergency_fund.count).toBe(1);
      expect(summary.categoryBreakdown.sinking_fund.count).toBe(1);
    });

    it("handles empty goals array", () => {
      const summary = calculateSavingsGoalsSummary([], "2026-11-01");
      expect(summary.totalTargetAmount).toBe(0);
      expect(summary.totalCurrentAmount).toBe(0);
      expect(summary.overallProgress).toBe(0);
      expect(summary.activeCount).toBe(0);
      expect(summary.completedCount).toBe(0);
    });
  });

  describe("savingsGoalSchema validation", () => {
    it("validates valid goal payload", () => {
      const parsed = savingsGoalSchema.safeParse({
        id: "sg-1",
        name: "Laptop Baru",
        targetAmount: 15_000_000,
        currentAmount: 2_000_000,
        targetDate: "2027-12-31",
        category: "purchase",
        priority: "medium",
        color: "#10b981",
        isCompleted: false,
      });
      expect(parsed.success).toBe(true);
    });

    it("rejects negative targetAmount or invalid date", () => {
      const parsed = savingsGoalSchema.safeParse({
        id: "sg-1",
        name: "Test",
        targetAmount: -5000,
        targetDate: "31-12-2027",
      });
      expect(parsed.success).toBe(false);
    });
  });
});
