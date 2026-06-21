import Redis from "ioredis";
import { env } from "@/lib/env";

type CacheEntry = {
  value: string;
  expiresAt: number;
};

const memoryCache = new Map<string, CacheEntry>();
let redis: Redis | null = null;
let redisUnavailableUntil = 0;

function getRedis() {
  if (!env.VALKEY_URL) return null;
  if (redisUnavailableUntil > Date.now()) return null;
  if (!redis) {
    redis = new Redis(env.VALKEY_URL, {
      maxRetriesPerRequest: 1,
      connectTimeout: 500,
      commandTimeout: 500,
      lazyConnect: true,
      enableOfflineQueue: false,
      retryStrategy: () => null
    });
    redis.on("error", () => {
      redisUnavailableUntil = Date.now() + 30_000;
    });
  }
  return redis;
}

export async function cacheGet<T>(key: string): Promise<T | null> {
  const client = getRedis();
  if (client) {
    try {
      const cached = await client.get(key);
      return cached ? (JSON.parse(cached) as T) : null;
    } catch {
      // Fall back to memory cache when Valkey is unavailable.
      redisUnavailableUntil = Date.now() + 30_000;
    }
  }

  const entry = memoryCache.get(key);
  if (!entry || entry.expiresAt < Date.now()) {
    memoryCache.delete(key);
    return null;
  }
  return JSON.parse(entry.value) as T;
}

export async function cacheSet<T>(key: string, value: T, ttlSeconds = 300) {
  const payload = JSON.stringify(value);
  const client = getRedis();
  if (client) {
    try {
      await client.set(key, payload, "EX", ttlSeconds);
      return;
    } catch {
      // Fall back to memory cache when Valkey is unavailable.
      redisUnavailableUntil = Date.now() + 30_000;
    }
  }

  memoryCache.set(key, {
    value: payload,
    expiresAt: Date.now() + ttlSeconds * 1000
  });
}

export async function cacheHealth() {
  const client = getRedis();
  if (!client) return "memory";
  try {
    await client.ping();
    return "ok";
  } catch {
    redisUnavailableUntil = Date.now() + 30_000;
    return "degraded";
  }
}
