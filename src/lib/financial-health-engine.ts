// ponytail: Fixed standard 5-pillar weights (25/20/20/20/15); upgrade to customizable weights or lifestyle profiles (freelancer, business, single) when user preferences are added.

import type { FinancialHealthInput, HealthGrade } from "./validations/financial-health";

export type PillarStatus = "excellent" | "healthy" | "warning" | "critical";
export type PillarKey =
  | "emergency_fund"
  | "debt_service"
  | "savings_rate"
  | "solvency"
  | "budget_discipline";

export interface PillarDetail {
  key: PillarKey;
  name: string;
  score: number;
  maxScore: number;
  status: PillarStatus;
  formattedValue: string;
  benchmark: string;
  advice: string;
}

export interface FinancialHealthEvaluation {
  overallScore: number; // 0–100
  grade: HealthGrade;
  gradeLabel: string;
  summary: string;
  runwayDays: number;
  runwayMonths: number;
  pillars: PillarDetail[];
  recommendations: string[];
}

/** Evaluates emergency fund safety net in months and runway days. */
export function evaluateEmergencyFund(
  liquidAssets: number,
  monthlyEssentialBurn: number
): { months: number; runwayDays: number; score: number; status: PillarStatus; advice: string } {
  if (monthlyEssentialBurn <= 0) {
    const months = liquidAssets > 0 ? 12 : 0;
    return {
      months,
      runwayDays: months * 30,
      score: liquidAssets > 0 ? 25 : 0,
      status: liquidAssets > 0 ? "excellent" : "critical",
      advice: liquidAssets > 0 ? "Pengeluaran esensial nihil tercatat; aset likuid mencukupi." : "Belum ada dana likuid tercatat.",
    };
  }

  const months = Number((liquidAssets / monthlyEssentialBurn).toFixed(1));
  const runwayDays = Math.round(months * 30);

  let score = 0;
  let status: PillarStatus = "critical";
  let advice = "";

  if (months >= 6) {
    score = 25;
    status = "excellent";
    advice = "Dana darurat sangat kuat (≥6 bulan pengeluaran esensial).";
  } else if (months >= 3) {
    score = Math.round(18 + ((months - 3) / 3) * 7);
    status = "healthy";
    advice = "Dana darurat aman (3–6 bulan). Tingkatkan bertahap ke target 6 bulan.";
  } else if (months >= 1) {
    score = Math.round(8 + ((months - 1) / 2) * 10);
    status = "warning";
    advice = "Dana darurat minim (1–3 bulan). Rentan jika ada gangguan pemasukan mendadak.";
  } else {
    score = Math.max(0, Math.round(months * 8));
    status = "critical";
    advice = "Dana darurat di bawah 1 bulan. Prioritaskan akumulasi pos likuid segera.";
  }

  return { months, runwayDays, score, status, advice };
}

/** Evaluates Debt Service Ratio (DSR) against total income. */
export function evaluateDebtService(
  monthlyDebtPayment: number,
  monthlyIncome: number,
  totalDebt: number
): { dsrPercent: number; score: number; status: PillarStatus; advice: string } {
  if (totalDebt <= 0 || monthlyDebtPayment <= 0) {
    return {
      dsrPercent: 0,
      score: 20,
      status: "excellent",
      advice: "Bebas dari beban cicilan bulanan (DSR 0%).",
    };
  }

  if (monthlyIncome <= 0) {
    return {
      dsrPercent: 100,
      score: 0,
      status: "critical",
      advice: "Ada cicilan berjalan tanpa pemasukan bulanan tercatat.",
    };
  }

  const ratio = monthlyDebtPayment / monthlyIncome;
  const dsrPercent = Number((ratio * 100).toFixed(1));

  let score = 0;
  let status: PillarStatus = "critical";
  let advice = "";

  if (ratio <= 0.15) {
    score = 20;
    status = "excellent";
    advice = "Beban cicilan sangat ringan (≤15% pemasukan).";
  } else if (ratio <= 0.30) {
    score = Math.round(15 + ((0.30 - ratio) / 0.15) * 5);
    status = "healthy";
    advice = "Beban cicilan berada dalam batas ideal (15%–30%).";
  } else if (ratio <= 0.45) {
    score = Math.round(5 + ((0.45 - ratio) / 0.15) * 10);
    status = "warning";
    advice = "Cicilan mulai membebani arus kas (30%–45%). Batasi pinjaman baru.";
  } else {
    score = Math.max(0, Math.round(5 - (ratio - 0.45) * 10));
    status = "critical";
    advice = "Porsi hutang di atas ambang aman (>45%). Pertimbangkan pelunasan dipercepat.";
  }

  return { dsrPercent, score, status, advice };
}

