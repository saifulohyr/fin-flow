"use server";

import {
  aggregateSpendingByDate,
  calculateSpendingStats,
  calculateSpendingGrowth,
  DailySpending,
  SpendingStats,
} from "@/lib/spending-analytics";
import { ActionResponse } from "@/actions/budget";

export interface AnalyticsFilterInput {
  startDate?: string;
  endDate?: string;
}

export interface SpendingAnalyticsSummary {
  daily: DailySpending[];
  stats: SpendingStats;
}

/**
 * Server action to fetch and compute daily spending and summary stats with optional date filters.
 * ponytail: operates on client-supplied transactions; migrate to DB query once auth session context is in place.
 */
export async function getSpendingAnalyticsAction(
  transactions: { date: string; amount: number; type: string }[],
  filter?: AnalyticsFilterInput
): Promise<ActionResponse<SpendingAnalyticsSummary>> {
  if (filter?.startDate && !/^\d{4}-\d{2}-\d{2}$/.test(filter.startDate)) {
    return {
      success: false,
      error: "Format startDate tidak valid (harus YYYY-MM-DD)",
    };
  }

  if (filter?.endDate && !/^\d{4}-\d{2}-\d{2}$/.test(filter.endDate)) {
    return {
      success: false,
      error: "Format endDate tidak valid (harus YYYY-MM-DD)",
    };
  }

  let filtered = transactions;
  if (filter?.startDate) {
    filtered = filtered.filter((t) => t.date >= filter.startDate!);
  }
  if (filter?.endDate) {
    filtered = filtered.filter((t) => t.date <= filter.endDate!);
  }

  const daily = aggregateSpendingByDate(filtered);
  const stats = calculateSpendingStats(filtered);

  return {
    success: true,
    data: {
      daily,
      stats,
    },
  };
}

/**
 * Server action to evaluate period-over-period spending comparison.
 */
export async function comparePeriodSpendingAction(
  currentPeriodTotal: number,
  previousPeriodTotal: number
): Promise<ActionResponse<{ growthRate: number; isIncreased: boolean }>> {
  if (currentPeriodTotal < 0 || previousPeriodTotal < 0) {
    return {
      success: false,
      error: "Total pengeluaran tidak boleh bernilai negatif",
    };
  }

  const growthRate = calculateSpendingGrowth(previousPeriodTotal, currentPeriodTotal);
  return {
    success: true,
    data: {
      growthRate,
      isIncreased: currentPeriodTotal > previousPeriodTotal,
    },
  };
}
