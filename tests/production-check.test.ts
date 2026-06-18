import { execFileSync, spawnSync } from "node:child_process";
import { describe, expect, it } from "vitest";

const baseEnv = {
  ...process.env,
  DATABASE_URL: "postgresql://medipilot:medipilot@localhost/medipilot_ai?schema=public",
  SESSION_SECRET: "test-secret-test-secret-test-secret-123",
  NEXT_PUBLIC_APP_URL: "https://clinic.example.com",
  TRUSTED_ORIGINS: "https://clinic.example.com",
  AI_PROVIDER: "fallback",
  ALLOW_EXTERNAL_AI: "false",
  METRICS_BEARER_TOKEN: "test-metrics-token-test-token",
  SMTP_HOST: "smtp.example.com"
};

function runProductionCheck(env: NodeJS.ProcessEnv) {
  return execFileSync(process.execPath, ["scripts/production-check.mjs"], {
    cwd: process.cwd(),
    env,
    encoding: "utf8"
  });
}

function runProductionCheckFailure(env: NodeJS.ProcessEnv) {
  return spawnSync(process.execPath, ["scripts/production-check.mjs"], {
    cwd: process.cwd(),
    env,
    encoding: "utf8"
  });
}

describe("production configuration check", () => {
  it("passes when trusted origins match the public app URL", () => {
    const output = runProductionCheck(baseEnv);
    expect(JSON.parse(output).status).toBe("passed");
  });

  it("fails when the public app URL is missing from trusted origins", () => {
    const result = runProductionCheckFailure({
      ...baseEnv,
      TRUSTED_ORIGINS: "https://other.example.com"
    });
    expect(result.status).toBe(1);
    expect(result.stdout).toContain("TRUSTED_ORIGINS must include");
  });
});
