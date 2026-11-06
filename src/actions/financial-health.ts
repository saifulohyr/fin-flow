"use server";

import { financialHealthInputSchema, FinancialHealthInput } from "@/lib/validations/financial-health";
import {
  evaluateFinancialHealth,
  FinancialHealthEvaluation,
} from "@/lib/financial-health-engine";
import { ActionResponse } from "@/actions/budget";

export interface HealthEvalResponse {
  evaluation: FinancialHealthEvaluation;
  input: FinancialHealthInput;
  evaluatedAt: string;
}

/**
 * Validates input and runs the 5-pillar financial health evaluation.
 * ponytail: stateless; persist snapshot to DB (financial_health_snapshots table) once auth is wired.
 */
export async function evaluateFinancialHealthAction(
  rawData: unknown
): Promise<ActionResponse<HealthEvalResponse>> {
  const result = financialHealthInputSchema.safeParse(rawData);

  if (!result.success) {
    const flat = result.error.flatten();
    const firstField = Object.entries(flat.fieldErrors).find(([, v]) => v && v.length > 0);
    const message = firstField
      ? `${firstField[0]}: ${firstField[1]![0]}`
      : flat.formErrors[0] ?? "Input tidak valid";
    return { success: false, error: message };
  }

  const input = result.data;
  const evaluation = evaluateFinancialHealth(input);

  return {
    success: true,
    data: {
      evaluation,
      input,
      evaluatedAt: new Date().toISOString(),
    },
  };
}

/**
 * Quick-evaluate: accepts partial numeric fields (missing fields default to 0).
 * Useful for dashboard widgets where not all data is loaded yet.
 */
export async function quickHealthSnapshotAction(
  partial: Partial<FinancialHealthInput>
): Promise<ActionResponse<HealthEvalResponse>> {
  const defaults: FinancialHealthInput = {
    liquidAssets: 0,
    totalAssets: 0,
    totalDebt: 0,
    monthlyIncome: 0,
    monthlyExpenses: 0,
    monthlyEssentialBurn: 0,
    monthlyDebtPayment: 0,
  };
  return evaluateFinancialHealthAction({ ...defaults, ...partial });
}

/**
 * Compares two health evaluations and returns a delta report for trend indicators.
 * ponytail: assumes both evaluations are already computed; add time-series store when snapshots are persisted.
 */
export async function compareHealthSnapshotsAction(
  current: FinancialHealthInput,
  previous: FinancialHealthInput
): Promise<
  ActionResponse<{
    scoreDelta: number;
    gradeChanged: boolean;
    pillarDeltas: { key: string; delta: number }[];
    current: FinancialHealthEvaluation;
    previous: FinancialHealthEvaluation;
  }>
> {
  const [curResult, prevResult] = await Promise.all([
    evaluateFinancialHealthAction(current),
    evaluateFinancialHealthAction(previous),
  ]);

  if (!curResult.success || !curResult.data)
    return { success: false, error: curResult.error ?? "Evaluasi saat ini gagal" };
  if (!prevResult.success || !prevResult.data)
    return { success: false, error: prevResult.error ?? "Evaluasi sebelumnya gagal" };

  const cur = curResult.data.evaluation;
  const prev = prevResult.data.evaluation;

  const pillarDeltas = cur.pillars.map((p, i) => ({
    key: p.key,
    delta: p.score - (prev.pillars[i]?.score ?? 0),
  }));

  return {
    success: true,
    data: {
      scoreDelta: cur.overallScore - prev.overallScore,
      gradeChanged: cur.grade !== prev.grade,
      pillarDeltas,
      current: cur,
      previous: prev,
    },
  };
}
