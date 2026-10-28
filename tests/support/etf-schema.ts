/**
 * The tests agent's own Zod schema for data/etfs.json, written from docs/plan.md §7.2
 * (independent of web/lib/server/etf-schema.ts on purpose).
 */
import { z } from "zod";

const isCalendarDate = (s: string): boolean => {
  const d = new Date(`${s}T00:00:00Z`);
  return !Number.isNaN(d.getTime()) && d.toISOString().slice(0, 10) === s;
};

export const IsoDate = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, "expected YYYY-MM-DD")
  .refine(isCalendarDate, "not a real calendar date");

export const HttpsUrl = z
  .string()
  .url()
  .refine((u) => new URL(u).protocol === "https:", "expected https URL");

const NonEmpty = z.string().trim().min(1);

export const GROUPS = ["sp500", "us_total", "world", "developed_ex_us", "emerging", "us_bonds"] as const;

const Currency = z.string().regex(/^[A-Z]{3}$/);
const TerPct = z.number().gt(0).lt(2);
const AumUsd = z.number().int().positive().nullable();

export const UsEtfSchema = z.strictObject({
  ticker: z.string().regex(/^[A-Z]{1,5}$/),
  name: NonEmpty,
  issuer: NonEmpty,
  exchange: z.enum(["NYSE", "NYSE Arca"]),
  domicile: z.literal("US"),
  index: NonEmpty,
  group: z.enum(GROUPS),
  currency: Currency,
  ter_pct: TerPct,
  ter_as_of: IsoDate.nullable(),
  aum_usd: AumUsd,
  aum_scope: z.enum(["fund", "etf_share_class", "share_class"]),
  aum_as_of: IsoDate.nullable(),
  as_of_date: IsoDate,
  retrieved_at: IsoDate,
  source_url: HttpsUrl,
  evidence_urls: z.array(HttpsUrl),
  quotes: z.strictObject({
    ter: NonEmpty,
    aum: NonEmpty,
    exchange: NonEmpty,
    index: NonEmpty,
  }),
  ucits_twin_ids: z.array(z.string()),
});

export const IsinRegex = /^[A-Z]{2}[A-Z0-9]{9}[0-9]$/;

export const UcitsEtfSchema = z.strictObject({
  isin: z.string().regex(IsinRegex),
  ticker: NonEmpty,
  name: NonEmpty,
  issuer: NonEmpty,
  domicile: z.string().regex(/^[A-Z]{2}$/),
  index: NonEmpty,
  distribution: z.enum(["accumulating", "distributing"]),
  currency: Currency,
  ter_pct: TerPct,
  ter_as_of: IsoDate.nullable(),
  aum_usd: AumUsd,
  aum_scope: z.enum(["fund", "etf_share_class", "share_class"]),
  aum_as_of: IsoDate.nullable(),
  as_of_date: IsoDate,
  retrieved_at: IsoDate,
  source_url: HttpsUrl,
  evidence_urls: z.array(HttpsUrl),
  // §7.2 lists ter/aum/isin (+ optional registration); extra quote keys are additional
  // evidence, accepted as long as they are non-empty strings.
  quotes: z
    .object({
      ter: NonEmpty,
      aum: NonEmpty,
      isin: NonEmpty,
      registration: NonEmpty.optional(),
    })
    .catchall(NonEmpty),
  us_counterparts: z.array(z.string().regex(/^[A-Z]{1,5}$/)).min(1),
  index_match: z.record(z.string(), z.enum(["same", "similar"])),
});

export const EtfDatasetTestSchema = z.strictObject({
  schema_version: z.literal(1),
  retrieved_at: IsoDate,
  retrieved_by: NonEmpty,
  quote_convention: NonEmpty,
  notes: z.array(z.string()),
  etfs: z.array(UsEtfSchema),
  ucits: z.array(UcitsEtfSchema),
});

export type TestDataset = z.infer<typeof EtfDatasetTestSchema>;
