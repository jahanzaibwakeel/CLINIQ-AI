import { randomUUID } from "crypto";

export function requestIdFrom(request?: Request) {
  return request?.headers.get("x-request-id") ?? randomUUID();
}

export function estimateTokens(...parts: Array<string | undefined>) {
  const characters = parts.reduce((total, part) => total + (part?.length ?? 0), 0);
  return Math.max(1, Math.ceil(characters / 4));
}

export function average(values: number[]) {
  if (!values.length) return 0;
  return Math.round(values.reduce((sum, value) => sum + value, 0) / values.length);
}

export function percentile(values: number[], percentileRank: number) {
  if (!values.length) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  const index = Math.min(sorted.length - 1, Math.max(0, Math.ceil((percentileRank / 100) * sorted.length) - 1));
  return sorted[index];
}

export function ratePercent(part: number, total: number) {
  if (!total) return 0;
  return Math.round((part / total) * 100);
}

export function logEvent(
  level: "info" | "warn" | "error",
  event: string,
  fields: Record<string, unknown> = {}
) {
  const payload = {
    level,
    event,
    service: "medipilot-ai",
    timestamp: new Date().toISOString(),
    ...fields
  };

  const line = JSON.stringify(payload);
  if (level === "error") console.error(line);
  else if (level === "warn") console.warn(line);
  else console.info(line);
}

export function logError(event: string, error: unknown, fields: Record<string, unknown> = {}) {
  const normalized = error instanceof Error
    ? { errorName: error.name, errorMessage: error.message, stack: process.env.NODE_ENV === "production" ? undefined : error.stack }
    : { errorMessage: String(error) };

  logEvent("error", event, { ...fields, ...normalized });
}

export function summarizeAiMetrics(
  generations: Array<{ provider: string; latencyMs: number | null; cacheHit: boolean; tokenEstimate: number | null; reviewStatus: string; createdAt: Date }>
) {
  const latencies = generations.map((generation) => generation.latencyMs).filter((value): value is number => typeof value === "number");
  const providerCounts = generations.reduce<Record<string, number>>((counts, generation) => {
    counts[generation.provider] = (counts[generation.provider] ?? 0) + 1;
    return counts;
  }, {});
  const fallbackRuns = generations.filter((generation) => generation.provider === "fallback").length;
  const cacheHits = generations.filter((generation) => generation.cacheHit).length;
  const draftRuns = generations.filter((generation) => generation.reviewStatus === "DRAFT").length;

  return {
    totalRuns: generations.length,
    providerCounts,
    fallbackRuns,
    fallbackRate: ratePercent(fallbackRuns, generations.length),
    cacheHits,
    cacheHitRate: ratePercent(cacheHits, generations.length),
    draftRuns,
    averageLatencyMs: average(latencies),
    p95LatencyMs: percentile(latencies, 95),
    tokenEstimate: generations.reduce((sum, generation) => sum + (generation.tokenEstimate ?? 0), 0)
  };
}
