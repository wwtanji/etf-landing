import { z } from "zod";

const isoDate = z.iso.date();
const httpsUrl = z.url({ protocol: /^https$/ });
const nonEmpty = z.string().min(1);
const currency = z.string().regex(/^[A-Z]{3}$/);
const terPct = z.number().gt(0).lt(2);
const aumUsd = z.number().int().positive().nullable();
const aumScope = z.enum(["fund", "etf_share_class", "share_class"]);
const isin = z.string().regex(/^[A-Z]{2}[A-Z0-9]{9}[0-9]$/);
const usTicker = z.string().regex(/^[A-Z]{1,5}$/);

export const UsEtfSchema = z.object({
  ticker: usTicker,
  name: nonEmpty,
  issuer: nonEmpty,
  exchange: z.enum(["NYSE", "NYSE Arca"]),
  domicile: z.literal("US"),
  index: nonEmpty,
  group: z.enum(["sp500", "us_total", "world", "developed_ex_us", "emerging", "us_bonds"]),
  currency,
  ter_pct: terPct,
  ter_as_of: isoDate.nullable(),
  aum_usd: aumUsd,
  aum_scope: aumScope,
  aum_as_of: isoDate.nullable(),
  as_of_date: isoDate,
  retrieved_at: isoDate,
  source_url: httpsUrl,
  evidence_urls: z.array(httpsUrl),
  quotes: z.object({ ter: nonEmpty, aum: nonEmpty, exchange: nonEmpty, index: nonEmpty }),
  ucits_twin_ids: z.array(isin),
});

export const UcitsEtfSchema = z.object({
  isin,
  ticker: nonEmpty,
  name: nonEmpty,
  issuer: nonEmpty,
  domicile: nonEmpty,
  index: nonEmpty,
  distribution: z.enum(["accumulating", "distributing"]),
  currency,
  ter_pct: terPct,
  ter_as_of: isoDate.nullable(),
  aum_usd: aumUsd,
  aum_scope: aumScope,
  aum_as_of: isoDate.nullable(),
  as_of_date: isoDate,
  retrieved_at: isoDate,
  source_url: httpsUrl,
  evidence_urls: z.array(httpsUrl),
  quotes: z.object({
    ter: nonEmpty,
    aum: nonEmpty,
    isin: nonEmpty,
    registration: nonEmpty.optional(),
  }),
  us_counterparts: z.array(usTicker),
  index_match: z.record(z.string(), z.enum(["same", "similar"])),
});

type Row = z.infer<typeof UsEtfSchema> | z.infer<typeof UcitsEtfSchema>;

function checkDates(row: Row, path: (string | number)[], ctx: z.RefinementCtx): void {
  if ((row.aum_usd === null) !== (row.aum_as_of === null)) {
    ctx.addIssue({ code: "custom", path, message: "aum_as_of must be null iff aum_usd is null" });
  }
  const expected = row.aum_as_of ?? row.ter_as_of;
  if (expected === null || row.as_of_date !== expected) {
    ctx.addIssue({
      code: "custom",
      path: [...path, "as_of_date"],
      message: "as_of_date must equal aum_as_of if present, else ter_as_of",
    });
  }
}

export const EtfDatasetSchema = z
  .object({
    schema_version: z.literal(1),
    retrieved_at: isoDate,
    retrieved_by: z.string(),
    quote_convention: z.string(),
    notes: z.array(z.string()),
    etfs: z.array(UsEtfSchema).min(1),
    ucits: z.array(UcitsEtfSchema).min(1),
  })
  .superRefine((data, ctx) => {
    const tickers = new Set(data.etfs.map((e) => e.ticker));
    const isins = new Set(data.ucits.map((u) => u.isin));
    if (tickers.size !== data.etfs.length) {
      ctx.addIssue({ code: "custom", path: ["etfs"], message: "duplicate ticker" });
    }
    if (isins.size !== data.ucits.length) {
      ctx.addIssue({ code: "custom", path: ["ucits"], message: "duplicate isin" });
    }
    const ucitsByIsin = new Map(data.ucits.map((u) => [u.isin, u]));
    const etfByTicker = new Map(data.etfs.map((e) => [e.ticker, e]));

    data.etfs.forEach((etf, i) => {
      checkDates(etf, ["etfs", i], ctx);
      for (const id of etf.ucits_twin_ids) {
        const twin = ucitsByIsin.get(id);
        if (!twin || !twin.us_counterparts.includes(etf.ticker)) {
          ctx.addIssue({
            code: "custom",
            path: ["etfs", i, "ucits_twin_ids"],
            message: `${id} missing in ucits[] or not linked back to ${etf.ticker}`,
          });
        }
      }
    });

    data.ucits.forEach((u, i) => {
      checkDates(u, ["ucits", i], ctx);
      for (const ticker of u.us_counterparts) {
        const etf = etfByTicker.get(ticker);
        if (!etf || !etf.ucits_twin_ids.includes(u.isin)) {
          ctx.addIssue({
            code: "custom",
            path: ["ucits", i, "us_counterparts"],
            message: `${ticker} missing in etfs[] or not linked back to ${u.isin}`,
          });
        }
      }
      const matchKeys = Object.keys(u.index_match).sort();
      const counterparts = [...u.us_counterparts].sort();
      if (matchKeys.join(",") !== counterparts.join(",")) {
        ctx.addIssue({
          code: "custom",
          path: ["ucits", i, "index_match"],
          message: "index_match keys must equal us_counterparts",
        });
      }
    });
  });

export type EtfDataset = z.infer<typeof EtfDatasetSchema>;
export type UsEtf = z.infer<typeof UsEtfSchema>;
export type UcitsEtf = z.infer<typeof UcitsEtfSchema>;
