const czkFormat = new Intl.NumberFormat("cs-CZ", { maximumFractionDigits: 0 });
const terFormat = new Intl.NumberFormat("cs-CZ", {
  minimumFractionDigits: 2,
  maximumFractionDigits: 4,
});
const upToOneDecimal = new Intl.NumberFormat("cs-CZ", { maximumFractionDigits: 1 });
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

/** Fund size in billions of USD, max. 1 decimal (§5.5): "814,8 mld. USD", "1 000 mld. USD". */
export function formatUsdSize(usd: number): string {
  return `${upToOneDecimal.format(usd / 1e9)}\u00a0mld.\u00a0USD`;
}

/** Hero ratio: floored to one decimal, cs-CZ ("4,7"). */
export function formatRatio(ratio: number): string {
  return oneDecimal.format(Math.floor(ratio * 10) / 10);
}
