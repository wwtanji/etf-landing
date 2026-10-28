import { describe, expect, it } from "vitest";
import { EtfDatasetTestSchema, type TestDataset } from "../support/etf-schema";
import { heroRatioText, loadRawDataset } from "../support/dataset";

const raw = loadRawDataset();
const parsed = EtfDatasetTestSchema.safeParse(raw);
// Fall back to the raw object so invariant tests still report their own findings.
const ds = (parsed.success ? parsed.data : raw) as TestDataset;

describe("data/etfs.json – schema (plan §7.2)", () => {
  it("validates against the tests' own Zod schema", () => {
    expect(parsed.success ? [] : parsed.error.issues).toEqual([]);
  });

  it("own schema rejects contract violations (guards against a permissive schema)", () => {
    const mutate = (fn: (d: TestDataset) => void) => {
      const copy = structuredClone(raw) as TestDataset;
      fn(copy);
      return EtfDatasetTestSchema.safeParse(copy).success;
    };
    expect(mutate((d) => void ((d.etfs[0] as { exchange: string }).exchange = "Nasdaq"))).toBe(false);
    expect(mutate((d) => void (d.etfs[0].source_url = "http://example.com"))).toBe(false);
    expect(mutate((d) => void (d.etfs[0].ter_pct = 2))).toBe(false);
    expect(mutate((d) => void (d.etfs[0].as_of_date = "2026-02-30"))).toBe(false);
    expect(mutate((d) => void (d.etfs[0].quotes.ter = " "))).toBe(false);
    expect(mutate((d) => void (d.ucits[0].isin = "IE000XZSV71X"))).toBe(false);
    expect(mutate((d) => void ((d as { schema_version: number }).schema_version = 2))).toBe(false);
  });

  it("ucits quotes: index and registration are optional known keys; extra keys are preserved (§7.2 r1)", () => {
    const parse = (fn: (q: Record<string, unknown>) => void) => {
      const copy = structuredClone(raw) as TestDataset;
      fn(copy.ucits[0].quotes as Record<string, unknown>);
      return EtfDatasetTestSchema.safeParse(copy);
    };
    const without = parse((q) => {
      delete q.index;
      delete q.registration;
    });
    expect(without.success).toBe(true);
    const withKeys = parse((q) => {
      q.index = "S&P 500";
      q.registration = "Czech Republic";
      q.extra_note = "kept";
    });
    expect(withKeys.success).toBe(true);
    expect(withKeys.data?.ucits[0].quotes).toMatchObject({ index: "S&P 500", registration: "Czech Republic", extra_note: "kept" });
    expect(parse((q) => void (q.index = "")).success).toBe(false);
    expect(parse((q) => void (q.registration = " ")).success).toBe(false);
  });

  it("has 11 US ETF rows and 5 UCITS rows", () => {
    expect(ds.etfs).toHaveLength(11);
    expect(ds.ucits).toHaveLength(5);
  });

  it("has unique tickers and unique ISINs", () => {
    const tickers = ds.etfs.map((e) => e.ticker);
    const isins = ds.ucits.map((u) => u.isin);
    expect(new Set(tickers).size).toBe(tickers.length);
    expect(new Set(isins).size).toBe(isins.length);
  });

  it("every row has an https source_url, an as_of_date and non-empty quotes", () => {
    for (const row of [...ds.etfs, ...ds.ucits]) {
      const id = "isin" in row ? row.isin : row.ticker;
      expect(new URL(row.source_url).protocol, id).toBe("https:");
      expect(row.as_of_date, id).toMatch(/^\d{4}-\d{2}-\d{2}$/);
      const quotes = Object.values(row.quotes);
      expect(quotes.length, id).toBeGreaterThan(0);
      for (const q of quotes) expect(typeof q === "string" && q.trim().length > 0, id).toBe(true);
    }
  });

  it("no exchange is Nasdaq or Cboe", () => {
    for (const e of ds.etfs) {
      expect(e.exchange, e.ticker).not.toMatch(/nasdaq|cboe/i);
      expect(["NYSE", "NYSE Arca"], e.ticker).toContain(e.exchange);
    }
  });

  it("aum_as_of is null iff aum_usd is null", () => {
    for (const row of [...ds.etfs, ...ds.ucits]) {
      expect(row.aum_as_of === null, row.ticker).toBe(row.aum_usd === null);
    }
  });

  it("as_of_date = aum_as_of if present, else ter_as_of", () => {
    for (const row of [...ds.etfs, ...ds.ucits]) {
      const expected = row.aum_as_of ?? row.ter_as_of;
      expect(expected, `${row.ticker}: needs aum_as_of or ter_as_of`).not.toBeNull();
      expect(row.as_of_date, row.ticker).toBe(expected);
    }
  });

  it("no as-of date is later than the row's retrieval date", () => {
    for (const row of [...ds.etfs, ...ds.ucits]) {
      for (const d of [row.as_of_date, row.ter_as_of, row.aum_as_of]) {
        if (d !== null) expect(d <= row.retrieved_at, `${row.ticker} ${d}`).toBe(true);
      }
    }
  });
});

