import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const here = path.dirname(fileURLToPath(import.meta.url));

export const DATASET_PATH = path.resolve(here, "../../data/etfs.json");

/** Raw (unvalidated) contents of data/etfs.json. */
export function loadRawDataset(): unknown {
  return JSON.parse(readFileSync(DATASET_PATH, "utf8"));
}

/** Minimal typed view used by e2e/unit helpers (validated separately in data tests). */
export type RawEtf = {
  ticker: string;
  group: string;
  ter_pct: number;
  ter_as_of: string | null;
  as_of_date: string;
  source_url: string;
  ucits_twin_ids: string[];
};
export type RawUcits = { isin: string; ticker: string; ter_pct: number; source_url: string; us_counterparts: string[] };
export type RawDataset = { retrieved_at: string; etfs: RawEtf[]; ucits: RawUcits[] };

export function loadDataset(): RawDataset {
  return loadRawDataset() as RawDataset;
}

/** plan §5.1: max TER ÷ min TER within group sp500, floored to 1 decimal, cs-CZ ("4,7"). */
export function heroRatioText(ds: RawDataset): string {
  const ters = ds.etfs.filter((e) => e.group === "sp500").map((e) => e.ter_pct);
  const ratio = Math.floor((Math.max(...ters) / Math.min(...ters)) * 10) / 10;
  return new Intl.NumberFormat("cs-CZ", { minimumFractionDigits: 1, maximumFractionDigits: 1 }).format(ratio);
}

/** plan §5.1 eyebrow date "28. 10. 2026" from an ISO date. */
export function czDate(iso: string): string {
  const [y, m, d] = iso.split("-").map(Number);
  return `${d}. ${m}. ${y}`;
}
