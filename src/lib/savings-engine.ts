import { SavingsGoalInput, GoalCategory, GoalPriority } from "./validations/savings-goal";

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

export interface GoalContributionResult {
  updatedGoal: SavingsGoalInput;
  delta: number;
  previousAmount: number;
  newAmount: number;
  isNewlyCompleted: boolean;
}

export type SavingsAllocationStrategy = "urgency_priority" | "proportional" | "equal";

export interface GoalAllocationItem {
  goalId: string;
  goalName: string;
  category: GoalCategory;
  priority: GoalPriority;
  requiredMonthly: number;
  allocatedAmount: number;
  remainingGoalAmount: number;
  fulfillmentRate: number;
}

export interface SavingsAllocationResult {
  totalCapacity: number;
  totalAllocated: number;
  unallocatedRemainder: number;
  allocations: GoalAllocationItem[];
}

export interface GoalMilestone {
  percentage: number;
  targetAmountAtMilestone: number;
  isReached: boolean;
}

export interface SinkingFundScheduleItem {
  month: string;
  maturingGoals: {
    id: string;
    name: string;
    targetAmount: number;
    remainingAmount: number;
    category: GoalCategory;
  }[];
  totalMaturingAmount: number;
  totalMonthlyFundingRequired: number;
  isPeakMonth: boolean;
}

