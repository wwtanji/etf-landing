/** Calculator bounds and defaults (plan §6.1). */
export const AMOUNT_MIN_CZK = 1_000;
export const AMOUNT_MAX_CZK = 100_000_000;
export const DEFAULT_AMOUNT_CZK = 500_000;
export const AMOUNT_CHIPS_CZK = [100_000, 500_000, 1_000_000] as const;
export const YEARS_CHIPS = [5, 10, 20, 30] as const;
export const DEFAULT_YEARS = 20;
export const DEFAULT_ETF_A = "SPY";
export const DEFAULT_ETF_B = "SPYM";

/** Total fund cost in CZK over `years`, assuming 0 % gross return; fee charged on the declining balance. Unrounded. */
export function totalFeeCzk(amountCzk: number, terPct: number, years: number): number {
  return amountCzk * (1 - Math.pow(1 - terPct / 100, years));
}

export function isValidAmount(amountCzk: number): boolean {
  return Number.isInteger(amountCzk) && amountCzk >= AMOUNT_MIN_CZK && amountCzk <= AMOUNT_MAX_CZK;
}
