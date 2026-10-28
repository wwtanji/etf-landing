import type { UcitsEtf, UsEtf } from "@/lib/server/etf-schema";
import { getEtfDataset } from "@/lib/server/etfs";

/** Fields of data/etfs.json that the page renders (quotes stay server-side). */
export type EtfGroup = UsEtf["group"];

export type UsEtfView = Pick<
  UsEtf,
  | "ticker"
  | "name"
  | "issuer"
  | "index"
  | "group"
  | "ter_pct"
  | "ter_as_of"
  | "aum_usd"
  | "aum_scope"
  | "as_of_date"
  | "retrieved_at"
  | "source_url"
  | "ucits_twin_ids"
>;

export type UcitsEtfView = Pick<
  UcitsEtf,
  | "isin"
  | "ticker"
  | "name"
  | "issuer"
  | "domicile"
  | "index"
  | "distribution"
  | "ter_pct"
  | "ter_as_of"
  | "aum_usd"
  | "aum_scope"
  | "as_of_date"
  | "retrieved_at"
  | "source_url"
  | "us_counterparts"
  | "index_match"
>;

export type LandingData = {
  retrievedAt: string;
  /** max TER ÷ min TER within group sp500 (unformatted). */
  sp500TerRatio: number;
  etfs: UsEtfView[];
  ucits: UcitsEtfView[];
};

export function getLandingData(): LandingData {
  const dataset = getEtfDataset();
  const sp500Ters = dataset.etfs.filter((e) => e.group === "sp500").map((e) => e.ter_pct);
  if (sp500Ters.length === 0) throw new Error("data/etfs.json has no sp500 rows for the hero ratio");
  return {
    retrievedAt: dataset.retrieved_at,
    sp500TerRatio: Math.max(...sp500Ters) / Math.min(...sp500Ters),
    etfs: dataset.etfs.map((e) => ({
      ticker: e.ticker,
      name: e.name,
      issuer: e.issuer,
      index: e.index,
      group: e.group,
      ter_pct: e.ter_pct,
      ter_as_of: e.ter_as_of,
      aum_usd: e.aum_usd,
      aum_scope: e.aum_scope,
      as_of_date: e.as_of_date,
      retrieved_at: e.retrieved_at,
      source_url: e.source_url,
      ucits_twin_ids: e.ucits_twin_ids,
    })),
    ucits: dataset.ucits.map((u) => ({
      isin: u.isin,
      ticker: u.ticker,
      name: u.name,
      issuer: u.issuer,
      domicile: u.domicile,
      index: u.index,
      distribution: u.distribution,
      ter_pct: u.ter_pct,
      ter_as_of: u.ter_as_of,
      aum_usd: u.aum_usd,
      aum_scope: u.aum_scope,
      as_of_date: u.as_of_date,
      retrieved_at: u.retrieved_at,
      source_url: u.source_url,
      us_counterparts: u.us_counterparts,
      index_match: u.index_match,
    })),
  };
}
