/**
 * Indonesian Rupiah and Financial Parsing Utilities
 * Handles exact formatting, tabular numbers, and shorthand parsing ('35rb', '1.5jt', etc.)
 */

export function formatIDR(amount: number): string {
  return new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
}

export function parseIDRShorthand(input: string): number | null {
  const clean = input.trim().toLowerCase().replace(/\s+/g, "");
  if (!clean) return null;

  // Match numbers followed by common Indonesian multipliers: k/rb/ribu, jt/juta, m/miliar
  const match = clean.match(/^([0-9]+(?:[.,][0-9]+)?)(k|rb|ribu|jt|juta|m|miliar)?$/i);
  if (!match) return null;

  const rawNum = match[1].replace(",", ".");
  const num = parseFloat(rawNum);
  if (isNaN(num)) return null;

  const unit = match[2]?.toLowerCase();
  switch (unit) {
    case "k":
    case "rb":
    case "ribu":
      return Math.round(num * 1_000);
    case "jt":
    case "juta":
      return Math.round(num * 1_000_000);
    case "m":
    case "miliar":
      return Math.round(num * 1_000_000_000);
    default:
      return Math.round(num);
  }
}
