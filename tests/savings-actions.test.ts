import { describe, it, expect } from "vitest";
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
import { SavingsGoalInput } from "@/lib/validations/savings-goal";

describe("Savings & Sinking Funds Server Actions", () => {
  const sampleGoal: SavingsGoalInput = {
    id: "goal-act-1",
    name: "Renovasi Rumah",
    targetAmount: 20_000_000,
    currentAmount: 5_000_000,
    targetDate: "2027-11-01",
    category: "sinking_fund",
    priority: "high",
    accountId: "acc-mandiri",
    color: "#047857",
    isCompleted: false,
  };

  describe("validateSavingsGoalAction", () => {
    it("validates valid payload", async () => {
      const res = await validateSavingsGoalAction(sampleGoal);
      expect(res.success).toBe(true);
      expect(res.data?.name).toBe("Renovasi Rumah");
    });

    it("returns error on invalid payload", async () => {
      const res = await validateSavingsGoalAction({ name: "" });
      expect(res.success).toBe(false);
      expect(res.error).toBeDefined();
      expect(res.fieldErrors).toBeDefined();
    });
  });

  describe("validateCreateSavingsGoalAction", () => {
    it("validates payload without id", async () => {
      const res = await validateCreateSavingsGoalAction({
        name: "Tabungan Menikah",
        targetAmount: 50_000_000,
        targetDate: "2028-06-01",
        category: "other",
        priority: "high",
        color: "#047857",
      });
      expect(res.success).toBe(true);
      expect(res.data?.name).toBe("Tabungan Menikah");
    });

    it("rejects payload with negative target amount", async () => {
      const res = await validateCreateSavingsGoalAction({
        name: "Tabungan",
        targetAmount: -10_000,
        targetDate: "2028-06-01",
      });
      expect(res.success).toBe(false);
      expect(res.fieldErrors?.targetAmount).toBeDefined();
    });
  });

  describe("recordGoalContributionAction", () => {
    it("records deposit contribution and updates balance", async () => {
      const res = await recordGoalContributionAction(sampleGoal, 2_000_000, "deposit");
      expect(res.success).toBe(true);
      expect(res.data?.delta).toBe(2_000_000);
      expect(res.data?.newAmount).toBe(7_000_000);
      expect(res.data?.isNewlyCompleted).toBe(false);
    });

    it("rejects non-positive amount", async () => {
      const res = await recordGoalContributionAction(sampleGoal, 0, "deposit");
      expect(res.success).toBe(false);
      expect(res.error).toContain("positif");
    });
  });

  describe("getSavingsPacingAction", () => {
    it("calculates pacing and completion forecast", async () => {
      const res = await getSavingsPacingAction(sampleGoal, 1_500_000, "2026-11-01");
      expect(res.success).toBe(true);
      expect(res.data?.requiredMonthlySavings).toBeGreaterThan(0);
      expect(res.data?.status).toBeDefined();
    });

    it("rejects invalid date format", async () => {
      const res = await getSavingsPacingAction(sampleGoal, 1_000_000, "01-11-2026");
      expect(res.success).toBe(false);
      expect(res.error).toContain("Format");
    });
  });

  describe("getSavingsSummaryAction", () => {
    it("returns aggregated totals and counts", async () => {
      const res = await getSavingsSummaryAction([sampleGoal], "2026-11-01");
      expect(res.success).toBe(true);
      expect(res.data?.totalTargetAmount).toBe(20_000_000);
      expect(res.data?.totalCurrentAmount).toBe(5_000_000);
      expect(res.data?.activeCount).toBe(1);
    });

    it("returns error if input is not an array", async () => {
      // @ts-expect-error testing invalid argument type
      const res = await getSavingsSummaryAction(null, "2026-11-01");
      expect(res.success).toBe(false);
    });
  });

  describe("allocateSavingsAction", () => {
    it("distributes monthly savings capacity to goals", async () => {
      const res = await allocateSavingsAction([sampleGoal], 1_500_000, "2026-11-01");
      expect(res.success).toBe(true);
      expect(res.data?.totalAllocated).toBe(1_500_000);
      expect(res.data?.allocations).toHaveLength(1);
      expect(res.data?.allocations[0].allocatedAmount).toBe(1_500_000);
    });

    it("rejects negative capacity", async () => {
      const res = await allocateSavingsAction([sampleGoal], -500_000, "2026-11-01");
      expect(res.success).toBe(false);
      expect(res.error).toContain("negatif");
    });
  });

  describe("getSinkingFundScheduleAction", () => {
    it("returns timeline forecast", async () => {
      const res = await getSinkingFundScheduleAction([sampleGoal], "2026-11-01", 12);
      expect(res.success).toBe(true);
      expect(res.data?.schedule).toHaveLength(12);
      expect(res.data?.horizonMonths).toBe(12);
    });
  });

  describe("getGoalMilestonesAction", () => {
    it("returns milestone checkpoints for goal", async () => {
      const res = await getGoalMilestonesAction(sampleGoal);
      expect(res.success).toBe(true);
      expect(res.data?.goalId).toBe("goal-act-1");
      expect(res.data?.milestones).toHaveLength(4);
    });
  });
});
