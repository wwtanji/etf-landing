import { getClientIp } from "@/lib/server/client-ip";
import { HONEYPOT_FIELD, MAX_BODY_BYTES } from "@/lib/server/config";
import { LEAD_FIELD_ERROR_CODES, LeadRequestSchema } from "@/lib/server/lead-schema";
import { getLeadStore, sha256Hex, type LeadRecord } from "@/lib/server/lead-store";
import { checkRateLimit } from "@/lib/server/rate-limit";
import { StorageConfigError } from "@/lib/server/storage";

export const runtime = "nodejs";
export const preferredRegion = "fra1";
export const dynamic = "force-dynamic";

function json(body: unknown, status: number, headers: Record<string, string> = {}): Response {
  return Response.json(body, { status, headers: { "Cache-Control": "no-store", ...headers } });
}

function fail(error: string, status: number): Response {
  return json({ ok: false, error }, status);
}

/** Logs one JSON line per backend failure. Never includes the email, only a short hash of it. */
function logBackendFailure(error: unknown, email: string | null): void {
  if (error instanceof StorageConfigError && error.event === "memory_driver_in_production") {
    console.error(JSON.stringify({ event: "memory_driver_in_production" }));
    return;
  }
  console.error(
    JSON.stringify({
      event: "lead_store_failed",
      email_hash: email === null ? null : sha256Hex(email).slice(0, 12),
      message: error instanceof Error ? error.message : String(error),
    }),
  );
}

export async function POST(request: Request): Promise<Response> {
  // 1. Rate limit: every POST counts, including invalid ones.
  try {
    const limit = await checkRateLimit(`leads:${getClientIp(request)}`);
    if (!limit.ok) {
      return json({ ok: false, error: "rate_limited" }, 429, {
        "Retry-After": String(Math.max(1, Math.ceil(limit.retryAfterSeconds))),
      });
    }
  } catch (error: unknown) {
    logBackendFailure(error, null);
    return fail("server_error", 500);
  }

  // 2. Content type.
  const contentType = request.headers.get("content-type") ?? "";
  if (!contentType.toLowerCase().includes("application/json")) {
    return fail("unsupported_media_type", 415);
  }

  // 3. Size, measured in bytes on the read text.
  let text: string;
  try {
    text = await request.text();
  } catch (error: unknown) {
    console.warn(
      JSON.stringify({
        event: "lead_body_unreadable",
        message: error instanceof Error ? error.message : String(error),
      }),
    );
    return fail("invalid_json", 400);
  }
  if (new TextEncoder().encode(text).byteLength > MAX_BODY_BYTES) {
    return fail("payload_too_large", 413);
  }

  // 4. JSON must parse to a plain object.
  let body: unknown;
  try {
    body = JSON.parse(text);
  } catch {
    return fail("invalid_json", 400);
  }
  if (typeof body !== "object" || body === null || Array.isArray(body)) {
    return fail("invalid_json", 400);
  }

  // 5. Honeypot: pretend success, store and count nothing.
  const honeypot = (body as Record<string, unknown>)[HONEYPOT_FIELD];
  if (typeof honeypot === "string" && honeypot.trim() !== "") {
    return json({ ok: true }, 200);
  }

  // 6. Validation: list every failing field.
  const parsed = LeadRequestSchema.safeParse(body);
  if (!parsed.success) {
    const fields: Record<string, string> = {};
    for (const issue of parsed.error.issues) {
      const field = issue.path[0];
      if (typeof field === "string" && field in LEAD_FIELD_ERROR_CODES) {
        fields[field] = LEAD_FIELD_ERROR_CODES[field as keyof typeof LEAD_FIELD_ERROR_CODES];
      }
    }
    return json({ ok: false, error: "validation_failed", fields }, 422);
  }

  // 7. Store. "created" and "exists" get the same response so it does not reveal existing emails.
  const lead = parsed.data;
  const record: LeadRecord = {
    email: lead.email,
    consent: lead.consent,
    consent_version: lead.consent_version,
    consented_at: new Date().toISOString(),
    variant: lead.variant,
    page_path: lead.page_path,
    utm: lead.utm,
  };
  try {
    await getLeadStore().saveIfAbsent(record);
  } catch (error: unknown) {
    logBackendFailure(error, record.email);
    return fail("server_error", 500);
  }
  return json({ ok: true }, 200);
}
