"use server";

import { BudgetSchema, BudgetInput } from "@/lib/validations/budget";
import { calculateBudgetProgress, BudgetProgress } from "@/lib/budget-engine";
import { RawTransaction } from "@/lib/finance-engine";

export interface ActionResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
  fieldErrors?: Record<string, string[]>;
}

export interface BudgetAlert {
  budgetId: string;
  categoryId: string;
  severity: "warning" | "exceeded";
  message: string;
  percentage: number;
}

/**
 * Validates budget payload for creation or mutation.
 * ponytail: currently validates in-memory before persistent DB insertion.
 */
export async function validateBudgetAction(rawData: unknown): Promise<ActionResponse<BudgetInput>> {
  const result = BudgetSchema.safeParse(rawData);

  if (!result.success) {
    const errorIssues = result.error.flatten();
    return {
      success: false,
      error: "Validasi anggaran gagal. Periksa kolom yang diisi.",
      fieldErrors: errorIssues.fieldErrors,
    };
  }

  return {
    success: true,
    data: result.data,
  };
}

/**
 * Evaluates active budget thresholds and generates warnings/exceeded notifications.
 */
export async function evaluateBudgetAlertsAction(
  budgets: BudgetInput[],
  transactions: RawTransaction[],
  referenceDate?: string
): Promise<ActionResponse<BudgetAlert[]>> {
  if (!Array.isArray(budgets) || !Array.isArray(transactions)) {
    return {
      success: false,
      error: "Data input anggaran atau transaksi tidak valid.",
    };
  }

  const alerts: BudgetAlert[] = [];

  for (const budget of budgets) {
    const progress: BudgetProgress = calculateBudgetProgress(budget, transactions, referenceDate);

    if (progress.status === "exceeded") {
      alerts.push({
        budgetId: budget.id,
        categoryId: budget.categoryId,
        severity: "exceeded",
        message: `Anggaran ${budget.categoryId} terlampaui sebesar ${progress.overspentAmount.toLocaleString("id-ID")}`,
        percentage: progress.percentage,
      });
    } else if (progress.status === "warning") {
      alerts.push({
        budgetId: budget.id,
        categoryId: budget.categoryId,
        severity: "warning",
        message: `Anggaran ${budget.categoryId} mencapai ${progress.percentage}%, sisa Rp ${progress.remaining.toLocaleString("id-ID")}`,
        percentage: progress.percentage,
      });
    }
  }

  return {
    success: true,
    data: alerts,
  };
}
