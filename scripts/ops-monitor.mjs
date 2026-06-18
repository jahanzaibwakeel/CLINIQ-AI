import { pathToFileURL } from "node:url";

const defaultTimeoutMs = 5000;

export function normalizeBaseUrl(value) {
  if (!value) throw new Error("MONITOR_BASE_URL is required.");
  const url = new URL(value);
  url.pathname = url.pathname.replace(/\/+$/, "");
  url.search = "";
  url.hash = "";
  return url.toString().replace(/\/$/, "");
}

export function summarizeChecks(checks, options = {}) {
  const failed = checks.filter((check) => check.status === "failed");
  const skipped = checks.filter((check) => check.status === "skipped");
  const degraded = checks.filter((check) => check.status === "degraded");

  if (failed.length) return "failed";
  if (options.requireMetrics && skipped.some((check) => check.name === "metrics")) return "failed";
  if (degraded.length || skipped.length) return "degraded";
  return "ok";
}

async function fetchJson(url, options = {}) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), options.timeoutMs ?? defaultTimeoutMs);
  try {
    const response = await fetch(url, {
      headers: options.headers,
      signal: controller.signal
    });
    const body = await response.json().catch(() => ({}));
    return { ok: response.ok, statusCode: response.status, body };
  } finally {
    clearTimeout(timeout);
  }
}

async function checkEndpoint({ baseUrl, path, name, timeoutMs, headers, validate }) {
  const startedAt = Date.now();
  try {
    const response = await fetchJson(`${baseUrl}${path}`, { timeoutMs, headers });
    const latencyMs = Date.now() - startedAt;
    if (!response.ok) {
      return { name, status: "failed", statusCode: response.statusCode, latencyMs };
    }
    const validation = validate ? validate(response.body) : null;
    if (validation) {
      return { name, status: validation.status, statusCode: response.statusCode, latencyMs, detail: validation.detail };
    }
    return { name, status: "ok", statusCode: response.statusCode, latencyMs };
  } catch (error) {
    return {
      name,
      status: "failed",
      detail: error instanceof Error ? error.message : String(error),
      latencyMs: Date.now() - startedAt
    };
  }
}

export async function runMonitor(env = process.env) {
  const baseUrl = normalizeBaseUrl(env.MONITOR_BASE_URL ?? env.NEXT_PUBLIC_APP_URL ?? env.PRODUCTION_CHECK_URL);
  const timeoutMs = Number(env.MONITOR_TIMEOUT_MS ?? defaultTimeoutMs);
  const requireMetrics = env.MONITOR_REQUIRE_METRICS === "true";
  const generatedAt = new Date().toISOString();
  const checks = [];

  checks.push(await checkEndpoint({ baseUrl, path: "/api/health", name: "health", timeoutMs }));
  checks.push(await checkEndpoint({
    baseUrl,
    path: "/api/ready",
    name: "ready",
    timeoutMs,
    validate: (body) => body?.status === "ready"
      ? null
      : { status: "failed", detail: `Expected ready, received ${body?.status ?? "unknown"}` }
  }));

  if (env.METRICS_BEARER_TOKEN) {
    checks.push(await checkEndpoint({
      baseUrl,
      path: "/api/metrics",
      name: "metrics",
      timeoutMs,
      headers: { authorization: `Bearer ${env.METRICS_BEARER_TOKEN}` },
      validate: (body) => body?.status === "ok"
        ? null
        : { status: "degraded", detail: `Metrics status ${body?.status ?? "unknown"}` }
    }));
  } else {
    checks.push({
      name: "metrics",
      status: "skipped",
      detail: "METRICS_BEARER_TOKEN is not configured."
    });
  }

  const status = summarizeChecks(checks, { requireMetrics });
  return { service: "medipilot-ai", status, generatedAt, baseUrl, checks };
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  try {
    const result = await runMonitor();
    console.log(JSON.stringify(result, null, 2));
    if (result.status === "failed") process.exit(1);
  } catch (error) {
    console.error(JSON.stringify({
      service: "medipilot-ai",
      status: "failed",
      error: error instanceof Error ? error.message : String(error)
    }, null, 2));
    process.exit(1);
  }
}