describe("data/etfs.json – cross-reference invariants (plan §7.2)", () => {
  const isins = new Set(ds.ucits.map((u) => u.isin));
  const tickers = new Set(ds.etfs.map((e) => e.ticker));

  it("every etfs[].ucits_twin_ids entry exists in ucits[].isin", () => {
    for (const e of ds.etfs) for (const id of e.ucits_twin_ids) expect(isins.has(id), `${e.ticker} → ${id}`).toBe(true);
  });

  it("every ucits[].us_counterparts entry exists in etfs[].ticker", () => {
    for (const u of ds.ucits) for (const t of u.us_counterparts) expect(tickers.has(t), `${u.isin} → ${t}`).toBe(true);
  });

  it("links are symmetric in both directions", () => {
    for (const e of ds.etfs) {
      for (const id of e.ucits_twin_ids) {
        const u = ds.ucits.find((x) => x.isin === id);
        expect(u?.us_counterparts ?? [], `${id} should list ${e.ticker}`).toContain(e.ticker);
      }
    }
    for (const u of ds.ucits) {
      for (const t of u.us_counterparts) {
        const e = ds.etfs.find((x) => x.ticker === t);
        expect(e?.ucits_twin_ids ?? [], `${t} should list ${u.isin}`).toContain(u.isin);
      }
    }
  });

  it("index_match keys equal us_counterparts", () => {
    for (const u of ds.ucits) {
      expect(Object.keys(u.index_match).sort(), u.isin).toEqual([...u.us_counterparts].sort());
    }
  });
});

describe("data/etfs.json – values the page and ads depend on (plan §5.1, §6.2, §7.3)", () => {
  const ter = (t: string) => ds.etfs.find((e) => e.ticker === t)?.ter_pct;

  it("fixture TER inputs match §6.2 (SPY 0.0945, SPYM 0.02, VOO 0.03, IVV 0.03)", () => {
    expect(ter("SPY")).toBe(0.0945);
    expect(ter("SPYM")).toBe(0.02);
    expect(ter("VOO")).toBe(0.03);
    expect(ter("IVV")).toBe(0.03);
  });

  it("hero ratio computed from the sp500 group is 4,7 (matches docs/ads.md)", () => {
    expect(heroRatioText(ds).replace(/\s/g, "")).toBe("4,7");
  });

  it("all UCITS rows are Irish, accumulating, USD (plan §7.3)", () => {
    for (const u of ds.ucits) {
      expect([u.domicile, u.distribution, u.currency], u.isin).toEqual(["IE", "accumulating", "USD"]);
    }
  });

  it("default calculator pair SPY/SPYM both have UCITS twins (calc-unlock row shows the lock)", () => {
    for (const t of ["SPY", "SPYM"]) {
      expect(ds.etfs.find((e) => e.ticker === t)?.ucits_twin_ids.length ?? 0, t).toBeGreaterThan(0);
    }
  });
});
