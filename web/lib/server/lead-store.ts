import { createHash } from "node:crypto";
import { z } from "zod";
import { CONSENT_VERSION, LEAD_TTL_SECONDS } from "./config";
import { getRedis, getStorageDriver, type StorageDriver } from "./storage";

const LeadRecordSchema = z.object({
  email: z.string(),
  consent: z.literal(true),
  consent_version: z.literal(CONSENT_VERSION),
  consented_at: z.iso.datetime(),
  variant: z.enum(["a", "b"]),
  page_path: z.enum(["/", "/b"]),
  utm: z.object({
    source: z.string().optional(),
    medium: z.string().optional(),
    campaign: z.string().optional(),
    content: z.string().optional(),
    term: z.string().optional(),
  }),
});

export type LeadRecord = z.infer<typeof LeadRecordSchema>;

export interface LeadStore {
  /** Stores the record unless the email exists; on "created" it also increments the daily variant counter. */
  saveIfAbsent(r: LeadRecord): Promise<"created" | "exists">;
  get(email: string): Promise<LeadRecord | null>;
  countLeads(variant: "a" | "b", dateUtc: string): Promise<number>;
}

export function sha256Hex(value: string): string {
  return createHash("sha256").update(value).digest("hex");
}

function leadKey(email: string): string {
  return `lead:v1:${sha256Hex(email)}`;
}

function statsKey(variant: "a" | "b", dateUtc: string): string {
  return `stats:leads:${variant}:${dateUtc}`;
}

class UpstashLeadStore implements LeadStore {
  async saveIfAbsent(r: LeadRecord): Promise<"created" | "exists"> {
    const redis = getRedis();
    const result = await redis.set(leadKey(r.email), JSON.stringify(r), { nx: true, ex: LEAD_TTL_SECONDS });
    if (result === null) return "exists";
    // consented_at is ISO 8601 UTC ("…Z"), so its first 10 chars are the UTC date.
    await redis.incr(statsKey(r.variant, r.consented_at.slice(0, 10)));
    return "created";
  }

  async get(email: string): Promise<LeadRecord | null> {
    // @upstash/redis deserialises JSON values automatically.
    const value = await getRedis().get<unknown>(leadKey(email));
    if (value === null) return null;
    return LeadRecordSchema.parse(value);
  }

  async countLeads(variant: "a" | "b", dateUtc: string): Promise<number> {
    const value = await getRedis().get<unknown>(statsKey(variant, dateUtc));
    if (value === null) return 0;
    return z.coerce.number().int().nonnegative().parse(value);
  }
}

class MemoryLeadStore implements LeadStore {
  private readonly leads = new Map<string, LeadRecord>();
  private readonly counters = new Map<string, number>();

  async saveIfAbsent(r: LeadRecord): Promise<"created" | "exists"> {
    const key = leadKey(r.email);
    if (this.leads.has(key)) return "exists";
    this.leads.set(key, structuredClone(r));
    const counter = statsKey(r.variant, r.consented_at.slice(0, 10));
    this.counters.set(counter, (this.counters.get(counter) ?? 0) + 1);
    return "created";
  }

  async get(email: string): Promise<LeadRecord | null> {
    const record = this.leads.get(leadKey(email));
    return record ? structuredClone(record) : null;
  }

  async countLeads(variant: "a" | "b", dateUtc: string): Promise<number> {
    return this.counters.get(statsKey(variant, dateUtc)) ?? 0;
  }
}

const stores: Partial<Record<StorageDriver, LeadStore>> = {};

/** One store per process for the configured driver. Throws StorageConfigError when the driver is unusable. */
export function getLeadStore(): LeadStore {
  const driver = getStorageDriver();
  stores[driver] ??= driver === "memory" ? new MemoryLeadStore() : new UpstashLeadStore();
  return stores[driver];
}
