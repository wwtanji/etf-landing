import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import { CONSENT_VERSION, leadRequest, todayUtc, uniqueEmail, uniqueIp, validBody } from "./helpers";

process.env.STORAGE_DRIVER = "memory";

type RouteModule = typeof import("@/app/api/leads/route");
type StoreModule = typeof import("@/lib/server/lead-store");
let route: RouteModule;
let storeMod: StoreModule;

beforeAll(async () => {
  route = await import("@/app/api/leads/route");
  storeMod = await import("@/lib/server/lead-store");
});

// §8.2 step 8 / data minimisation: no log line may ever contain a full email.
const logSpies: ReturnType<typeof vi.spyOn>[] = [];
const emailsUsed: string[] = [];
beforeEach(() => {
  for (const m of ["log", "info", "warn", "error", "debug"] as const) {
    logSpies.push(vi.spyOn(console, m));
  }
});
afterEach(() => {
  const logged = logSpies.flatMap((s) => s.mock.calls.map((c: unknown[]) => c.map(String).join(" "))).join("\n").toLowerCase();
  const emails = emailsUsed.splice(0).map((e) => e.toLowerCase());
  for (const s of logSpies.splice(0)) s.mockRestore();
  for (const e of emails) expect(logged, `a log line contains the full email ${e}`).not.toContain(e);
});

async function send(body: unknown, opts?: Parameters<typeof leadRequest>[1]) {
  // Track real-looking emails only (an empty/partial string would trivially "match" any log).
  if (body && typeof body === "object" && "email" in body && typeof body.email === "string" && /.+@.+\..+/.test(body.email)) {
    emailsUsed.push(body.email.trim());
  }
  const res = await route.POST(leadRequest(body, opts));
  const text = await res.text();
  let json: unknown;
  try {
    json = JSON.parse(text);
  } catch {
    json = { __not_json: text };
  }
  return { res, json: json as Record<string, unknown> };
}

function expectErrorBody(json: Record<string, unknown>, error: string) {
  expect(json.ok).toBe(false);
  expect(typeof json.error).toBe("string");
  expect(json.error).toBe(error);
}

function expectNoStore(res: Response) {
  expect(res.headers.get("cache-control") ?? "").toMatch(/no-store/);
}

describe("route module exports (plan §8.1)", () => {
  it("exports runtime, preferredRegion and dynamic", () => {
    expect(route.runtime).toBe("nodejs");
    expect(route.preferredRegion).toBe("fra1");
    expect(route.dynamic).toBe("force-dynamic");
    expect(typeof route.POST).toBe("function");
  });

  it("config constants match the contract", async () => {
    const cfg = await import("@/lib/server/config");
    expect(cfg.CONSENT_VERSION).toBe(CONSENT_VERSION);
    expect(cfg.RATE_LIMIT_MAX).toBe(5);
    expect(cfg.RATE_LIMIT_WINDOW_SECONDS).toBe(600);
    expect(cfg.MAX_BODY_BYTES).toBe(4096);
    expect(cfg.HONEYPOT_FIELD).toBe("website");
  });
});