export interface SinkingFundScheduleSummary {
  horizonMonths: number;
  schedule: SinkingFundScheduleItem[];
  peakMonth: string | null;
  highestMaturingAmount: number;
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

/**
 * Handles deposit or withdrawal transaction for a goal, recomputing balances and status.
 */
export function applyGoalContribution(
  goal: SavingsGoalInput,
  amount: number,
  type: "deposit" | "withdraw" = "deposit"
): GoalContributionResult {
  if (amount <= 0 || isNaN(amount)) {
    throw new Error("Nominal kontribusi harus berupa angka positif.");
  }

  const roundedAmount = Math.round(amount);
  const previousAmount = goal.currentAmount;
  let newAmount = previousAmount;

  if (type === "deposit") {
    newAmount = previousAmount + roundedAmount;
  } else {
    newAmount = Math.max(0, previousAmount - roundedAmount);
  }

  const isCompleted = newAmount >= goal.targetAmount;
  const isNewlyCompleted = !goal.isCompleted && isCompleted;

  const updatedGoal: SavingsGoalInput = {
    ...goal,
    currentAmount: newAmount,
    isCompleted,
  };

  return {
    updatedGoal,
    delta: newAmount - previousAmount,
    previousAmount,
    newAmount,
    isNewlyCompleted,
  };
}

/**
 * Computes standard 25%, 50%, 75%, 100% milestone markers for visual progress tracking.
 */
export function calculateGoalMilestones(goal: SavingsGoalInput): GoalMilestone[] {
  const steps = [25, 50, 75, 100];
  return steps.map((pct) => {
    const targetAmountAtMilestone = Math.round((goal.targetAmount * pct) / 100);
    return {
      percentage: pct,
      targetAmountAtMilestone,
      isReached: goal.currentAmount >= targetAmountAtMilestone,
    };
  });
}

const PRIORITY_WEIGHTS: Record<GoalPriority, number> = {
  high: 3,
  medium: 2,
  low: 1,
};

/**
 * Allocates available monthly savings capacity across active goals based on priority & urgency.
 * ponytail: operates deterministically; upgrade to monte-carlo or income volatility buffer when cashflow variance model exists.
 */
export function allocateSavingsCapacity(
  goals: SavingsGoalInput[],
  availableCapacity: number,
  referenceDateStr: string,
  strategy: SavingsAllocationStrategy = "urgency_priority"
): SavingsAllocationResult {
  const capacity = Math.max(0, Math.round(availableCapacity));
  const activeGoals = goals.filter((g) => !g.isCompleted && g.currentAmount < g.targetAmount);

  if (activeGoals.length === 0 || capacity === 0) {
    return {
      totalCapacity: capacity,
      totalAllocated: 0,
      unallocatedRemainder: capacity,
      allocations: activeGoals.map((g) => ({
        goalId: g.id,
        goalName: g.name,
        category: g.category,
        priority: g.priority,
        requiredMonthly: 0,
        allocatedAmount: 0,
        remainingGoalAmount: Math.max(0, g.targetAmount - g.currentAmount),
        fulfillmentRate: 0,
      })),
    };
  }

  const goalMetrics = activeGoals.map((goal) => {
    const remainingGoalAmount = Math.max(0, goal.targetAmount - goal.currentAmount);
    const requiredMonthly = calculateMonthlySavingsRequired(
      goal.targetAmount,
      goal.currentAmount,
      goal.targetDate,
      referenceDateStr
    );
    return {
      goal,
      remainingGoalAmount,
      requiredMonthly,
      allocatedAmount: 0,
    };
  });

  let remainingBudget = capacity;

  if (strategy === "urgency_priority") {
    // Sort: priority desc (high first), then targetDate asc (earliest first)
    goalMetrics.sort((a, b) => {
      const pDiff = PRIORITY_WEIGHTS[b.goal.priority] - PRIORITY_WEIGHTS[a.goal.priority];
      if (pDiff !== 0) return pDiff;
      return a.goal.targetDate.localeCompare(b.goal.targetDate);
    });

    // Pass 1: fund up to monthly required
    for (const item of goalMetrics) {
      if (remainingBudget <= 0) break;
      const need = Math.min(item.requiredMonthly, item.remainingGoalAmount);
      const alloc = Math.min(remainingBudget, need);
      item.allocatedAmount += alloc;
      remainingBudget -= alloc;
    }

    // Pass 2: distribute leftover capacity to goals not yet fully funded
    for (const item of goalMetrics) {
      if (remainingBudget <= 0) break;
      const stillCanTake = item.remainingGoalAmount - item.allocatedAmount;
      if (stillCanTake > 0) {
        const extra = Math.min(remainingBudget, stillCanTake);
        item.allocatedAmount += extra;
        remainingBudget -= extra;
      }
    }
  } else if (strategy === "proportional") {
    const totalRequired = goalMetrics.reduce((sum, g) => sum + g.requiredMonthly, 0);

    if (totalRequired === 0) {
      const perGoal = Math.floor(remainingBudget / goalMetrics.length);
      for (const item of goalMetrics) {
        const alloc = Math.min(remainingBudget, perGoal, item.remainingGoalAmount);
        item.allocatedAmount = alloc;
        remainingBudget -= alloc;
      }
    } else {
      for (const item of goalMetrics) {
        const ratio = item.requiredMonthly / totalRequired;
        const targetShare = Math.floor(capacity * ratio);
        const alloc = Math.min(remainingBudget, targetShare, item.remainingGoalAmount);
        item.allocatedAmount = alloc;
        remainingBudget -= alloc;
      }
      // Leftover cents/rupiahs to top goal with room
      for (const item of goalMetrics) {
        if (remainingBudget <= 0) break;
        const room = item.remainingGoalAmount - item.allocatedAmount;
        if (room > 0) {
          const topUp = Math.min(remainingBudget, room);
          item.allocatedAmount += topUp;
          remainingBudget -= topUp;
        }
      }
    }
  } else {
    // equal strategy
    const perGoal = Math.floor(remainingBudget / goalMetrics.length);
    for (const item of goalMetrics) {
      const alloc = Math.min(remainingBudget, perGoal, item.remainingGoalAmount);
      item.allocatedAmount = alloc;
      remainingBudget -= alloc;
    }
    for (const item of goalMetrics) {
      if (remainingBudget <= 0) break;
      const room = item.remainingGoalAmount - item.allocatedAmount;
      if (room > 0) {
        const topUp = Math.min(remainingBudget, room);
        item.allocatedAmount += topUp;
        remainingBudget -= topUp;
      }
    }
  }

  const totalAllocated = capacity - remainingBudget;

  const allocations: GoalAllocationItem[] = goalMetrics.map((item) => {
    let fulfillmentRate = 100;
    if (item.requiredMonthly > 0) {
      fulfillmentRate = Number(((item.allocatedAmount / item.requiredMonthly) * 100).toFixed(1));
    } else if (item.allocatedAmount === 0 && item.remainingGoalAmount > 0) {
      fulfillmentRate = 0;
    }

    return {
      goalId: item.goal.id,
      goalName: item.goal.name,
      category: item.goal.category,
      priority: item.goal.priority,
      requiredMonthly: item.requiredMonthly,
      allocatedAmount: item.allocatedAmount,
      remainingGoalAmount: item.remainingGoalAmount,
      fulfillmentRate,
    };
  });

  return {
    totalCapacity: capacity,
    totalAllocated,
    unallocatedRemainder: remainingBudget,
    allocations,
  };
}

/**
 * Projects sinking fund maturities month-by-month to uncover peak burden months.
 */
export function generateSinkingFundSchedule(
  goals: SavingsGoalInput[],
  referenceDateStr: string,
  monthsHorizon: number = 12
): SinkingFundScheduleSummary {
  const horizon = Math.max(1, Math.min(36, monthsHorizon));
  const refDate = new Date(referenceDateStr);
  const schedule: SinkingFundScheduleItem[] = [];

  let highestMaturingAmount = 0;
  let peakMonth: string | null = null;

  for (let i = 0; i < horizon; i++) {
    const d = new Date(refDate.getFullYear(), refDate.getMonth() + i, 1);
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, "0");
    const monthKey = `${y}-${m}`;

    const maturingGoals = goals
      .filter((g) => g.targetDate.slice(0, 7) === monthKey)
      .map((g) => ({
        id: g.id,
        name: g.name,
        targetAmount: g.targetAmount,
        remainingAmount: Math.max(0, g.targetAmount - g.currentAmount),
        category: g.category,
      }));

    const totalMaturingAmount = maturingGoals.reduce((sum, g) => sum + g.targetAmount, 0);

    // Active goals whose target date is this month or in the future
    const ongoingGoals = goals.filter((g) => {
      const isTargetInFuture = g.targetDate >= `${monthKey}-01`;
      return isTargetInFuture && !g.isCompleted && g.currentAmount < g.targetAmount;
    });

    const totalMonthlyFundingRequired = ongoingGoals.reduce((sum, g) => {
      return (
        sum +
        calculateMonthlySavingsRequired(
          g.targetAmount,
          g.currentAmount,
          g.targetDate,
          `${monthKey}-01`
        )
      );
    }, 0);

    if (totalMaturingAmount > highestMaturingAmount) {
      highestMaturingAmount = totalMaturingAmount;
      peakMonth = monthKey;
    }

    schedule.push({
      month: monthKey,
      maturingGoals,
      totalMaturingAmount,
      totalMonthlyFundingRequired,
      isPeakMonth: false,
    });
  }

  if (highestMaturingAmount > 0 && peakMonth) {
    for (const item of schedule) {
      if (item.month === peakMonth) {
        item.isPeakMonth = true;
      }
    }
  }

  return {
    horizonMonths: horizon,
    schedule,
    peakMonth,
    highestMaturingAmount,
  };
}
