const czkFormat = new Intl.NumberFormat("cs-CZ", { maximumFractionDigits: 0 });
const terFormat = new Intl.NumberFormat("cs-CZ", {
  minimumFractionDigits: 2,
  maximumFractionDigits: 4,
});
const oneDecimal = new Intl.NumberFormat("cs-CZ", {
  minimumFractionDigits: 1,
  maximumFractionDigits: 1,
});

/** Whole Kč, cs-CZ grouping (U+00A0), e.g. "9 366 Kč". */
export function formatCzk(value: number): string {
  return `${czkFormat.format(Math.round(value))} Kč`;
}

/** Grouped integer without unit, e.g. "500 000". */
export function formatInteger(value: number): string {
  return czkFormat.format(Math.round(value));
}

/** TER percent, e.g. 0.0945 → "0,0945 %", 0.02 → "0,02 %". */
export function formatTer(terPct: number): string {
  return `${terFormat.format(terPct)}\u00a0%`;
}

/** "2026-10-28" → "28. 10. 2026" with U+00A0 spaces (string-based, no timezone shift). */
export function formatDate(isoDate: string): string {
  const [year, month, day] = isoDate.split("-");
  return `${Number(day)}.\u00a0${Number(month)}.\u00a0${year}`;
}

/** Fund size in USD with Czech scale words: "814,8 mld. USD", "1,0 bil. USD". */
export function formatUsdSize(usd: number): string {
  if (usd >= 1e12) return `${oneDecimal.format(usd / 1e12)}\u00a0bil.\u00a0USD`;
  if (usd >= 1e9) return `${oneDecimal.format(usd / 1e9)}\u00a0mld.\u00a0USD`;
  return `${oneDecimal.format(usd / 1e6)}\u00a0mil.\u00a0USD`;
}

/** Hero ratio: floored to one decimal, cs-CZ ("4,7"). */
export function formatRatio(ratio: number): string {
  return oneDecimal.format(Math.floor(ratio * 10) / 10);
}