describe("POST /api/leads – happy path (plan §8.2)", () => {
  it("valid lead → 200 {ok:true}, record stored, counter +1", async () => {
    const store = storeMod.getLeadStore();
    const before = await store.countLeads("a", todayUtc());
    const body = validBody();
    const t0 = Date.now();
    const { res, json } = await send(body);
    expect(res.status).toBe(200);
    expect(json).toEqual({ ok: true });
    expectNoStore(res);

    const rec = await store.get(body.email as string);
    expect(rec).not.toBeNull();
    expect(rec?.email).toBe(body.email);
    expect(rec?.consent).toBe(true);
    expect(rec?.consent_version).toBe(CONSENT_VERSION);
    expect(rec?.variant).toBe("a");
    expect(rec?.page_path).toBe("/");
    expect(rec?.utm).toEqual(body.utm);
    // consented_at: server time, ISO 8601 UTC
    expect(rec?.consented_at).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d+)?Z$/);
    const ts = Date.parse(rec?.consented_at ?? "");
    expect(ts).toBeGreaterThanOrEqual(t0 - 1000);
    expect(ts).toBeLessThanOrEqual(Date.now() + 1000);
    // Data minimisation: only LeadRecord fields, no IP/UA/honeypot.
    expect(Object.keys(rec ?? {}).sort()).toEqual(
      ["consent", "consent_version", "consented_at", "email", "page_path", "utm", "variant"].sort(),
    );

    expect(await store.countLeads("a", todayUtc())).toBe(before + 1);
  });

  it("variant b on /b is stored and counted under b only", async () => {
    const store = storeMod.getLeadStore();
    const beforeA = await store.countLeads("a", todayUtc());
    const beforeB = await store.countLeads("b", todayUtc());
    const body = validBody({ variant: "b", page_path: "/b", utm: undefined });
    const { res } = await send(body);
    expect(res.status).toBe(200);
    expect(await store.countLeads("b", todayUtc())).toBe(beforeB + 1);
    expect(await store.countLeads("a", todayUtc())).toBe(beforeA);
    const rec = await store.get(body.email as string);
    expect(rec?.variant).toBe("b");
    expect(rec?.page_path).toBe("/b");
  });

  it("duplicate email → 200 {ok:true}, count unchanged, original record kept", async () => {
    const store = storeMod.getLeadStore();
    const email = uniqueEmail("dup");
    const first = await send(validBody({ email }));
    expect(first.res.status).toBe(200);
    const original = await store.get(email);
    const countA = await store.countLeads("a", todayUtc());
    const countB = await store.countLeads("b", todayUtc());

    // Advance the clock so an overwrite would change consented_at.
    vi.useFakeTimers({ toFake: ["Date"] });
    vi.setSystemTime(Date.now() + 60_000);
    const second = await send(validBody({ email, variant: "b", page_path: "/b" })).finally(() => vi.useRealTimers());
    expect(second.res.status).toBe(200);
    expect(second.json).toEqual({ ok: true });
    expect(await store.countLeads("a", todayUtc())).toBe(countA);
    expect(await store.countLeads("b", todayUtc())).toBe(countB);
    expect(await store.get(email)).toEqual(original);
  });

  it("uppercase/whitespace email is stored normalised (and dedupes against it)", async () => {
    const store = storeMod.getLeadStore();
    const normal = uniqueEmail("jana.novakova");
    const messy = `  ${normal.toUpperCase()}  `;
    const { res } = await send(validBody({ email: messy }));
    expect(res.status).toBe(200);
    const rec = await store.get(normal);
    expect(rec?.email).toBe(normal);
    const count = await store.countLeads("a", todayUtc());
    await send(validBody({ email: normal }));
    expect(await store.countLeads("a", todayUtc())).toBe(count);
  });

  it("utm values are trimmed and unknown keys stripped (utm and top level)", async () => {
    const store = storeMod.getLeadStore();
    const body = validBody({
      utm: { source: "  meta  ", term: "etf", evil: "x" },
      ip: "1.2.3.4",
      user_agent: "bot",
    });
    const { res } = await send(body);
    expect(res.status).toBe(200);
    const rec = await store.get(body.email as string);
    expect(rec?.utm).toEqual({ source: "meta", term: "etf" });
    expect(rec).not.toHaveProperty("ip");
    expect(rec).not.toHaveProperty("user_agent");
  });

  it("missing utm is accepted", async () => {
    const body = validBody();
    delete body.utm;
    const { res, json } = await send(body);
    expect(res.status).toBe(200);
    expect(json).toEqual({ ok: true });
  });
});

