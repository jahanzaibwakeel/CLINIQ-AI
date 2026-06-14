const failures = [];
const warnings = [];

const env = process.env;
const placeholderSecrets = new Set([
  "replace-this-in-production-with-a-long-random-secret",
  "replace-with-a-long-random-secret-at-least-32-chars",
  "development-only-secret-change-me-32",
  "docker-build-secret-docker-build-secret"
]);

requireValue("DATABASE_URL");
requireValue("SESSION_SECRET");
requireValue("NEXT_PUBLIC_APP_URL");

if (env.SESSION_SECRET && env.SESSION_SECRET.length < 32) {
  failures.push("SESSION_SECRET must be at least 32 characters.");
}

if (env.SESSION_SECRET && placeholderSecrets.has(env.SESSION_SECRET)) {
  failures.push("SESSION_SECRET is still using a documented placeholder value.");
}

if (env.NEXT_PUBLIC_APP_URL) {
  try {
    const appUrl = new URL(env.NEXT_PUBLIC_APP_URL);
    const localHosts = new Set(["localhost", "127.0.0.1", "::1"]);
    if (appUrl.protocol !== "https:" && !localHosts.has(appUrl.hostname)) {
      failures.push("NEXT_PUBLIC_APP_URL must use HTTPS outside local development.");
    }
  } catch {
    failures.push("NEXT_PUBLIC_APP_URL must be a valid URL.");
  }
}

if (!env.VALKEY_URL) {
  warnings.push("VALKEY_URL is not set; cache/rate-limit paths may use degraded fallback behavior.");
}

if (!env.METRICS_BEARER_TOKEN) {
  warnings.push("METRICS_BEARER_TOKEN is not set; external uptime monitors must use an admin session or skip /api/metrics.");
}

if (!env.SMTP_URL && !env.SMTP_HOST) {
  warnings.push("SMTP is not configured; password reset and staff invite links will be logged instead of emailed.");
}

const aiProvider = env.AI_PROVIDER || "ollama";
if (env.ALLOW_EXTERNAL_AI === "true") {
  if (aiProvider === "groq" && !env.GROQ_API_KEY) failures.push("GROQ_API_KEY is required when AI_PROVIDER=groq and ALLOW_EXTERNAL_AI=true.");
  if (aiProvider === "gemini" && !env.GEMINI_API_KEY) failures.push("GEMINI_API_KEY is required when AI_PROVIDER=gemini and ALLOW_EXTERNAL_AI=true.");
} else if (["groq", "gemini"].includes(aiProvider)) {
  failures.push("External AI provider selected while ALLOW_EXTERNAL_AI is not true.");
}

if (env.PRODUCTION_CHECK_URL) {
  await checkEndpoint("/api/health");
  await checkEndpoint("/api/ready");
}

const result = {
  status: failures.length ? "failed" : "passed",
  failures,
  warnings
};

console.log(JSON.stringify(result, null, 2));
if (failures.length) process.exit(1);

function requireValue(name) {
  if (!env[name]) failures.push(`${name} is required.`);
}

async function checkEndpoint(path) {
  const base = env.PRODUCTION_CHECK_URL.replace(/\/$/, "");
  const url = `${base}${path}`;
  try {
    const response = await fetch(url);
    if (!response.ok) {
      failures.push(`${path} returned HTTP ${response.status}.`);
      return;
    }

    const body = await response.json().catch(() => ({}));
    if (path === "/api/ready" && body.status !== "ready") {
      failures.push("/api/ready did not report ready status.");
    }
  } catch (error) {
    failures.push(`${path} check failed: ${error instanceof Error ? error.message : String(error)}`);
  }
}