/** Evaluates monthly savings rate: (income - expenses) / income. */
export function evaluateSavingsRate(
  monthlyIncome: number,
  monthlyExpenses: number
): { savingsRatePercent: number; score: number; status: PillarStatus; advice: string } {
  if (monthlyIncome <= 0) {
    return {
      savingsRatePercent: 0,
      score: 0,
      status: "critical",
      advice: "Belum ada arus kas pemasukan bulanan tercatat.",
    };
  }

  const netSavings = monthlyIncome - monthlyExpenses;
  const rate = netSavings / monthlyIncome;
  const savingsRatePercent = Number((rate * 100).toFixed(1));

  let score = 0;
  let status: PillarStatus = "critical";
  let advice = "";

  if (rate >= 0.30) {
    score = 20;
    status = "excellent";
    advice = "Rasio menabung sangat tinggi (≥30%). Kapasitas investasi optimal.";
  } else if (rate >= 0.20) {
    score = Math.round(15 + ((rate - 0.20) / 0.10) * 5);
    status = "healthy";
    advice = "Rasio menabung ideal (20%–30%). Menjaga keseimbangan konsumsi dan aset.";
  } else if (rate >= 0.05) {
    score = Math.round(7 + ((rate - 0.05) / 0.15) * 8);
    status = "warning";
    advice = "Kapasitas menabung tipis (5%–20%). Pangkas pengeluaran diskresioner.";
  } else {
    score = rate > 0 ? 3 : 0;
    status = "critical";
    advice = rate < 0 ? "Arus kas negatif (defisit pengeluaran > pemasukan)." : "Hampir seluruh pendapatan terpakai tanpa sisa tabungan.";
  }

  return { savingsRatePercent, score, status, advice };
}

/** Evaluates solvency: Net Worth / Total Assets. */
export function evaluateSolvency(
  totalAssets: number,
  totalDebt: number
): { solvencyPercent: number; netWorth: number; score: number; status: PillarStatus; advice: string } {
  const netWorth = totalAssets - totalDebt;

  if (totalAssets <= 0) {
    return {
      solvencyPercent: totalDebt > 0 ? -100 : 0,
      netWorth,
      score: totalDebt > 0 ? 0 : 10,
      status: totalDebt > 0 ? "critical" : "warning",
      advice: totalDebt > 0 ? "Aset nol dengan kewajiban aktif (insolvensi total)." : "Belum ada pencatatan saldo akun aset.",
    };
  }

  const ratio = netWorth / totalAssets;
  const solvencyPercent = Number((ratio * 100).toFixed(1));

  let score = 0;
  let status: PillarStatus = "critical";
  let advice = "";

  if (ratio >= 0.70) {
    score = 20;
    status = "excellent";
    advice = "Struktur neraca sangat kokoh (≥70% aset bebas hutang).";
  } else if (ratio >= 0.50) {
    score = Math.round(15 + ((ratio - 0.50) / 0.20) * 5);
    status = "healthy";
    advice = "Solvabilitas sehat (50%–70% aset bersih).";
  } else if (ratio >= 0.25) {
    score = Math.round(8 + ((ratio - 0.25) / 0.25) * 7);
    status = "warning";
    advice = "Kewajiban mendekati aset bersih (25%–50%). Jaga likuiditas.";
  } else {
    score = Math.max(0, Math.round(ratio * 32));
    status = "critical";
    advice = "Leverage berlebih (<25% aset bersih). Risiko likuidasi tinggi jika terjadi guncangan.";
  }

  return { solvencyPercent, netWorth, score, status, advice };
}

/** Evaluates budget discipline: Actual Spend vs Budgeted Amount. */
export function evaluateBudgetDiscipline(
  budgetedAmount?: number,
  actualSpend?: number
): { disciplinePercent: number; score: number; status: PillarStatus; advice: string } {
  if (!budgetedAmount || budgetedAmount <= 0) {
    return {
      disciplinePercent: 100,
      score: 12,
      status: "healthy",
      advice: "Belum ada alokasi anggaran aktif (skor netral default).",
    };
  }

  const spend = actualSpend ?? 0;
  const ratio = spend / budgetedAmount;
  const disciplinePercent = Number((ratio * 100).toFixed(1));

  let score = 0;
  let status: PillarStatus = "critical";
  let advice = "";

  if (ratio <= 0.90) {
    score = 15;
    status = "excellent";
    advice = "Pengeluaran terkendali di bawah 90% pagu anggaran.";
  } else if (ratio <= 1.00) {
    score = Math.round(12 + ((1.00 - ratio) / 0.10) * 3);
    status = "healthy";
    advice = "Pengeluaran sesuai target alokasi anggaran bulanan.";
  } else if (ratio <= 1.15) {
    score = Math.round(5 + ((1.15 - ratio) / 0.15) * 7);
    status = "warning";
    advice = "Pengeluaran sedikit melebihi anggaran (100%–115%). Lakukan penyesuaian pos.";
  } else {
    score = Math.max(0, Math.round(5 - (ratio - 1.15) * 10));
    status = "critical";
    advice = "Anggaran terlampaui signifikan (>115%). Kendalikan pengeluaran harian segera.";
  }

  return { disciplinePercent, score, status, advice };
}

