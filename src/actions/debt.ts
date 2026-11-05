"use server";

import {
  debtSchema,
  createDebtSchema,
  DebtInput,
  CreateDebtInput,
} from "@/lib/validations/debt";
import {
  summarizeDebts,
  projectPayoff,
  projectAllPayoffs,
  calculateDebtToAssetRatio,
  DebtEntry,
  DebtSummary,
  PayoffProjection,
  DebtToAssetRatio,
} from "@/lib/debt-engine";
import { ActionResponse } from "@/actions/budget";

/** Map validated DebtInput → engine DebtEntry (bps → percent). */
function toDebtEntry(d: DebtInput): DebtEntry {
  return {
    id: d.id,
    name: d.name,
    type: d.type,
    outstandingBalance: d.outstandingBalance,
    // Schema stores percent directly; DB schema stores bps but actions receive
    // already-converted percent values via the validation schema.
    interestRateAnnual: d.interestRateAnnual,
    monthlyPayment: d.monthlyPayment,
    status: d.status,
  };
}

/** Validates a full debt payload. */
export async function validateDebtAction(
  rawData: unknown
): Promise<ActionResponse<DebtInput>> {
  const result = debtSchema.safeParse(rawData);
  if (!result.success) {
    return {
      success: false,
      error: "Validasi data utang gagal. Periksa kembali form isian.",
      fieldErrors: result.error.flatten().fieldErrors,
    };
  }
  return { success: true, data: result.data };
}

/** Validates a create-debt payload (id/status optional). */
export async function validateCreateDebtAction(
  rawData: unknown
): Promise<ActionResponse<CreateDebtInput>> {
  const result = createDebtSchema.safeParse(rawData);
  if (!result.success) {
    return {
      success: false,
      error: "Validasi penambahan utang gagal. Periksa data input.",
      fieldErrors: result.error.flatten().fieldErrors,
    };
  }
  return { success: true, data: result.data };
}

/** Aggregates active-debt summary across all debts. */
export async function getDebtSummaryAction(
  debts: DebtInput[]
): Promise<ActionResponse<DebtSummary>> {
  if (!Array.isArray(debts)) {
    return { success: false, error: "Daftar utang harus berupa array." };
  }
  const entries = debts.map(toDebtEntry);
  return { success: true, data: summarizeDebts(entries) };
}

/** Projects payoff schedule for a single debt. */
export async function getDebtPayoffProjectionAction(
  debt: DebtInput,
  fromYearMonth?: string
): Promise<ActionResponse<PayoffProjection>> {
  const valid = debtSchema.safeParse(debt);
  if (!valid.success) {
    return { success: false, error: "Data utang tidak valid." };
  }

  const ref = fromYearMonth || new Date().toISOString().slice(0, 7); // YYYY-MM
  if (!/^\d{4}-\d{2}$/.test(ref)) {
    return { success: false, error: "Format fromYearMonth harus YYYY-MM." };
  }

  const projection = projectPayoff(toDebtEntry(valid.data), ref);
  return { success: true, data: projection };
}

/** Projects payoff for all active debts. */
export async function getAllDebtPayoffProjectionsAction(
  debts: DebtInput[],
  fromYearMonth?: string
): Promise<ActionResponse<PayoffProjection[]>> {
  if (!Array.isArray(debts)) {
    return { success: false, error: "Daftar utang harus berupa array." };
  }

  const ref = fromYearMonth || new Date().toISOString().slice(0, 7);
  if (!/^\d{4}-\d{2}$/.test(ref)) {
    return { success: false, error: "Format fromYearMonth harus YYYY-MM." };
  }

  const entries = debts.map(toDebtEntry);
  return { success: true, data: projectAllPayoffs(entries, ref) };
}

/**
 * Calculates debt-to-asset ratio for financial health check.
 * totalAssets: sum of all account balances (IDR integer).
 */
export async function getDebtToAssetRatioAction(
  totalAssets: number,
  debts: DebtInput[]
): Promise<ActionResponse<DebtToAssetRatio>> {
  if (typeof totalAssets !== "number" || isNaN(totalAssets) || totalAssets < 0) {
    return { success: false, error: "Total aset harus berupa angka non-negatif." };
  }
  if (!Array.isArray(debts)) {
    return { success: false, error: "Daftar utang harus berupa array." };
  }

  const entries = debts.map(toDebtEntry);
  const summary = summarizeDebts(entries);
  const ratio = calculateDebtToAssetRatio(totalAssets, summary.totalDebt);
  return { success: true, data: ratio };
}

/**
 * Records a manual payment against a debt — returns updated outstanding balance.
 * Does not persist; caller writes the returned balance to DB.
 * ponytail: no snowball/avalanche multi-debt auto-routing; add when debt list UI lands.
 */
export async function recordDebtPaymentAction(
  debt: DebtInput,
  paymentAmount: number
): Promise<ActionResponse<{ newBalance: number; overpaid: boolean }>> {
  if (paymentAmount <= 0 || isNaN(paymentAmount)) {
    return { success: false, error: "Nominal pembayaran harus berupa angka positif." };
  }

  const valid = debtSchema.safeParse(debt);
  if (!valid.success) {
    return { success: false, error: "Data utang tidak valid." };
  }

  if (valid.data.status !== "active") {
    return { success: false, error: "Hanya utang aktif yang bisa dilunasi." };
  }

  const newBalance = Math.max(0, valid.data.outstandingBalance - paymentAmount);
  const overpaid = paymentAmount > valid.data.outstandingBalance;

  return { success: true, data: { newBalance, overpaid } };
}
