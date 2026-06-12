import { NextResponse } from "next/server";
import { cacheGet, cacheSet } from "@/lib/cache";

export async function rateLimit(key: string, limit = 60, windowSeconds = 60) {
  const cacheKey = `rate:${key}`;
  const current = (await cacheGet<number>(cacheKey)) ?? 0;
  if (current >= limit) {
    return NextResponse.json({ error: "Rate limit exceeded" }, { status: 429 });
  }
  await cacheSet(cacheKey, current + 1, windowSeconds);
  return null;
}
