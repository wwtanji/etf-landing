import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import { EtfDatasetTestSchema } from "../support/etf-schema";
import { loadRawDataset } from "../support/dataset";

describe("GET /api/etfs (plan §8.3)", () => {
  it("exports runtime and dynamic, and no preferredRegion (region comes from web/vercel.json)", async () => {
    const route = await import("@/app/api/etfs/route");
    expect(route.runtime).toBe("nodejs");
    expect(route).not.toHaveProperty("preferredRegion");
    expect(route.dynamic).toBe("force-static");
  });

  it("web/vercel.json pins functions to fra1 (plan §10)", () => {
    const cfg = JSON.parse(readFileSync(resolve(__dirname, "../../web/vercel.json"), "utf8")) as { regions?: unknown };
    expect(cfg.regions).toEqual(["fra1"]);
  });

  it("returns 200, the cache header, and a body that passes the tests' own schema", async () => {
    const { GET } = await import("@/app/api/etfs/route");
    const res = await GET();
    expect(res.status).toBe(200);
    expect(res.headers.get("cache-control")).toBe("public, s-maxage=86400, stale-while-revalidate=604800");
    const body: unknown = await res.json();
    const parsed = EtfDatasetTestSchema.safeParse(body);
    expect(parsed.success ? [] : parsed.error.issues).toEqual([]);
    // "exactly the validated dataset object"
    expect(body).toEqual(loadRawDataset());
  });
});

describe("getEtfDataset / EtfDatasetSchema (plan §8.1)", () => {
  it("getEtfDataset returns the dataset and caches it", async () => {
    const { getEtfDataset } = await import("@/lib/server/etfs");
    const a = getEtfDataset();
    expect(a).toEqual(loadRawDataset());
    expect(getEtfDataset()).toBe(a);
  });

  it("the api's EtfDatasetSchema accepts the real data and rejects a Nasdaq row", async () => {
    const { EtfDatasetSchema } = await import("@/lib/server/etf-schema");
    const raw = loadRawDataset() as { etfs: { exchange: string }[] };
    expect(EtfDatasetSchema.safeParse(raw).success).toBe(true);
    const bad = structuredClone(raw);
    bad.etfs[0].exchange = "Nasdaq";
    expect(EtfDatasetSchema.safeParse(bad).success).toBe(false);
  });

  it("the api's EtfDatasetSchema keeps optional and extra ucits quote keys (§7.2 r1)", async () => {
    const { EtfDatasetSchema } = await import("@/lib/server/etf-schema");
    const raw = structuredClone(loadRawDataset()) as { ucits: { quotes: Record<string, string> }[] };
    Object.assign(raw.ucits[0].quotes, { index: "S&P 500", registration: "Czech Republic", extra_note: "kept" });
    const res = EtfDatasetSchema.safeParse(raw);
    expect(res.success).toBe(true);
    expect((res.data as typeof raw).ucits[0].quotes).toMatchObject({ index: "S&P 500", registration: "Czech Republic", extra_note: "kept" });
    delete raw.ucits[0].quotes.index;
    delete raw.ucits[0].quotes.registration;
    expect(EtfDatasetSchema.safeParse(raw).success).toBe(true);
  });
});