describe("POST /api/leads – validation (422)", () => {
  async function expect422(body: unknown, field: string, code?: string) {
    const { res, json } = await send(body);
    expect(res.status).toBe(422);
    expectErrorBody(json, "validation_failed");
    expectNoStore(res);
    const fields = json.fields as Record<string, string>;
    expect(fields).toBeTypeOf("object");
    if (code) expect(fields[field]).toBe(code);
    else expect(fields[field]).toBeTypeOf("string");
    return fields;
  }

  it.each([
    ["malformed", "jana.novakova@"],
    ["no at-sign", "jana.example.cz"],
    ["empty", ""],
    ["wrong type", 42],
    ["too long (>254)", `${"a".repeat(64)}@${"b".repeat(63)}.${"c".repeat(63)}.${"d".repeat(63)}.cz`],
  ])("invalid email (%s) → fields.email = invalid_email", async (_label, email) => {
    await expect422(validBody({ email }), "email", "invalid_email");
  });

  it("missing email → invalid_email", async () => {
    const body = validBody();
    delete body.email;
    await expect422(body, "email", "invalid_email");
  });

  it.each([
    ["false", false],
    ['"true" string', "true"],
    ["1", 1],
  ])("consent %s → fields.consent = consent_required", async (_label, consent) => {
    await expect422(validBody({ consent }), "consent", "consent_required");
  });

  it("missing consent → consent_required", async () => {
    const body = validBody();
    delete body.consent;
    await expect422(body, "consent", "consent_required");
  });

  it("wrong consent_version → 422 invalid_consent_version", async () => {
    await expect422(validBody({ consent_version: "cz-2026-01-01-v0" }), "consent_version", "invalid_consent_version");
  });

  it("bad variant → 422 invalid_variant", async () => {
    await expect422(validBody({ variant: "c" }), "variant", "invalid_variant");
  });

  it("bad page_path → 422 invalid_page_path", async () => {
    await expect422(validBody({ page_path: "/c" }), "page_path", "invalid_page_path");
  });

  it("utm value over 100 chars → 422 invalid_utm", async () => {
    await expect422(validBody({ utm: { source: "x".repeat(101) } }), "utm", "invalid_utm");
  });

  it("lists every failing field", async () => {
    const fields = await expect422(
      validBody({ email: "nope", consent: false, variant: "z", page_path: "/x" }),
      "email",
      "invalid_email",
    );
    expect(fields).toMatchObject({
      email: "invalid_email",
      consent: "consent_required",
      variant: "invalid_variant",
      page_path: "invalid_page_path",
    });
  });

  it("invalid request stores nothing", async () => {
    const store = storeMod.getLeadStore();
    const email = uniqueEmail("noconsent");
    const before = await store.countLeads("a", todayUtc());
    await send(validBody({ email, consent: false }));
    expect(await store.get(email)).toBeNull();
    expect(await store.countLeads("a", todayUtc())).toBe(before);
  });
});

describe("POST /api/leads – honeypot, transport errors", () => {
  it("filled honeypot → 200 {ok:true}, nothing stored or counted", async () => {
    const store = storeMod.getLeadStore();
    const body = validBody({ website: "http://spam.example" });
    const before = await store.countLeads("a", todayUtc());
    const { res, json } = await send(body);
    expect(res.status).toBe(200);
    expect(json).toEqual({ ok: true });
    expectNoStore(res);
    expect(await store.get(body.email as string)).toBeNull();
    expect(await store.countLeads("a", todayUtc())).toBe(before);
  });

  it("whitespace-only honeypot is treated as empty (lead stored)", async () => {
    const store = storeMod.getLeadStore();
    const body = validBody({ website: "   " });
    const { res } = await send(body);
    expect(res.status).toBe(200);
    expect(await store.get(body.email as string)).not.toBeNull();
  });

  it("honeypot short-circuits before validation (invalid body + honeypot → 200)", async () => {
    const { res, json } = await send({ email: "x", website: "filled" });
    expect(res.status).toBe(200);
    expect(json).toEqual({ ok: true });
  });

  it("malformed JSON → 400 invalid_json", async () => {
    const { res, json } = await send(null, { rawBody: '{"email": "a@b.cz",' });
    expect(res.status).toBe(400);
    expectErrorBody(json, "invalid_json");
    expectNoStore(res);
  });

  it.each([
    ["array", "[]"],
    ["string", '"hello"'],
    ["null", "null"],
    ["number", "42"],
  ])("JSON that is not a plain object (%s) → 400 invalid_json", async (_l, rawBody) => {
    const { res, json } = await send(null, { rawBody });
    expect(res.status).toBe(400);
    expectErrorBody(json, "invalid_json");
  });

  it("wrong content type → 415 unsupported_media_type", async () => {
    const { res, json } = await send(validBody(), { contentType: "text/plain" });
    expect(res.status).toBe(415);
    expectErrorBody(json, "unsupported_media_type");
    expectNoStore(res);
  });

  it("missing content type → 415", async () => {
    const { res, json } = await send(validBody(), { contentType: null });
    expect(res.status).toBe(415);
    expectErrorBody(json, "unsupported_media_type");
  });

  it("content type with charset is accepted", async () => {
    const { res } = await send(validBody(), { contentType: "application/json; charset=utf-8" });
    expect(res.status).toBe(200);
  });

  it("body over 4096 bytes → 413 payload_too_large", async () => {
    const body = validBody({ padding: "x".repeat(4200) });
    const { res, json } = await send(body);
    expect(res.status).toBe(413);
    expectErrorBody(json, "payload_too_large");
    expectNoStore(res);
  });

  it("body just under 4096 bytes is not rejected for size", async () => {
    const base = JSON.stringify(validBody({ padding: "" }));
    const body = validBody({ padding: "x".repeat(4000 - base.length) });
    expect(JSON.stringify(body).length).toBeLessThanOrEqual(4096);
    const { res } = await send(body);
    expect(res.status).toBe(200);
  });
});

