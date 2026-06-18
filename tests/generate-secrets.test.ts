import { describe, expect, it } from "vitest";
// @ts-expect-error Deployment helpers are plain Node ESM scripts.
import { generateProductionSecrets, generateSecret } from "@/scripts/generate-secrets.mjs";

describe("production secret generator", () => {
  it("generates strong random values for production env", () => {
    const first = generateProductionSecrets();
    const second = generateProductionSecrets();

    expect(first.SESSION_SECRET.length).toBeGreaterThanOrEqual(48);
    expect(first.POSTGRES_PASSWORD.length).toBeGreaterThanOrEqual(32);
    expect(first.METRICS_BEARER_TOKEN.length).toBeGreaterThanOrEqual(32);
    expect(first.SESSION_SECRET).not.toBe(second.SESSION_SECRET);
  });

  it("rejects undersized secret requests", () => {
    expect(() => generateSecret(16)).toThrow("at least 24 bytes");
  });
});
