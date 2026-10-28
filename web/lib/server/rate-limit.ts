import { Ratelimit } from "@upstash/ratelimit";
import { RATE_LIMIT_MAX, RATE_LIMIT_WINDOW_SECONDS } from "./config";
import { getRedis, getStorageDriver } from "./storage";

type RateLimitResult = { ok: boolean; retryAfterSeconds: number };

const WINDOW_MS = RATE_LIMIT_WINDOW_SECONDS * 1000;

/** Sliding-log limiter for STORAGE_DRIVER=memory (tests, local e2e). */
const memoryHits = new Map<string, number[]>();

function checkMemory(key: string): RateLimitResult {
  const now = Date.now();
  const hits = (memoryHits.get(key) ?? []).filter((t) => t > now - WINDOW_MS);
  if (hits.length >= RATE_LIMIT_MAX) {
    memoryHits.set(key, hits);
    const retryAfterSeconds = Math.max(1, Math.ceil((hits[0] + WINDOW_MS - now) / 1000));
    return { ok: false, retryAfterSeconds };
  }
  hits.push(now);
  memoryHits.set(key, hits);
  return { ok: true, retryAfterSeconds: 0 };
}

let upstashLimiter: Ratelimit | null = null;

async function checkUpstash(key: string): Promise<RateLimitResult> {
  upstashLimiter ??= new Ratelimit({
    redis: getRedis(),
    limiter: Ratelimit.slidingWindow(RATE_LIMIT_MAX, `${RATE_LIMIT_WINDOW_SECONDS} s`),
    prefix: "rl:leads",
    // 0 disables the fail-open timeout, so backend errors surface as 500 (plan §8.2 step 8).
    timeout: 0,
  });
  const { success, reset } = await upstashLimiter.limit(key);
  if (success) return { ok: true, retryAfterSeconds: 0 };
  return { ok: false, retryAfterSeconds: Math.max(1, Math.ceil((reset - Date.now()) / 1000)) };
}

/** Counts one request for `key`. Throws StorageConfigError or backend errors; the caller maps them to 500. */
export async function checkRateLimit(key: string): Promise<RateLimitResult> {
  return getStorageDriver() === "memory" ? checkMemory(key) : checkUpstash(key);
}