describe("POST /api/leads – rate limit (5 / 600 s per IP)", () => {
  it("6th request from the same IP → 429 rate_limited with Retry-After ≥ 1", async () => {
    const ip = uniqueIp();
    for (let i = 0; i < 5; i += 1) {
      const { res } = await send(validBody(), { ip });
      expect(res.status, `request ${i + 1}`).toBe(200);
    }
    const { res, json } = await send(validBody(), { ip });
    expect(res.status).toBe(429);
    expectErrorBody(json, "rate_limited");
    expectNoStore(res);
    const retry = res.headers.get("retry-after");
    expect(retry).toMatch(/^\d+$/);
    expect(Number(retry)).toBeGreaterThanOrEqual(1);
    expect(Number(retry)).toBeLessThanOrEqual(600);
  });

  it("invalid requests count toward the limit too", async () => {
    const ip = uniqueIp();
    for (let i = 0; i < 5; i += 1) await send(null, { ip, rawBody: "{bad" });
    const { res, json } = await send(validBody(), { ip });
    expect(res.status).toBe(429);
    expectErrorBody(json, "rate_limited");
  });

  it("rate limit is checked before content type and honeypot", async () => {
    const ip = uniqueIp();
    for (let i = 0; i < 5; i += 1) await send(validBody({ website: "bot" }), { ip });
    const wrongType = await send(validBody(), { ip, contentType: "text/plain" });
    expect(wrongType.res.status).toBe(429);
  });

  it("a rate-limited lead is not stored", async () => {
    const store = storeMod.getLeadStore();
    const ip = uniqueIp();
    for (let i = 0; i < 5; i += 1) await send(validBody(), { ip });
    const body = validBody();
    const { res } = await send(body, { ip });
    expect(res.status).toBe(429);
    expect(await store.get(body.email as string)).toBeNull();
  });

  it("different IPs have independent buckets", async () => {
    const ip = uniqueIp();
    for (let i = 0; i < 5; i += 1) await send(validBody(), { ip });
    const { res } = await send(validBody(), { ip: uniqueIp() });
    expect(res.status).toBe(200);
  });

  it("first x-forwarded-for entry is the key", async () => {
    const ip = uniqueIp();
    for (let i = 0; i < 5; i += 1) await send(validBody(), { ip: `${ip}, 10.255.255.${i + 1}` });
    const { res } = await send(validBody(), { ip: ` ${ip} ` });
    expect(res.status).toBe(429);
  });
});

describe("getClientIp (plan §8.1)", () => {
  it("first x-forwarded-for entry trimmed, else x-real-ip, else unknown", async () => {
    const { getClientIp } = await import("@/lib/server/client-ip");
    const mk = (h: Record<string, string>) => new Request("http://localhost/", { headers: h });
    expect(getClientIp(mk({ "x-forwarded-for": " 203.0.113.7 , 10.0.0.1" }))).toBe("203.0.113.7");
    expect(getClientIp(mk({ "x-real-ip": "198.51.100.2" }))).toBe("198.51.100.2");
    expect(getClientIp(mk({ "x-forwarded-for": "203.0.113.8", "x-real-ip": "198.51.100.2" }))).toBe("203.0.113.8");
    expect(getClientIp(mk({}))).toBe("unknown");
  });
});
