import { Redis } from "@upstash/redis";

export type StorageDriver = "upstash" | "memory";

export class StorageConfigError extends Error {
  constructor(
    readonly event: "memory_driver_in_production" | "storage_misconfigured",
    message: string,
  ) {
    super(message);
    this.name = "StorageConfigError";
  }
}

/** Reads STORAGE_DRIVER at call time (plan §8.4). Throws StorageConfigError when unusable. */
export function getStorageDriver(): StorageDriver {
  const value = (process.env.STORAGE_DRIVER ?? "").trim() || "upstash";
  if (value !== "upstash" && value !== "memory") {
    throw new StorageConfigError("storage_misconfigured", `unknown STORAGE_DRIVER "${value}"`);
  }
  if (value === "memory" && process.env.VERCEL_ENV === "production") {
    throw new StorageConfigError(
      "memory_driver_in_production",
      "memory storage driver is refused when VERCEL_ENV=production",
    );
  }
  return value;
}

let redis: Redis | null = null;

export function getRedis(): Redis {
  if (redis) return redis;
  const url = (process.env.UPSTASH_REDIS_REST_URL || process.env.KV_REST_API_URL)?.trim();
  const token = (process.env.UPSTASH_REDIS_REST_TOKEN || process.env.KV_REST_API_TOKEN)?.trim();
  if (!url || !token) {
    throw new StorageConfigError(
      "storage_misconfigured",
      "UPSTASH_REDIS_REST_URL/TOKEN (or the Vercel integration's KV_REST_API_URL/TOKEN) must be set",
    );
  }
  redis = new Redis({ url, token });
  return redis;
}
