/**
 * Parses natural-language financial descriptions into FinancialHealthInput.
 * ponytail: keyword-based extraction only; upgrade to LLM function-calling when chat agent is live.
 */

import { parseIDRShorthand } from "./currency";
import type { FinancialHealthInput } from "./validations/financial-health";

interface ExtractedField {
  key: keyof FinancialHealthInput;
  value: number;
  source: string;
}

const FIELD_PATTERNS: {
  key: keyof FinancialHealthInput;
  patterns: RegExp[];
}[] = [
  {
    key: "monthlyIncome",
    patterns: [
      /(?:gaji|salary|income|pemasukan|pendapatan)\s*(?:bulanan?\s*)?(?:rp\.?\s*)?([0-9][0-9.,]*\s*(?:rb|jt|juta|ribu|k|m)?)/i,
    ],
  },
  {
    key: "monthlyExpenses",
    patterns: [
      /(?:pengeluaran|expenses?|belanja)\s*(?:bulanan?\s*)?(?:rp\.?\s*)?([0-9][0-9.,]*\s*(?:rb|jt|juta|ribu|k|m)?)/i,
    ],
  },
  {
    key: "liquidAssets",
    patterns: [
      /(?:tabungan|savings?|saldo|kas|liquid|likuid)\s*(?:rp\.?\s*)?([0-9][0-9.,]*\s*(?:rb|jt|juta|ribu|k|m)?)/i,
    ],
  },
  {
    key: "totalDebt",
    patterns: [
      /(?:hutang|utang|debt|pinjaman|loan)\s*(?:total\s*)?(?:rp\.?\s*)?([0-9][0-9.,]*\s*(?:rb|jt|juta|ribu|k|m)?)/i,
    ],
  },
  {
    key: "monthlyDebtPayment",
    patterns: [
      /(?:cicilan|installment|angsuran)\s*(?:bulanan?\s*)?(?:rp\.?\s*)?([0-9][0-9.,]*\s*(?:rb|jt|juta|ribu|k|m)?)/i,
    ],
  },
  {
    key: "totalAssets",
    patterns: [
      /(?:total\s*aset|total\s*assets?|kekayaan)\s*(?:rp\.?\s*)?([0-9][0-9.,]*\s*(?:rb|jt|juta|ribu|k|m)?)/i,
    ],
  },
  {
    key: "monthlyEssentialBurn",
    patterns: [
      /(?:kebutuhan\s*pokok|essential|esensial|kebutuhan\s*wajib)\s*(?:bulanan?\s*)?(?:rp\.?\s*)?([0-9][0-9.,]*\s*(?:rb|jt|juta|ribu|k|m)?)/i,
    ],
  },
];

export function extractHealthFieldsFromText(text: string): {
  extracted: ExtractedField[];
  partial: Partial<FinancialHealthInput>;
  confidence: number;
} {
  const extracted: ExtractedField[] = [];
  const partial: Partial<FinancialHealthInput> = {};

  for (const { key, patterns } of FIELD_PATTERNS) {
    for (const pattern of patterns) {
      const match = text.match(pattern);
      if (match?.[1]) {
        const value = parseIDRShorthand(match[1].trim());
        if (value !== null && value > 0) {
          extracted.push({ key, value, source: match[0] });
          partial[key] = value;
          break;
        }
      }
    }
  }

  const totalFields = FIELD_PATTERNS.length;
  const confidence = Math.round((extracted.length / totalFields) * 100);

  return { extracted, partial, confidence };
}

export function buildHealthInputFromChat(
  text: string,
  existing?: Partial<FinancialHealthInput>
): { input: FinancialHealthInput; fieldsFound: number; confidence: number } {
  const { partial, extracted, confidence } = extractHealthFieldsFromText(text);

  const merged = { ...existing, ...partial };

  const input: FinancialHealthInput = {
    liquidAssets: merged.liquidAssets ?? 0,
    totalAssets: merged.totalAssets ?? merged.liquidAssets ?? 0,
    totalDebt: merged.totalDebt ?? 0,
    monthlyIncome: merged.monthlyIncome ?? 0,
    monthlyExpenses: merged.monthlyExpenses ?? 0,
    monthlyEssentialBurn: merged.monthlyEssentialBurn ?? merged.monthlyExpenses ?? 0,
    monthlyDebtPayment: merged.monthlyDebtPayment ?? 0,
    budgetedAmount: merged.budgetedAmount,
    actualBudgetSpend: merged.actualBudgetSpend,
  };

  return { input, fieldsFound: extracted.length, confidence };
}
