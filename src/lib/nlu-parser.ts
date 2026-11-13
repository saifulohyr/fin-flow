import { parseIDRShorthand } from "./currency";

export interface ParsedTransaction {
  raw: string;
  amount: number | null;
  account: string | null;
  category: string;
  type: "income" | "expense";
  title: string;
}

const ACCOUNT_ALIASES: Record<string, string> = {
  bca: "BCA Tabungan",
  mandiri: "Bank Mandiri",
  bri: "Bank BRI",
  bni: "Bank BNI",
  jago: "Bank Jago",
  gopay: "GoPay",
  ovo: "OVO",
  dana: "DANA",
  shopeepay: "ShopeePay",
  linkaja: "LinkAja",
  cash: "Tunai / Cash",
  tunai: "Tunai / Cash",
};

const CATEGORY_KEYWORDS: Record<string, { category: string; type: "income" | "expense" }> = {
  // Income
  gaji: { category: "Gaji & Upah", type: "income" },
  payroll: { category: "Gaji & Upah", type: "income" },
  freelance: { category: "Freelance", type: "income" },
  bonus: { category: "Bonus & Hadiah", type: "income" },
  transferan: { category: "Pemasukan Lain", type: "income" },
  dividen: { category: "Investasi", type: "income" },
  investasi: { category: "Investasi", type: "income" },
  // Food & Drink
  makan: { category: "Makanan & Minuman", type: "expense" },
  kopi: { category: "Makanan & Minuman", type: "expense" },
  sarapan: { category: "Makanan & Minuman", type: "expense" },
  padang: { category: "Makanan & Minuman", type: "expense" },
  minum: { category: "Makanan & Minuman", type: "expense" },
  warteg: { category: "Makanan & Minuman", type: "expense" },
  // Transport
  gojek: { category: "Transportasi", type: "expense" },
  grab: { category: "Transportasi", type: "expense" },
  bensin: { category: "Transportasi", type: "expense" },
  pertamax: { category: "Transportasi", type: "expense" },
  parkir: { category: "Transportasi", type: "expense" },
  tol: { category: "Transportasi", type: "expense" },
  // Bills & Utilities
  listrik: { category: "Tagihan & Utilitas", type: "expense" },
  pln: { category: "Tagihan & Utilitas", type: "expense" },
  wifi: { category: "Tagihan & Utilitas", type: "expense" },
  indihome: { category: "Tagihan & Utilitas", type: "expense" },
  pulsa: { category: "Tagihan & Utilitas", type: "expense" },
  pdam: { category: "Tagihan & Utilitas", type: "expense" },
  // Lifestyle
  laundry: { category: "Gaya Hidup", type: "expense" },
  potong: { category: "Gaya Hidup", type: "expense" },
  salon: { category: "Gaya Hidup", type: "expense" },
};

export function parseTransactionNLU(input: string): ParsedTransaction {
  const trimmed = input.trim();
  if (!trimmed) {
    return {
      raw: input,
      amount: null,
      account: null,
      category: "Lain-lain",
      type: "expense",
      title: "",
    };
  }

  const tokens = trimmed.split(/\s+/);
  let amount: number | null = null;
  let account: string | null = null;
  let category = "Lain-lain";
  let type: "income" | "expense" = "expense";
  const titleTokens: string[] = [];

  for (const token of tokens) {
    const lower = token.toLowerCase();

    // Check if token is amount
    const parsedAmount = parseIDRShorthand(token);
    if (parsedAmount !== null && amount === null && /^[0-9]/.test(token)) {
      amount = parsedAmount;
      continue;
    }

    // Check if token is account alias
    if (ACCOUNT_ALIASES[lower] && !account) {
      account = ACCOUNT_ALIASES[lower];
      continue;
    }

    // Check category match
    if (CATEGORY_KEYWORDS[lower]) {
      category = CATEGORY_KEYWORDS[lower].category;
      type = CATEGORY_KEYWORDS[lower].type;
    }

    titleTokens.push(token);
  }

  const title = titleTokens.join(" ").trim() || (type === "income" ? "Pemasukan" : "Pengeluaran");

  return {
    raw: input,
    amount,
    account: account ?? "Tunai / Cash",
    category,
    type,
    title,
  };
}
