import { randomUUID } from "node:crypto";

let ipCounter = 0;
/** A fresh client IP per call, so every test has its own rate-limit bucket (plan §10.1). */
export function uniqueIp(): string {
  ipCounter += 1;
  return `10.0.${Math.floor(ipCounter / 250)}.${(ipCounter % 250) + 1}`;
}

export function uniqueEmail(prefix = "lead"): string {
  return `${prefix}.${randomUUID().slice(0, 8)}@example.cz`;
}

export const CONSENT_VERSION = "cz-2026-10-28-v2";

export function validBody(overrides: Record<string, unknown> = {}): Record<string, unknown> {
  return {
    email: uniqueEmail(),
    consent: true,
    consent_version: CONSENT_VERSION,
    variant: "a",
    page_path: "/",
    utm: { source: "meta", medium: "paid_social", campaign: "etf_lp_2026q4", content: "ad_a_fees" },
    website: "",
    ...overrides,
  };
}

type ReqOpts = { ip?: string; contentType?: string | null; rawBody?: string };

export function leadRequest(body: unknown, opts: ReqOpts = {}): Request {
  const headers = new Headers();
  const ct = opts.contentType === undefined ? "application/json" : opts.contentType;
  if (ct !== null) headers.set("content-type", ct);
  headers.set("x-forwarded-for", opts.ip ?? uniqueIp());
  return new Request("http://localhost/api/leads", {
    method: "POST",
    headers,
    body: opts.rawBody ?? JSON.stringify(body),
  });
}

export function todayUtc(): string {
  return new Date().toISOString().slice(0, 10);
}
