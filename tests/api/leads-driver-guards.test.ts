/**
 * plan §8.4: storage-driver guards. Each case runs in a fresh module graph
 * (vi.resetModules) so no singleton created by another test can mask the check.
 */
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { leadRequest, uniqueEmail, validBody } from "./helpers";

const ENV_KEYS = ["STORAGE_DRIVER", "VERCEL_ENV", "UPSTASH_REDIS_REST_URL", "UPSTASH_REDIS_REST_TOKEN"] as const;
const saved: Record<string, string | undefined> = {};
let logged: string[] = [];

beforeEach(() => {
  for (const k of ENV_KEYS) saved[k] = process.env[k];
  vi.resetModules();
  logged = [];
  for (const m of ["log", "info", "warn", "error"] as const) {
    vi.spyOn(console, m).mockImplementation((...args: unknown[]) => {
      logged.push(args.map(String).join(" "));
    });
  }
});

afterEach(() => {
  for (const k of ENV_KEYS) {
    if (saved[k] === undefined) delete process.env[k];
    else process.env[k] = saved[k];
  }
  vi.restoreAllMocks();
});

async function postFresh(email: string) {
  const { POST } = await import("@/app/api/leads/route");
  const res = await POST(leadRequest(validBody({ email })));
  return { res, json: (await res.json()) as Record<string, unknown> };
}

describe("storage driver guards", () => {
  it("memory driver is refused on VERCEL_ENV=production → 500 server_error + memory_driver_in_production log", async () => {
    process.env.STORAGE_DRIVER = "memory";
    process.env.VERCEL_ENV = "production";
    const email = uniqueEmail("prod");
    const { res, json } = await postFresh(email);
    expect(res.status).toBe(500);
    expect(json).toEqual({ ok: false, error: "server_error" });
    expect(res.headers.get("cache-control") ?? "").toMatch(/no-store/);
    const events = logged.flatMap((l) => {
      try {
        return [JSON.parse(l) as { event?: string }];
      } catch {
        return [];
      }
    });
    expect(events.some((e) => e.event === "memory_driver_in_production")).toBe(true);
    expect(logged.join("\n").toLowerCase()).not.toContain(email);
  });

  it("upstash driver without UPSTASH_* env → 500 server_error, email never logged", async () => {
    process.env.STORAGE_DRIVER = "upstash";
    delete process.env.VERCEL_ENV;
    delete process.env.UPSTASH_REDIS_REST_URL;
    delete process.env.UPSTASH_REDIS_REST_TOKEN;
    const email = uniqueEmail("noenv");
    const { res, json } = await postFresh(email);
    expect(res.status).toBe(500);
    expect(json).toEqual({ ok: false, error: "server_error" });
    expect(logged.join("\n").toLowerCase()).not.toContain(email);
  });

  it("STORAGE_DRIVER unset defaults to upstash (→ 500 without credentials, not memory)", async () => {
    delete process.env.STORAGE_DRIVER;
    delete process.env.VERCEL_ENV;
    delete process.env.UPSTASH_REDIS_REST_URL;
    delete process.env.UPSTASH_REDIS_REST_TOKEN;
    const { res, json } = await postFresh(uniqueEmail("default"));
    expect(res.status).toBe(500);
    expect(json).toEqual({ ok: false, error: "server_error" });
  });
});
