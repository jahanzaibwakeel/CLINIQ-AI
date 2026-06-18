import { describe, expect, it } from "vitest";
// @ts-expect-error The operations monitor is a plain Node ESM script.
import { normalizeBaseUrl, summarizeChecks } from "@/scripts/ops-monitor.mjs";

describe("operations monitor helpers", () => {
  it("normalizes monitor base URLs without carrying paths", () => {
    expect(normalizeBaseUrl("https://clinic.example.com/app/")).toBe("https://clinic.example.com/app");
    expect(normalizeBaseUrl("https://clinic.example.com?x=1#top")).toBe("https://clinic.example.com");
  });

  it("fails fast when no monitor base URL is configured", () => {
    expect(() => normalizeBaseUrl("")).toThrow("MONITOR_BASE_URL is required");
  });

  it("summarizes monitor checks by severity", () => {
    expect(summarizeChecks([{ name: "health", status: "ok" }])).toBe("ok");
    expect(summarizeChecks([{ name: "metrics", status: "skipped" }])).toBe("degraded");
    expect(summarizeChecks([{ name: "metrics", status: "skipped" }], { requireMetrics: true })).toBe("failed");
    expect(summarizeChecks([{ name: "ready", status: "failed" }])).toBe("failed");
  });
});
