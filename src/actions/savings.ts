"use server";

import {
  savingsGoalSchema,
  createSavingsGoalSchema,
  SavingsGoalInput,
  CreateSavingsGoalInput,
} from "@/lib/validations/savings-goal";
import {
  evaluateGoalPacing,
  calculateSavingsGoalsSummary,
  applyGoalContribution,
  calculateGoalMilestones,
  allocateSavingsCapacity,
  generateSinkingFundSchedule,
  GoalPacingResult,
  SavingsGoalsSummary,
  GoalContributionResult,
  SavingsAllocationResult,
  SavingsAllocationStrategy,
  SinkingFundScheduleSummary,
  GoalMilestone,
} from "@/lib/savings-engine";
import { ActionResponse } from "@/actions/budget";

export interface GoalMilestoneResponse {
  goalId: string;
  milestones: GoalMilestone[];
}

/**
 * Validates a full savings goal payload before mutation or DB update.
 */
export async function validateSavingsGoalAction(
  rawData: unknown
): Promise<ActionResponse<SavingsGoalInput>> {
  const result = savingsGoalSchema.safeParse(rawData);

  if (!result.success) {
    const errorIssues = result.error.flatten();
    return {
      success: false,
      error: "Validasi target tabungan gagal. Periksa kembali form isian.",
      fieldErrors: errorIssues.fieldErrors,
    };
  }

  return {
    success: true,
    data: result.data,
  };
}

/**
 * Validates a new savings goal creation payload (where id and isCompleted are optional/omitted).
 */
export async function validateCreateSavingsGoalAction(
  rawData: unknown
): Promise<ActionResponse<CreateSavingsGoalInput>> {
  const result = createSavingsGoalSchema.safeParse(rawData);

  if (!result.success) {
    const errorIssues = result.error.flatten();
    return {
      success: false,
      error: "Validasi penambahan target tabungan gagal. Periksa data input.",
      fieldErrors: errorIssues.fieldErrors,
    };
  }

  return {
    success: true,
    data: result.data,
  };
}

/**
 * Records a deposit or withdrawal contribution towards a savings goal.
 */
export async function recordGoalContributionAction(
  goal: SavingsGoalInput,
  amount: number,
  type: "deposit" | "withdraw" = "deposit"
): Promise<ActionResponse<GoalContributionResult>> {
  if (amount <= 0 || isNaN(amount)) {
    return {
      success: false,
      error: "Nominal kontribusi harus berupa angka positif.",
    };
  }

  const validGoal = savingsGoalSchema.safeParse(goal);
  if (!validGoal.success) {
    return {
      success: false,
      error: "Data target tabungan tidak valid.",
    };
  }

  try {
    const result = applyGoalContribution(validGoal.data, amount, type);
    return {
      success: true,
      data: result,
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : "Gagal memproses kontribusi.";
    return {
      success: false,
      error: message,
    };
  }
}

/**
 * Computes pacing, required monthly savings, and projected completion date.
 */
export async function getSavingsPacingAction(
  goal: SavingsGoalInput,
  plannedMonthly: number,
  referenceDate?: string
): Promise<ActionResponse<GoalPacingResult>> {
  const validGoal = savingsGoalSchema.safeParse(goal);
  if (!validGoal.success) {
    return {
      success: false,
      error: "Data target tabungan tidak valid.",
    };
  }

  const ref = referenceDate || new Date().toISOString().slice(0, 10);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(ref)) {
    return {
      success: false,
      error: "Format referenceDate tidak valid (harus YYYY-MM-DD)",
    };
  }

  if (plannedMonthly < 0 || isNaN(plannedMonthly)) {
    return {
      success: false,
      error: "Rencana setoran bulanan tidak boleh bernilai negatif.",
    };
  }

  const pacing = evaluateGoalPacing(validGoal.data, plannedMonthly, ref);

  return {
    success: true,
    data: pacing,
  };
}

/**
 * Aggregates high-level metrics across all registered savings goals and sinking funds.
 */
export async function getSavingsSummaryAction(
  goals: SavingsGoalInput[],
  referenceDate?: string
): Promise<ActionResponse<SavingsGoalsSummary>> {
  if (!Array.isArray(goals)) {
    return {
      success: false,
      error: "Daftar target tabungan harus berupa array.",
    };
  }

  const ref = referenceDate || new Date().toISOString().slice(0, 10);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(ref)) {
    return {
      success: false,
      error: "Format referenceDate tidak valid (harus YYYY-MM-DD)",
    };
  }

  const summary = calculateSavingsGoalsSummary(goals, ref);

  return {
    success: true,
    data: summary,
  };
}

/**
 * Allocates monthly surplus/capacity across active goals based on chosen strategy.
 */
export async function allocateSavingsAction(
  goals: SavingsGoalInput[],
  monthlyCapacity: number,
  referenceDate?: string,
  strategy: SavingsAllocationStrategy = "urgency_priority"
): Promise<ActionResponse<SavingsAllocationResult>> {
  if (!Array.isArray(goals)) {
    return {
      success: false,
      error: "Daftar target tabungan tidak valid.",
    };
  }

  if (monthlyCapacity < 0 || isNaN(monthlyCapacity)) {
    return {
      success: false,
      error: "Kapasitas alokasi bulanan tidak boleh bernilai negatif.",
    };
  }

  const ref = referenceDate || new Date().toISOString().slice(0, 10);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(ref)) {
    return {
      success: false,
      error: "Format referenceDate tidak valid (harus YYYY-MM-DD)",
    };
  }

  const allocation = allocateSavingsCapacity(goals, monthlyCapacity, ref, strategy);

  return {
    success: true,
    data: allocation,
  };
}

/**
 * Computes forward sinking fund maturity timeline to surface peak burden months.
 */
export async function getSinkingFundScheduleAction(
  goals: SavingsGoalInput[],
  referenceDate?: string,
  monthsAhead: number = 12
): Promise<ActionResponse<SinkingFundScheduleSummary>> {
  if (!Array.isArray(goals)) {
    return {
      success: false,
      error: "Daftar target tabungan tidak valid.",
    };
  }

  const ref = referenceDate || new Date().toISOString().slice(0, 10);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(ref)) {
    return {
      success: false,
      error: "Format referenceDate tidak valid (harus YYYY-MM-DD)",
    };
  }

  const schedule = generateSinkingFundSchedule(goals, ref, monthsAhead);

  return {
    success: true,
    data: schedule,
  };
}

/**
 * Computes 25%, 50%, 75%, 100% milestone progress indicators for a goal.
 */
export async function getGoalMilestonesAction(
  goal: SavingsGoalInput
): Promise<ActionResponse<GoalMilestoneResponse>> {
  const validGoal = savingsGoalSchema.safeParse(goal);
  if (!validGoal.success) {
    return {
      success: false,
      error: "Data target tabungan tidak valid.",
    };
  }

  const milestones = calculateGoalMilestones(validGoal.data);

  return {
    success: true,
    data: {
      goalId: validGoal.data.id,
      milestones,
    },
  };
}
