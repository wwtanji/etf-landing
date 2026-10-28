import { describe, expect, it } from "vitest";
import { EtfDatasetTestSchema } from "../support/etf-schema";
import { loadRawDataset } from "../support/dataset";

describe("GET /api/etfs (plan §8.3)", () => {
  it("exports runtime, preferredRegion and dynamic", async () => {
    const route = await import("@/app/api/etfs/route");
    expect(route.runtime).toBe("nodejs");
    expect(route.preferredRegion).toBe("fra1");
    expect(route.dynamic).toBe("force-static");
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
});
