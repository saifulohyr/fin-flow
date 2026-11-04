/* eslint-disable @typescript-eslint/no-explicit-any */
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
import {
  validateSavingsGoalAction,
  validateCreateSavingsGoalAction,
  recordGoalContributionAction,
  getSavingsPacingAction,
  getSavingsSummaryAction,
  allocateSavingsAction,
  getSinkingFundScheduleAction,
  getGoalMilestonesAction,
} from "@/actions/savings";
import { SavingsGoalInput, savingsGoalSchema } from "@/lib/validations/savings-goal";

describe("Savings & Sinking Funds - Edge Cases & Boundary Conditions", () => {
  describe("calculateGoalProgress - Boundaries & Clamping", () => {
    it("handles negative current amount by clamping to zero", () => {
      const res = calculateGoalProgress(-500_000, 2_000_000);
      expect(res.percentage).toBe(0);
      expect(res.remainingAmount).toBe(2_000_000);
      expect(res.isCompleted).toBe(false);
    });

    it("handles negative target amount as completed", () => {
      const res = calculateGoalProgress(100_000, -1_000_000);
      expect(res.percentage).toBe(100);
      expect(res.remainingAmount).toBe(0);
      expect(res.isCompleted).toBe(true);
    });

    it("formats percentage with 1 decimal precision", () => {
      // 1 / 3 = 33.333...% -> 33.3%
      const res = calculateGoalProgress(1_000_000, 3_000_000);
      expect(res.percentage).toBe(33.3);
      expect(res.remainingAmount).toBe(2_000_000);

      // 2 / 3 = 66.666...% -> 66.7%
      const res2 = calculateGoalProgress(2_000_000, 3_000_000);
      expect(res2.percentage).toBe(66.7);
      expect(res2.remainingAmount).toBe(1_000_000);
    });

    it("handles targetAmount equal to currentAmount exactly at edge", () => {
      const res = calculateGoalProgress(10_000_000, 10_000_000);
      expect(res.percentage).toBe(100);
      expect(res.remainingAmount).toBe(0);
      expect(res.isCompleted).toBe(true);
    });

    it("clamps percentage to 100 when currentAmount exceeds targetAmount", () => {
      const res = calculateGoalProgress(15_000_000, 10_000_000);
      expect(res.percentage).toBe(100);
      expect(res.remainingAmount).toBe(0);
      expect(res.isCompleted).toBe(true);
    });
  });

  describe("calculateMonthsRemaining - Horizon Limits & Month Edges", () => {
    it("returns 0 when targetDate is in the past", () => {
      expect(calculateMonthsRemaining("2026-01-01", "2026-11-04")).toBe(0);
      expect(calculateMonthsRemaining("2025-12-31", "2026-11-04")).toBe(0);
    });

    it("returns 0 when targetDate is identical to referenceDate", () => {
      expect(calculateMonthsRemaining("2026-11-04", "2026-11-04")).toBe(0);
    });

    it("returns 1 month for diff within 30 days", () => {
      expect(calculateMonthsRemaining("2026-11-05", "2026-11-04")).toBe(1);
      expect(calculateMonthsRemaining("2026-12-04", "2026-11-04")).toBe(1);
    });

    it("calculates multi-year horizons accurately", () => {
      // 365 days / 30 ~ 13 months
      const months = calculateMonthsRemaining("2027-11-04", "2026-11-04");
      expect(months).toBe(13);
    });
  });

  describe("calculateMonthlySavingsRequired - Edge Cases", () => {
    it("returns 0 when goal is already 100% funded", () => {
      expect(calculateMonthlySavingsRequired(5_000_000, 5_000_000, "2027-01-01", "2026-11-01")).toBe(0);
      expect(calculateMonthlySavingsRequired(5_000_000, 6_000_000, "2027-01-01", "2026-11-01")).toBe(0);
    });

    it("returns remainingAmount in full when target date is already reached or past", () => {
      // Due today or yesterday: need the full balance immediately
      const req = calculateMonthlySavingsRequired(10_000_000, 4_000_000, "2026-10-01", "2026-11-01");
      expect(req).toBe(6_000_000);
    });

    it("rounds up to ceiling for indivisible amounts", () => {
      // 10,000,000 remaining over 3 months -> 3,333,333.33 -> 3,333,334
      const monthsRemaining = calculateMonthsRemaining("2027-02-01", "2026-11-01"); // ~4 months
      const req = calculateMonthlySavingsRequired(10_000_001, 1, "2027-02-01", "2026-11-01");
      expect(Number.isInteger(req)).toBe(true);
      expect(req * monthsRemaining).toBeGreaterThanOrEqual(10_000_000);
    });
  });

  describe("evaluateGoalPacing - Boundary Forecasts", () => {
    const baseGoal: SavingsGoalInput = {
      id: "pace-goal",
      name: "Dana Pendidikan",
      targetAmount: 12_000_000,
      currentAmount: 0,
      targetDate: "2027-11-01", // 13 months -> req: ceil(12jt / 13) = 923,077
      category: "education",
      priority: "high",
      accountId: "acc-1",
      color: "#047857",
      isCompleted: false,
    };

    it("forecasts infinite months and null projectedCompletionDate when plannedMonthly is 0", () => {
      const res = evaluateGoalPacing(baseGoal, 0, "2026-11-01");
      expect(res.status).toBe("behind");
      expect(res.projectedMonthsToComplete).toBe(Infinity);
      expect(res.projectedCompletionDate).toBeNull();
      expect(res.monthlyShortfallOrSurplus).toBeLessThan(0);
    });

    it("recognizes on_track status when plannedMonthly meets required but is less than 15% above", () => {
      const req = calculateMonthlySavingsRequired(baseGoal.targetAmount, baseGoal.currentAmount, baseGoal.targetDate, "2026-11-01");
      const res = evaluateGoalPacing(baseGoal, req, "2026-11-01");
      expect(res.status).toBe("on_track");
      expect(res.monthlyShortfallOrSurplus).toBe(0);
    });

    it("recognizes ahead status when plannedMonthly is >= 15% above required", () => {
      const req = calculateMonthlySavingsRequired(baseGoal.targetAmount, baseGoal.currentAmount, baseGoal.targetDate, "2026-11-01");
      const surplusContribution = Math.round(req * 1.15);
      const res = evaluateGoalPacing(baseGoal, surplusContribution, "2026-11-01");
      expect(res.status).toBe("ahead");
      expect(res.monthlyShortfallOrSurplus).toBeGreaterThan(0);
    });

    it("evaluates completed goal correctly", () => {
      const doneGoal: SavingsGoalInput = {
        ...baseGoal,
        currentAmount: 12_000_000,
        isCompleted: true,
      };
      const res = evaluateGoalPacing(doneGoal, 1_000_000, "2026-11-01");
      expect(res.status).toBe("completed");
      expect(res.requiredMonthlySavings).toBe(0);
      expect(res.projectedMonthsToComplete).toBe(0);
      expect(res.projectedCompletionDate).toBe("2026-11-01");
      expect(res.monthlyShortfallOrSurplus).toBe(1_000_000);
    });
  });

  describe("calculateSavingsGoalsSummary - Aggregations & Fallbacks", () => {
    it("handles goals with unknown or unmapped category safely falling back to other", () => {
      const weirdGoal = {
        id: "weird-1",
        name: "Mystery Goal",
        targetAmount: 5_000_000,
        currentAmount: 1_000_000,
        targetDate: "2027-05-01",
        category: "unregistered_category" as any,
        priority: "medium" as const,
        accountId: "acc-1",
        color: "#123456",
        isCompleted: false,
      };

      const summary = calculateSavingsGoalsSummary([weirdGoal], "2026-11-01");
      expect(summary.totalTargetAmount).toBe(5_000_000);
      expect(summary.totalCurrentAmount).toBe(1_000_000);
      expect(summary.categoryBreakdown.other.count).toBe(1);
      expect(summary.categoryBreakdown.other.targetAmount).toBe(5_000_000);
    });

    it("computes overallProgress as 0 when totalTargetAmount is 0", () => {
      const zeroGoal: SavingsGoalInput = {
        id: "zero-1",
        name: "Zero Target",
        targetAmount: 0,
        currentAmount: 0,
        targetDate: "2027-01-01",
        category: "other",
        priority: "low",
        accountId: "acc-1",
        color: "#000000",
        isCompleted: false,
      };
      const summary = calculateSavingsGoalsSummary([zeroGoal], "2026-11-01");
      expect(summary.overallProgress).toBe(0);
    });

    it("caps overallProgress at 100 even if current amounts exceed target amounts", () => {
      const overfundedGoal: SavingsGoalInput = {
        id: "over-1",
        name: "Overfunded",
        targetAmount: 1_000_000,
        currentAmount: 2_500_000,
        targetDate: "2027-01-01",
        category: "other",
        priority: "low",
        accountId: "acc-1",
        color: "#000000",
        isCompleted: true,
      };
      const summary = calculateSavingsGoalsSummary([overfundedGoal], "2026-11-01");
      expect(summary.overallProgress).toBe(100);
      expect(summary.activeCount).toBe(0);
      expect(summary.completedCount).toBe(1);
      expect(summary.totalMonthlyNeeded).toBe(0);
    });
  });

  describe("applyGoalContribution - Decimal Rounding & Limits", () => {
    const goal: SavingsGoalInput = {
      id: "gc-1",
      name: "Qurban",
      targetAmount: 3_000_000,
      currentAmount: 1_000_000,
      targetDate: "2027-06-01",
      category: "sinking_fund",
      priority: "high",
      accountId: "acc-bca",
      color: "#047857",
      isCompleted: false,
    };

    it("rounds decimal contributions to nearest integer", () => {
      const res = applyGoalContribution(goal, 100_000.4, "deposit");
      expect(res.delta).toBe(100_000);
      expect(res.newAmount).toBe(1_100_000);

      const res2 = applyGoalContribution(goal, 100_000.6, "deposit");
      expect(res2.delta).toBe(100_001);
      expect(res2.newAmount).toBe(1_100_001);
    });

    it("clamps withdrawal beyond available balance to 0 and adjusts delta", () => {
      const res = applyGoalContribution(goal, 9_999_999, "withdraw");
      expect(res.newAmount).toBe(0);
      expect(res.delta).toBe(-1_000_000);
      expect(res.updatedGoal.currentAmount).toBe(0);
      expect(res.updatedGoal.isCompleted).toBe(false);
    });

    it("withdrawals when balance is 0 stay at 0 with 0 delta", () => {
      const zeroBalanceGoal = { ...goal, currentAmount: 0 };
      const res = applyGoalContribution(zeroBalanceGoal, 500_000, "withdraw");
      expect(res.newAmount).toBe(0);
      expect(res.delta).toBe(0);
    });
  });

  describe("calculateGoalMilestones - Edge Cases", () => {
    it("handles zero target amount milestones gracefully", () => {
      const zeroGoal: SavingsGoalInput = {
        id: "zm-1",
        name: "Zero",
        targetAmount: 0,
        currentAmount: 0,
        targetDate: "2027-01-01",
        category: "other",
        priority: "low",
        accountId: "acc-1",
        color: "#000000",
        isCompleted: true,
      };

      const milestones = calculateGoalMilestones(zeroGoal);
      expect(milestones).toHaveLength(4);
      expect(milestones.every((m) => m.targetAmountAtMilestone === 0 && m.isReached)).toBe(true);
    });

    it("marks all milestones reached when goal is 100% funded", () => {
      const fundedGoal: SavingsGoalInput = {
        id: "fm-1",
        name: "Funded",
        targetAmount: 10_000_000,
        currentAmount: 10_000_000,
        targetDate: "2027-01-01",
        category: "education",
        priority: "high",
        accountId: "acc-1",
        color: "#000000",
        isCompleted: true,
      };

      const milestones = calculateGoalMilestones(fundedGoal);
      expect(milestones.every((m) => m.isReached)).toBe(true);
    });
  });

  describe("allocateSavingsCapacity - Edge Cases & Allocation Strategies", () => {
    const goals: SavingsGoalInput[] = [
      {
        id: "g-p1",
        name: "High Priority Far",
        targetAmount: 6_000_000,
        currentAmount: 0,
        targetDate: "2027-11-01",
        category: "emergency_fund",
        priority: "high",
        accountId: "acc-1",
        color: "#111111",
        isCompleted: false,
      },
      {
        id: "g-p2",
        name: "High Priority Near",
        targetAmount: 2_000_000,
        currentAmount: 0,
        targetDate: "2026-12-01",
        category: "sinking_fund",
        priority: "high",
        accountId: "acc-2",
        color: "#222222",
        isCompleted: false,
      },
      {
        id: "g-p3",
        name: "Low Priority Near",
        targetAmount: 1_000_000,
        currentAmount: 0,
        targetDate: "2026-11-15",
        category: "purchase",
        priority: "low",
        accountId: "acc-3",
        color: "#333333",
        isCompleted: false,
      },
    ];

    it("breaks priority ties by nearest targetDate in urgency_priority", () => {
      // Both g-p1 and g-p2 are high priority, but g-p2 is due 2026-12-01 vs 2027-11-01.
      // g-p2 should be sorted ahead and funded first.
      const res = allocateSavingsCapacity(goals, 1_000_000, "2026-11-01", "urgency_priority");
      const p2Alloc = res.allocations.find((a) => a.goalId === "g-p2");
      expect(p2Alloc?.allocatedAmount).toBeGreaterThan(0);
    });

    it("equal strategy divides capacity equally among active goals and allocates leftovers", () => {
      // 3 active goals, capacity 1,000,000
      // 1,000,000 / 3 = 333,333 each (999,999 total), 1 leftover goes to first
      const res = allocateSavingsCapacity(goals, 1_000_000, "2026-11-01", "equal");
      expect(res.totalAllocated).toBe(1_000_000);
      expect(res.unallocatedRemainder).toBe(0);
      const totalAllocatedSum = res.allocations.reduce((sum, a) => sum + a.allocatedAmount, 0);
      expect(totalAllocatedSum).toBe(1_000_000);
    });

    it("proportional strategy falls back to equal split when all requirements are 0", () => {
      // Goals that need 0 monthly because they are funded or have 0 remaining
      const zeroReqGoals: SavingsGoalInput[] = [
        { ...goals[0], currentAmount: 6_000_000, targetAmount: 6_000_000, isCompleted: false },
        { ...goals[1], currentAmount: 1_999_999, targetAmount: 2_000_000, targetDate: "2026-10-01" }, // overdue -> req 1
      ];
      const res = allocateSavingsCapacity(zeroReqGoals, 100_000, "2026-11-01", "proportional");
      expect(res.totalAllocated).toBe(1); // can only take 1 rupiah before full
      expect(res.unallocatedRemainder).toBe(99_999);
    });

    it("handles negative availableCapacity gracefully by treating as 0", () => {
      const res = allocateSavingsCapacity(goals, -100_000, "2026-11-01");
      expect(res.totalCapacity).toBe(0);
      expect(res.totalAllocated).toBe(0);
      expect(res.unallocatedRemainder).toBe(0);
    });

    it("caps unallocated remainder when total capacity exceeds all remaining goal balances combined", () => {
      // Remaining amounts: 6jt + 2jt + 1jt = 9jt total. Capacity = 15jt
      const res = allocateSavingsCapacity(goals, 15_000_000, "2026-11-01", "urgency_priority");
      expect(res.totalAllocated).toBe(9_000_000);
      expect(res.unallocatedRemainder).toBe(6_000_000);
      // All goals should be 100% funded up to their remaining amounts
      for (const a of res.allocations) {
        expect(a.allocatedAmount).toBe(a.remainingGoalAmount);
      }
    });
  });

  describe("generateSinkingFundSchedule - Horizon Clamping & Empty Scenarios", () => {
    it("clamps monthsHorizon between 1 and 36", () => {
      const resUnder = generateSinkingFundSchedule([], "2026-11-01", -5);
      expect(resUnder.horizonMonths).toBe(1);
      expect(resUnder.schedule).toHaveLength(1);

      const resOver = generateSinkingFundSchedule([], "2026-11-01", 100);
      expect(resOver.horizonMonths).toBe(36);
      expect(resOver.schedule).toHaveLength(36);
    });

    it("returns null peakMonth and 0 highestMaturingAmount when no goals mature", () => {
      const res = generateSinkingFundSchedule([], "2026-11-01", 6);
      expect(res.peakMonth).toBeNull();
      expect(res.highestMaturingAmount).toBe(0);
      expect(res.schedule.every((s) => !s.isPeakMonth)).toBe(true);
    });

    it("flags only peak month when multiple goals mature across horizons", () => {
      const goals: SavingsGoalInput[] = [
        {
          id: "g1",
          name: "Small",
          targetAmount: 500_000,
          currentAmount: 0,
          targetDate: "2026-12-15",
          category: "sinking_fund",
          priority: "medium",
          accountId: "acc-1",
          color: "#111111",
          isCompleted: false,
        },
        {
          id: "g2",
          name: "Big",
          targetAmount: 5_000_000,
          currentAmount: 0,
          targetDate: "2027-02-10",
          category: "sinking_fund",
          priority: "high",
          accountId: "acc-1",
          color: "#222222",
          isCompleted: false,
        },
      ];
      const res = generateSinkingFundSchedule(goals, "2026-11-01", 6);
      expect(res.peakMonth).toBe("2027-02");
      expect(res.highestMaturingAmount).toBe(5_000_000);

      const decItem = res.schedule.find((s) => s.month === "2026-12");
      const febItem = res.schedule.find((s) => s.month === "2027-02");
      expect(decItem?.isPeakMonth).toBe(false);
      expect(febItem?.isPeakMonth).toBe(true);
    });
  });

  describe("Savings Server Actions - Edge Cases & Validation Failures", () => {
    const validGoal: SavingsGoalInput = {
      id: "action-edge-1",
      name: "Emergency Fund",
      targetAmount: 10_000_000,
      currentAmount: 2_000_000,
      targetDate: "2027-06-01",
      category: "emergency_fund",
      priority: "high",
      accountId: "acc-1",
      color: "#047857",
      isCompleted: false,
    };

    it("validateSavingsGoalAction fails on blank name and invalid color format", async () => {
      const bad = await validateSavingsGoalAction({
        ...validGoal,
        name: "",
        color: "invalid-color-hex",
      });
      expect(bad.success).toBe(false);
      expect(bad.fieldErrors?.name).toBeDefined();
      expect(bad.fieldErrors?.color).toBeDefined();
    });

    it("validateCreateSavingsGoalAction succeeds with optional color and omitted id", async () => {
      const createRes = await validateCreateSavingsGoalAction({
        name: "Dana Darurat",
        targetAmount: 5_000_000,
        targetDate: "2027-12-31",
      });
      expect(createRes.success).toBe(true);
      expect(createRes.data?.category).toBe("sinking_fund"); // default
      expect(createRes.data?.priority).toBe("medium"); // default
    });

    it("recordGoalContributionAction rejects invalid goal object", async () => {
      // @ts-expect-error test malformed goal object
      const res = await recordGoalContributionAction({ name: "Broken" }, 500_000);
      expect(res.success).toBe(false);
      expect(res.error).toContain("tidak valid");
    });

    it("getSavingsPacingAction rejects invalid referenceDate format and negative plannedMonthly", async () => {
      const badDate = await getSavingsPacingAction(validGoal, 500_000, "2026/11/01");
      expect(badDate.success).toBe(false);
      expect(badDate.error).toContain("harus YYYY-MM-DD");

      const negPlan = await getSavingsPacingAction(validGoal, -100_000, "2026-11-01");
      expect(negPlan.success).toBe(false);
      expect(negPlan.error).toContain("negatif");
    });

    it("getSavingsSummaryAction rejects malformed date and non-array payload", async () => {
      const badDate = await getSavingsSummaryAction([], "01-11-2026");
      expect(badDate.success).toBe(false);
      expect(badDate.error).toContain("harus YYYY-MM-DD");

      
      const nonArray = await getSavingsSummaryAction({} as any, "2026-11-01");
      expect(nonArray.success).toBe(false);
      expect(nonArray.error).toContain("harus berupa array");
    });

    it("allocateSavingsAction rejects negative capacity and invalid date", async () => {
      const negCap = await allocateSavingsAction([validGoal], -200_000, "2026-11-01");
      expect(negCap.success).toBe(false);
      expect(negCap.error).toContain("negatif");

      const badDate = await allocateSavingsAction([validGoal], 500_000, "not-a-date");
      expect(badDate.success).toBe(false);
      expect(badDate.error).toContain("harus YYYY-MM-DD");
    });

    it("getSinkingFundScheduleAction validates array and date inputs", async () => {
      
      const notArr = await getSinkingFundScheduleAction(null as any, "2026-11-01");
      expect(notArr.success).toBe(false);

      const badDate = await getSinkingFundScheduleAction([], "2026.11.01");
      expect(badDate.success).toBe(false);
      expect(badDate.error).toContain("harus YYYY-MM-DD");

      const ok = await getSinkingFundScheduleAction([], "2026-11-01");
      expect(ok.success).toBe(true);
      expect(ok.data?.schedule).toHaveLength(12);
    });

    it("getGoalMilestonesAction rejects invalid goal data", async () => {
      // @ts-expect-error test invalid payload
      const res = await getGoalMilestonesAction({ id: "" });
      expect(res.success).toBe(false);
      expect(res.error).toContain("tidak valid");
    });
  });

  describe("savingsGoalSchema - Strict Field Validations", () => {
    it("validates priority enum constraints", () => {
      const invalidPriority = savingsGoalSchema.safeParse({
        id: "sg-1",
        name: "Test",
        targetAmount: 100_000,
        targetDate: "2027-01-01",
        priority: "critical", // invalid enum
      });
      expect(invalidPriority.success).toBe(false);

      const validPriority = savingsGoalSchema.safeParse({
        id: "sg-1",
        name: "Test",
        targetAmount: 100_000,
        targetDate: "2027-01-01",
        priority: "high",
      });
      expect(validPriority.success).toBe(true);
    });

    it("validates category enum constraints", () => {
      const invalidCat = savingsGoalSchema.safeParse({
        id: "sg-1",
        name: "Test",
        targetAmount: 100_000,
        targetDate: "2027-01-01",
        category: "crypto", // invalid enum
      });
      expect(invalidCat.success).toBe(false);

      const validCat = savingsGoalSchema.safeParse({
        id: "sg-1",
        name: "Test",
        targetAmount: 100_000,
        targetDate: "2027-01-01",
        category: "emergency_fund",
      });
      expect(validCat.success).toBe(true);
    });
  });
});