/** Synthesizes all 5 pillars into a single holistic financial health evaluation. */
export function evaluateFinancialHealth(input: FinancialHealthInput): FinancialHealthEvaluation {
  const ef = evaluateEmergencyFund(input.liquidAssets, input.monthlyEssentialBurn);
  const ds = evaluateDebtService(input.monthlyDebtPayment, input.monthlyIncome, input.totalDebt);
  const sr = evaluateSavingsRate(input.monthlyIncome, input.monthlyExpenses);
  const sol = evaluateSolvency(input.totalAssets, input.totalDebt);
  const bd = evaluateBudgetDiscipline(input.budgetedAmount, input.actualBudgetSpend);

  const pillars: PillarDetail[] = [
    {
      key: "emergency_fund",
      name: "Dana Darurat & Runway",
      score: ef.score,
      maxScore: 25,
      status: ef.status,
      formattedValue: `${ef.months} Bulan (${ef.runwayDays} Hari)`,
      benchmark: "Target: ≥3–6 Bulan",
      advice: ef.advice,
    },
    {
      key: "debt_service",
      name: "Beban Hutang (DSR)",
      score: ds.score,
      maxScore: 20,
      status: ds.status,
      formattedValue: `${ds.dsrPercent}%`,
      benchmark: "Ambang Aman: ≤30%",
      advice: ds.advice,
    },
    {
      key: "savings_rate",
      name: "Rasio Menabung",
      score: sr.score,
      maxScore: 20,
      status: sr.status,
      formattedValue: `${sr.savingsRatePercent}%`,
      benchmark: "Target: ≥20%",
      advice: sr.advice,
    },
    {
      key: "solvency",
      name: "Solvabilitas & Ekuitas",
      score: sol.score,
      maxScore: 20,
      status: sol.status,
      formattedValue: `${sol.solvencyPercent}%`,
      benchmark: "Sehat: ≥50%",
      advice: sol.advice,
    },
    {
      key: "budget_discipline",
      name: "Disiplin Anggaran",
      score: bd.score,
      maxScore: 15,
      status: bd.status,
      formattedValue: `${bd.disciplinePercent}%`,
      benchmark: "Target: ≤100%",
      advice: bd.advice,
    },
  ];

  const overallScore = Math.min(100, Math.max(0, pillars.reduce((sum, p) => sum + p.score, 0)));

  let grade: HealthGrade = "critical";
  let gradeLabel = "Kondisi Kritis";
  let summary = "";

  if (overallScore >= 85) {
    grade = "prime";
    gradeLabel = "Sangat Sehat";
    summary = "Kondisi keuangan prima. Neraca kokoh, likuiditas aman, dan rasio hutang terkendali penuh.";
  } else if (overallScore >= 70) {
    grade = "healthy";
    gradeLabel = "Sehat Finansial";
    summary = "Pilar keuangan solid. Lanjutkan konsistensi tabungan dan optimalkan investasi bertahap.";
  } else if (overallScore >= 50) {
    grade = "caution";
    gradeLabel = "Perlu Perhatian";
    summary = "Terdapat beberapa indikator rentan yang membutuhkan penyesuaian belanja atau percepatan cadangan kas.";
  } else {
    grade = "critical";
    gradeLabel = "Kondisi Kritis";
    summary = "Kesehatan keuangan berisiko tinggi. Ambil langkah prioritas restrukturisasi hutang atau pangkas pengeluaran segera.";
  }

  // Generate prioritized recommendations based on lowest-scoring pillars
  const sortedPillars = [...pillars].sort((a, b) => a.score / a.maxScore - b.score / b.maxScore);
  const recommendations: string[] = [];

  for (const p of sortedPillars) {
    if (p.status === "critical" || p.status === "warning") {
      recommendations.push(p.advice);
    }
  }

  if (recommendations.length === 0) {
    recommendations.push("Pertahankan disiplin alokasi kas dan alokasikan kelebihan surplus ke instrumen investasi produktif.");
  }

  return {
    overallScore,
    grade,
    gradeLabel,
    summary,
    runwayDays: ef.runwayDays,
    runwayMonths: ef.months,
    pillars,
    recommendations,
  };
}
