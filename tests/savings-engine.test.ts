import { describe, it, expect } from "vitest";
import {
  calculateGoalProgress,
  calculateMonthsRemaining,
  calculateMonthlySavingsRequired,
  evaluateGoalPacing,
  calculateSavingsGoalsSummary,
  applyGoalContribution,
  calculateGoalMilestones,
  allocateSavingsCapacity,
  generateSinkingFundSchedule,
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

  describe("applyGoalContribution", () => {
    const baseGoal: SavingsGoalInput = {
      id: "goal-contrib-1",
      name: "Pajak Mobil Tahunan",
      targetAmount: 3_000_000,
      currentAmount: 1_000_000,
      targetDate: "2027-03-01",
      category: "sinking_fund",
      priority: "high",
      accountId: "acc-bca",
      color: "#047857",
      isCompleted: false,
    };

    it("processes deposit contribution without completing", () => {
      const res = applyGoalContribution(baseGoal, 500_000, "deposit");
      expect(res.delta).toBe(500_000);
      expect(res.previousAmount).toBe(1_000_000);
      expect(res.newAmount).toBe(1_500_000);
      expect(res.isNewlyCompleted).toBe(false);
      expect(res.updatedGoal.isCompleted).toBe(false);
    });

    it("marks goal newly completed when deposit reaches target", () => {
      const res = applyGoalContribution(baseGoal, 2_000_000, "deposit");
      expect(res.newAmount).toBe(3_000_000);
      expect(res.isNewlyCompleted).toBe(true);
      expect(res.updatedGoal.isCompleted).toBe(true);
    });

    it("processes withdrawal and keeps within bounds", () => {
      const res = applyGoalContribution(baseGoal, 400_000, "withdraw");
      expect(res.delta).toBe(-400_000);
      expect(res.newAmount).toBe(600_000);
      expect(res.isNewlyCompleted).toBe(false);
    });

    it("clamps excessive withdrawal at 0", () => {
      const res = applyGoalContribution(baseGoal, 5_000_000, "withdraw");
      expect(res.newAmount).toBe(0);
      expect(res.delta).toBe(-1_000_000);
    });

    it("re-opens completed goal if withdrawal drops below target", () => {
      const completedGoal = { ...baseGoal, currentAmount: 3_000_000, isCompleted: true };
      const res = applyGoalContribution(completedGoal, 500_000, "withdraw");
      expect(res.newAmount).toBe(2_500_000);
      expect(res.updatedGoal.isCompleted).toBe(false);
      expect(res.isNewlyCompleted).toBe(false);
    });

    it("throws error when contribution amount is non-positive or NaN", () => {
      expect(() => applyGoalContribution(baseGoal, 0)).toThrow();
      expect(() => applyGoalContribution(baseGoal, -100_000)).toThrow();
      expect(() => applyGoalContribution(baseGoal, NaN)).toThrow();
    });
  });

  describe("calculateGoalMilestones", () => {
    it("computes 25%, 50%, 75%, 100% milestone checkpoints", () => {
      const goal: SavingsGoalInput = {
        id: "goal-m",
        name: "Tabungan Qurban",
        targetAmount: 4_000_000,
        currentAmount: 2_500_000, // 62.5%
        targetDate: "2027-06-01",
        category: "sinking_fund",
        priority: "medium",
        accountId: "acc-1",
        color: "#0284c7",
        isCompleted: false,
      };

      const milestones = calculateGoalMilestones(goal);
      expect(milestones).toHaveLength(4);
      expect(milestones[0]).toEqual({ percentage: 25, targetAmountAtMilestone: 1_000_000, isReached: true });
      expect(milestones[1]).toEqual({ percentage: 50, targetAmountAtMilestone: 2_000_000, isReached: true });
      expect(milestones[2]).toEqual({ percentage: 75, targetAmountAtMilestone: 3_000_000, isReached: false });
      expect(milestones[3]).toEqual({ percentage: 100, targetAmountAtMilestone: 4_000_000, isReached: false });
    });
  });

  describe("allocateSavingsCapacity", () => {
    const goals: SavingsGoalInput[] = [
      {
        id: "g-emergency",
        name: "Dana Darurat",
        targetAmount: 12_000_000,
        currentAmount: 6_000_000,
        targetDate: "2027-05-01", // ~6 months -> ~1.000.000 / mo
        category: "emergency_fund",
        priority: "high",
        accountId: "acc-1",
        color: "#047857",
        isCompleted: false,
      },
      {
        id: "g-qurban",
        name: "Kurban Idul Adha",
        targetAmount: 3_000_000,
        currentAmount: 1_000_000,
        targetDate: "2027-06-01", // ~7 months -> ~285.714 / mo
        category: "sinking_fund",
        priority: "medium",
        accountId: "acc-2",
        color: "#0284c7",
        isCompleted: false,
      },
      {
        id: "g-done",
        name: "Liburan",
        targetAmount: 2_000_000,
        currentAmount: 2_000_000,
        targetDate: "2026-12-01",
        category: "purchase",
        priority: "low",
        accountId: "acc-3",
        color: "#d97706",
        isCompleted: true,
      },
    ];

    it("allocates under urgency_priority strategy respecting priority ordering", () => {
      // Capacity 800,000 is less than emergency requirement (~1.000.000).
      // Emergency (high) should take full 800,000, Qurban gets 0.
      const res = allocateSavingsCapacity(goals, 800_000, "2026-11-01", "urgency_priority");
      expect(res.totalAllocated).toBe(800_000);
      expect(res.unallocatedRemainder).toBe(0);

      const emAlloc = res.allocations.find((a) => a.goalId === "g-emergency");
      const qurbanAlloc = res.allocations.find((a) => a.goalId === "g-qurban");

      expect(emAlloc?.allocatedAmount).toBe(800_000);
      expect(qurbanAlloc?.allocatedAmount).toBe(0);
    });

    it("distributes surplus to remaining goals when capacity exceeds monthly required", () => {
      // Total monthly required: ~1.000.000 + ~285.715 = ~1.285.715
      // Capacity 2.000.000 -> full requirement satisfied, remainder overflows to highest priority
      const res = allocateSavingsCapacity(goals, 2_000_000, "2026-11-01", "urgency_priority");
      expect(res.totalAllocated).toBe(2_000_000);

      const emAlloc = res.allocations.find((a) => a.goalId === "g-emergency");
      const qurbanAlloc = res.allocations.find((a) => a.goalId === "g-qurban");

      expect(emAlloc?.fulfillmentRate).toBeGreaterThanOrEqual(100);
      expect(qurbanAlloc?.fulfillmentRate).toBeGreaterThanOrEqual(100);
    });

    it("allocates proportionally across active goals under proportional strategy", () => {
      const res = allocateSavingsCapacity(goals, 1_000_000, "2026-11-01", "proportional");
      expect(res.totalAllocated).toBe(1_000_000);

      const emAlloc = res.allocations.find((a) => a.goalId === "g-emergency");
      const qurbanAlloc = res.allocations.find((a) => a.goalId === "g-qurban");

      expect(emAlloc?.allocatedAmount).toBeGreaterThan(0);
      expect(qurbanAlloc?.allocatedAmount).toBeGreaterThan(0);
      // Emergency has higher monthly need, so gets higher share
      expect(emAlloc!.allocatedAmount).toBeGreaterThan(qurbanAlloc!.allocatedAmount);
    });

    it("handles zero available capacity cleanly", () => {
      const res = allocateSavingsCapacity(goals, 0, "2026-11-01");
      expect(res.totalAllocated).toBe(0);
      expect(res.unallocatedRemainder).toBe(0);
      expect(res.allocations.every((a) => a.allocatedAmount === 0)).toBe(true);
    });

    it("handles scenario where all goals are completed", () => {
      const doneGoals = [goals[2]];
      const res = allocateSavingsCapacity(doneGoals, 500_000, "2026-11-01");
      expect(res.totalAllocated).toBe(0);
      expect(res.unallocatedRemainder).toBe(500_000);
      expect(res.allocations).toHaveLength(0);
    });
  });

  describe("generateSinkingFundSchedule", () => {
    const goals: SavingsGoalInput[] = [
      {
        id: "sf-1",
        name: "Pajak Motor",
        targetAmount: 500_000,
        currentAmount: 200_000,
        targetDate: "2026-12-15",
        category: "sinking_fund",
        priority: "high",
        accountId: "acc-1",
        color: "#047857",
        isCompleted: false,
      },
      {
        id: "sf-2",
        name: "Kurban Kambing",
        targetAmount: 3_500_000,
        currentAmount: 1_000_000,
        targetDate: "2027-06-01",
        category: "sinking_fund",
        priority: "medium",
        accountId: "acc-1",
        color: "#0284c7",
        isCompleted: false,
      },
    ];

    it("generates monthly timeline and detects maturing sinking funds", () => {
      const res = generateSinkingFundSchedule(goals, "2026-11-01", 12);
      expect(res.horizonMonths).toBe(12);
      expect(res.schedule).toHaveLength(12);

      const dec2026 = res.schedule.find((s) => s.month === "2026-12");
      expect(dec2026?.maturingGoals).toHaveLength(1);
      expect(dec2026?.maturingGoals[0].name).toBe("Pajak Motor");
      expect(dec2026?.totalMaturingAmount).toBe(500_000);

      const jun2027 = res.schedule.find((s) => s.month === "2027-06");
      expect(jun2027?.maturingGoals).toHaveLength(1);
      expect(jun2027?.totalMaturingAmount).toBe(3_500_000);

      // Jun 2027 is peak month with 3,500,000
      expect(res.peakMonth).toBe("2027-06");
      expect(res.highestMaturingAmount).toBe(3_500_000);
      expect(jun2027?.isPeakMonth).toBe(true);
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
