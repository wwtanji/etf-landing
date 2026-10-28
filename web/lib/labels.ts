import { formatDate, formatUsdSize } from "@/lib/format";
import type { EtfGroup, UcitsEtfView, UsEtfView } from "@/lib/landing-data";

export const GROUP_LABELS: Record<EtfGroup, string> = {
  sp500: "S&P 500",
  us_total: "Celý americký trh",
  world: "Celý svět",
  developed_ex_us: "Vyspělé trhy mimo USA",
  emerging: "Rozvíjející se trhy",
  us_bonds: "Americké dluhopisy",
};

const AUM_SCOPE_LABELS: Record<UsEtfView["aum_scope"], string> = {
  fund: "celý fond",
  etf_share_class: "ETF třída akcií",
  share_class: "třída akcií",
};

const DOMICILE_LABELS: Record<string, string> = {
  IE: "Irsko",
  LU: "Lucembursko",
  US: "USA",
};

export const DISTRIBUTION_LABELS: Record<UcitsEtfView["distribution"], string> = {
  accumulating: "akumulační",
  distributing: "distribuční",
};

export const MATCH_LABELS = { same: "stejný index", similar: "podobný index" } as const;

type Dated = Pick<UsEtfView, "ter_as_of" | "retrieved_at">;

/** Display rule §7.2: dated TER, else "TER dle prospektu, staženo {retrieved_at}". */
export function terDateNote(row: Dated): string {
  return row.ter_as_of
    ? `TER k ${formatDate(row.ter_as_of)}`
    : `TER dle prospektu, staženo ${formatDate(row.retrieved_at)}`;
}

/** Fund size split into scope label and value; null when the dataset has no size. */
export function fundSize(
  row: Pick<UsEtfView, "aum_scope" | "aum_usd">,
): { label: string; value: string } | null {
  if (row.aum_usd === null) return null;
  return { label: AUM_SCOPE_LABELS[row.aum_scope], value: formatUsdSize(row.aum_usd) };
}

export function domicileLabel(code: string): string {
  return DOMICILE_LABELS[code] ?? code;
}

export type EtfGroupSection = { group: EtfGroup; etfs: UsEtfView[] };

/** Groups in dataset order of first appearance. */
export function groupEtfs(etfs: UsEtfView[]): EtfGroupSection[] {
  const groups: EtfGroupSection[] = [];
  for (const etf of etfs) {
    const existing = groups.find((g) => g.group === etf.group);
    if (existing) existing.etfs.push(etf);
    else groups.push({ group: etf.group, etfs: [etf] });
  }
  return groups;
}
