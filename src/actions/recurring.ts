"use server";

import {
  recurringTransactionSchema,
  RecurringTransactionInput,
} from "@/lib/validations/recurring";
import {
  calculateMonthlyCommitment,
  getUpcomingBills,
  projectCashflow,
  calculateCashflowRunway,
  breakdownObligationsByCategory,
  processDueRecurring,
  ProcessedDueResult,
  RunwayResult,
} from "@/lib/recurring-engine";
import { ActionResponse } from "@/actions/budget";

export interface CashflowProjectionParams {
  currentBalance: number;
  monthlyIncome: number;
  recurringItems: RecurringTransactionInput[];
  dailyBurn: number;
  daysToProject?: number;
}

export interface CashflowProjectionOutput {
  projectedBalance: number;
  fixedExpenseTotal: number;
  discretionaryExpenseTotal: number;
  runway: RunwayResult;
}

export interface RecurringSummaryOutput {
  monthlyFixedCommitment: number;
  activeCount: number;
  categoryBreakdown: Record<string, { totalMonthly: number; count: number }>;
}

/**
 * Validates a recurring transaction payload before database insertion or state update.
 */
export async function validateRecurringAction(
  rawData: unknown
): Promise<ActionResponse<RecurringTransactionInput>> {
  const result = recurringTransactionSchema.safeParse(rawData);

  if (!result.success) {
    const errorIssues = result.error.flatten();
    return {
      success: false,
      error: "Validasi kewajiban rutin gagal. Periksa kembali data input.",
      fieldErrors: errorIssues.fieldErrors,
    };
  }

  return {
    success: true,
    data: result.data,
  };
}

/**
 * Computes upcoming bills within a given horizon (default 7 days).
 */
export async function getUpcomingBillsAction(
  items: RecurringTransactionInput[],
  referenceDate?: string,
  daysAhead: number = 7
): Promise<ActionResponse<{ upcoming: RecurringTransactionInput[]; totalUpcomingAmount: number }>> {
  const ref = referenceDate || new Date().toISOString().slice(0, 10);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(ref)) {
    return {
      success: false,
      error: "Format referenceDate tidak valid (harus YYYY-MM-DD)",
    };
  }

  const upcoming = getUpcomingBills(items, ref, daysAhead);
  const totalUpcomingAmount = upcoming.reduce((sum, item) => sum + item.amount, 0);

  return {
    success: true,
    data: {
      upcoming,
      totalUpcomingAmount,
    },
  };
}

/**
 * Server action to process due recurring items, instantiate transactions, and bump due dates.
 */
export async function processDueRecurringAction(
  recurringItems: RecurringTransactionInput[],
  referenceDate?: string
): Promise<ActionResponse<ProcessedDueResult>> {
  const ref = referenceDate || new Date().toISOString().slice(0, 10);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(ref)) {
    return {
      success: false,
      error: "Format referenceDate tidak valid (harus YYYY-MM-DD)",
    };
  }

  const result = processDueRecurring(recurringItems, ref);

  return {
    success: true,
    data: result,
  };
}

/**
 * Generates forward cashflow projection and runway metrics.
 */
export async function getCashflowProjectionAction(
  params: CashflowProjectionParams
): Promise<ActionResponse<CashflowProjectionOutput>> {
  if (params.currentBalance === undefined || isNaN(params.currentBalance)) {
    return {
      success: false,
      error: "Saldo saat ini wajib berupa angka yang valid.",
    };
  }

  if (params.monthlyIncome < 0 || params.dailyBurn < 0) {
    return {
      success: false,
      error: "Estimasi pendapatan dan burn rate harian tidak boleh bernilai negatif.",
    };
  }

  const daysToProject = params.daysToProject || 30;
  const projection = projectCashflow(
    params.currentBalance,
    params.monthlyIncome,
    params.recurringItems,
    params.dailyBurn,
    daysToProject
  );

  const monthlyCommitment = calculateMonthlyCommitment(params.recurringItems);
  const monthlyDiscretionary = params.dailyBurn * 30;
  const netMonthlyDeficit = monthlyCommitment + monthlyDiscretionary - params.monthlyIncome;

  const runway = calculateCashflowRunway(params.currentBalance, netMonthlyDeficit);

  return {
    success: true,
    data: {
      ...projection,
      runway,
    },
  };
}

/**
 * Computes high-level monthly commitments and category breakdown.
 */
export async function getRecurringSummaryAction(
  items: RecurringTransactionInput[]
): Promise<ActionResponse<RecurringSummaryOutput>> {
  if (!Array.isArray(items)) {
    return {
      success: false,
      error: "Daftar transaksi rutin tidak valid.",
    };
  }

  const monthlyFixedCommitment = calculateMonthlyCommitment(items);
  const activeCount = items.filter((i) => i.isActive).length;
  const categoryBreakdown = breakdownObligationsByCategory(items);

  return {
    success: true,
    data: {
      monthlyFixedCommitment,
      activeCount,
      categoryBreakdown,
    },
  };
}
