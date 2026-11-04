import { SavingsGoalInput, GoalCategory } from "./validations/savings-goal";

export interface GoalProgress {
  percentage: number;
  remainingAmount: number;
  isCompleted: boolean;
}

export type GoalPaceStatus = "ahead" | "on_track" | "behind" | "completed";

export interface GoalPacingResult {
  status: GoalPaceStatus;
  requiredMonthlySavings: number;
  monthsRemaining: number;
  projectedMonthsToComplete: number;
  projectedCompletionDate: string | null;
  monthlyShortfallOrSurplus: number;
}

export interface SavingsGoalsSummary {
  totalTargetAmount: number;
  totalCurrentAmount: number;
  overallProgress: number;
  totalMonthlyNeeded: number;
  activeCount: number;
  completedCount: number;
  categoryBreakdown: Record<GoalCategory, { targetAmount: number; currentAmount: number; count: number }>;
}

/**
 * Computes progress percentage, remaining funding, and completion status.
 */
export function calculateGoalProgress(currentAmount: number, targetAmount: number): GoalProgress {
  if (targetAmount <= 0) {
    return {
      percentage: 100,
      remainingAmount: 0,
      isCompleted: true,
    };
  }

  const clampedCurrent = Math.max(0, currentAmount);
  const remainingAmount = Math.max(0, targetAmount - clampedCurrent);
  const rawPercentage = (clampedCurrent / targetAmount) * 100;
  const percentage = Math.min(100, Number(rawPercentage.toFixed(1)));
  const isCompleted = clampedCurrent >= targetAmount;

  return {
    percentage,
    remainingAmount,
    isCompleted,
  };
}

/**
 * Calculates remaining months between reference date and target date.
 * ponytail: uses 30-day ceiling estimation; upgrade to precise day-fraction or banking day count when synced.
 */
export function calculateMonthsRemaining(targetDateStr: string, referenceDateStr: string): number {
  const targetDate = new Date(targetDateStr);
  const refDate = new Date(referenceDateStr);

  const diffMs = targetDate.getTime() - refDate.getTime();
  if (diffMs <= 0) return 0;

  const diffDays = Math.ceil(diffMs / (1000 * 60 * 60 * 24));
  return Math.max(1, Math.ceil(diffDays / 30));
}

/**
 * Computes recommended monthly savings required to meet target on time.
 * ponytail: assumes linear monthly contribution without compounding interest yield; upgrade when yield tracking exists.
 */
export function calculateMonthlySavingsRequired(
  targetAmount: number,
  currentAmount: number,
  targetDateStr: string,
  referenceDateStr: string
): number {
  const progress = calculateGoalProgress(currentAmount, targetAmount);
  if (progress.isCompleted) return 0;

  const monthsRemaining = calculateMonthsRemaining(targetDateStr, referenceDateStr);
  if (monthsRemaining <= 0) {
    return progress.remainingAmount;
  }

  return Math.ceil(progress.remainingAmount / monthsRemaining);
}

/**
 * Evaluates pacing status and forecasts completion horizon.
 */
export function evaluateGoalPacing(
  goal: SavingsGoalInput,
  plannedMonthlyContribution: number,
  referenceDateStr: string
): GoalPacingResult {
  const progress = calculateGoalProgress(goal.currentAmount, goal.targetAmount);
  const monthsRemaining = calculateMonthsRemaining(goal.targetDate, referenceDateStr);

  if (progress.isCompleted || goal.isCompleted) {
    return {
      status: "completed",
      requiredMonthlySavings: 0,
      monthsRemaining,
      projectedMonthsToComplete: 0,
      projectedCompletionDate: referenceDateStr,
      monthlyShortfallOrSurplus: plannedMonthlyContribution,
    };
  }

  const requiredMonthlySavings = calculateMonthlySavingsRequired(
    goal.targetAmount,
    goal.currentAmount,
    goal.targetDate,
    referenceDateStr
  );

  const shortfallOrSurplus = plannedMonthlyContribution - requiredMonthlySavings;

  let status: GoalPaceStatus = "on_track";
  if (plannedMonthlyContribution >= Math.round(requiredMonthlySavings * 1.15)) {
    status = "ahead";
  } else if (plannedMonthlyContribution < requiredMonthlySavings) {
    status = "behind";
  }

  let projectedMonthsToComplete = Infinity;
  let projectedCompletionDate: string | null = null;

  if (plannedMonthlyContribution > 0) {
    projectedMonthsToComplete = Math.ceil(progress.remainingAmount / plannedMonthlyContribution);
    const refDate = new Date(referenceDateStr);
    const projectedDate = new Date(
      refDate.getFullYear(),
      refDate.getMonth() + projectedMonthsToComplete,
      refDate.getDate()
    );
    const y = projectedDate.getFullYear();
    const m = String(projectedDate.getMonth() + 1).padStart(2, "0");
    const d = String(projectedDate.getDate()).padStart(2, "0");
    projectedCompletionDate = `${y}-${m}-${d}`;
  }

  return {
    status,
    requiredMonthlySavings,
    monthsRemaining,
    projectedMonthsToComplete,
    projectedCompletionDate,
    monthlyShortfallOrSurplus: shortfallOrSurplus,
  };
}

/**
 * Aggregates high-level portfolio metrics across all registered savings goals.
 */
export function calculateSavingsGoalsSummary(
  goals: SavingsGoalInput[],
  referenceDateStr: string
): SavingsGoalsSummary {
  const defaultCategoryBreakdown: Record<GoalCategory, { targetAmount: number; currentAmount: number; count: number }> = {
    emergency_fund: { targetAmount: 0, currentAmount: 0, count: 0 },
    sinking_fund: { targetAmount: 0, currentAmount: 0, count: 0 },
    investment: { targetAmount: 0, currentAmount: 0, count: 0 },
    purchase: { targetAmount: 0, currentAmount: 0, count: 0 },
    education: { targetAmount: 0, currentAmount: 0, count: 0 },
    other: { targetAmount: 0, currentAmount: 0, count: 0 },
  };

  let totalTargetAmount = 0;
  let totalCurrentAmount = 0;
  let totalMonthlyNeeded = 0;
  let activeCount = 0;
  let completedCount = 0;

  for (const goal of goals) {
    totalTargetAmount += goal.targetAmount;
    totalCurrentAmount += goal.currentAmount;

    const isDone = goal.isCompleted || goal.currentAmount >= goal.targetAmount;
    if (isDone) {
      completedCount += 1;
    } else {
      activeCount += 1;
      totalMonthlyNeeded += calculateMonthlySavingsRequired(
        goal.targetAmount,
        goal.currentAmount,
        goal.targetDate,
        referenceDateStr
      );
    }

    const cat = goal.category in defaultCategoryBreakdown ? goal.category : "other";
    defaultCategoryBreakdown[cat].targetAmount += goal.targetAmount;
    defaultCategoryBreakdown[cat].currentAmount += goal.currentAmount;
    defaultCategoryBreakdown[cat].count += 1;
  }

  const overallProgress =
    totalTargetAmount > 0
      ? Math.min(100, Number(((totalCurrentAmount / totalTargetAmount) * 100).toFixed(1)))
      : 0;

  return {
    totalTargetAmount,
    totalCurrentAmount,
    overallProgress,
    totalMonthlyNeeded,
    activeCount,
    completedCount,
    categoryBreakdown: defaultCategoryBreakdown,
  };
}
