/**
 * Operator identity shown in the footer and the privacy notice (plan §5.7).
 * Fill ONLY with values supplied by the user. Empty values render a visible
 * "doplníme před spuštěním" notice locally/on previews and fail the
 * production build (see next.config.ts).
 */
export const siteConfig = {
  operatorName: "DEMO: není skutečný provozovatel (ukázková stránka)",
  operatorId: "00000000",
  operatorAddress: "DEMO adresa, Praha",
  contactEmail: "demo@example.com",
} satisfies Record<string, string>;

export type OperatorField = keyof typeof siteConfig;

export const OPERATOR_MISSING_TEXT = "Údaje provozovatele doplníme před spuštěním";

export function missingOperatorFields(): OperatorField[] {
  return (Object.keys(siteConfig) as OperatorField[]).filter(
    (key) => siteConfig[key].trim() === "",
  );
}
