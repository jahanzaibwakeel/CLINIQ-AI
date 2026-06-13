import { afterEach, describe, expect, it, vi } from "vitest";
import { parseSafeAiOutput } from "@/lib/ai/guardrails";
import { prompts } from "@/lib/ai/prompts";
import { OllamaProvider } from "@/lib/ai/providers/ollama";
import { FallbackProvider, hashEmbedding } from "@/lib/ai/providers/fallback";
import { getAiRuntimeStatus } from "@/lib/ai/status";
import { average, estimateTokens, percentile, ratePercent, summarizeAiMetrics } from "@/lib/observability";

afterEach(() => {
  vi.restoreAllMocks();
});

describe("AI guardrails", () => {
  it("forces the doctor review disclaimer", () => {
    const output = parseSafeAiOutput(JSON.stringify({ summary: "Draft summary" }));
    expect(output.disclaimer).toBe("AI draft, doctor review required.");
  });

  it("wraps non-json model output safely", () => {
    const output = parseSafeAiOutput("Plain model text");
    expect(output.summary).toContain("Plain model text");
    expect(output.disclaimer).toBe("AI draft, doctor review required.");
  });
});

describe("Prompt templates", () => {
  it("include safety instructions and versioning", () => {
    const template = prompts.SOAP_NOTE;
    expect(template.version).toContain("soap");
    expect(template.system).toContain("Never present output as a diagnosis");
    expect(template.buildUserPrompt({ sourceText: "fatigue", patientContext: "demo" })).toContain("Return JSON");
  });
});

describe("Fallback provider", () => {
  it("returns a conservative structured draft", async () => {
    const provider = new FallbackProvider();
    const response = await provider.complete({ system: "safe", user: "source context", json: true });
    expect(response.usedFallback).toBe(true);
    expect(response.text).toContain("Manual clinician review required");
  });

  it("creates deterministic local embeddings", () => {
    expect(hashEmbedding("HbA1c high")).toEqual(hashEmbedding("HbA1c high"));
  });
});

describe("Ollama provider", () => {
  it("sends bounded local generation options", async () => {
    const fetchMock = vi.spyOn(global, "fetch").mockResolvedValue(
      new Response(JSON.stringify({ message: { content: "{\"summary\":\"ok\"}" } }), { status: 200 })
    );

    const provider = new OllamaProvider();
    await provider.complete({ system: "safe", user: "source context", json: true, maxTokens: 128 });

    const body = JSON.parse(String(fetchMock.mock.calls[0]?.[1]?.body));
    expect(body.format).toBe("json");
    expect(body.options.num_predict).toBe(128);
    expect(body.options.temperature).toBe(0.2);
  });
});

describe("AI runtime status", () => {
  it("reports local Ollama ready when the configured model is installed", async () => {
    vi.spyOn(global, "fetch").mockResolvedValue(
      new Response(JSON.stringify({ models: [{ name: "qwen2.5:7b" }] }), { status: 200 })
    );

    const status = await getAiRuntimeStatus();
    expect(status.provider).toBe("ollama");
    expect(status.status).toBe("ready");
    expect(status.modelAvailable).toBe(true);
  });

  it("reports model_missing when Ollama is reachable without the configured model", async () => {
    vi.spyOn(global, "fetch").mockResolvedValue(
      new Response(JSON.stringify({ models: [{ name: "qwen2.5:1.5b" }] }), { status: 200 })
    );

    const status = await getAiRuntimeStatus();
    expect(status.provider).toBe("ollama");
    expect(status.status).toBe("model_missing");
    expect(status.modelAvailable).toBe(false);
  });
});

describe("Observability helpers", () => {
  it("estimates tokens and averages latency safely", () => {
    expect(estimateTokens("12345678")).toBe(2);
    expect(average([100, 200, 300])).toBe(200);
    expect(average([])).toBe(0);
  });

  it("summarizes AI reliability metrics without patient data", () => {
    const metrics = summarizeAiMetrics([
      { provider: "ollama", latencyMs: 100, cacheHit: false, tokenEstimate: 20, reviewStatus: "DRAFT", createdAt: new Date() },
      { provider: "ollama", latencyMs: 200, cacheHit: true, tokenEstimate: 30, reviewStatus: "REVIEWED", createdAt: new Date() },
      { provider: "fallback", latencyMs: 900, cacheHit: false, tokenEstimate: 10, reviewStatus: "DRAFT", createdAt: new Date() }
    ]);

    expect(metrics.totalRuns).toBe(3);
    expect(metrics.providerCounts).toEqual({ ollama: 2, fallback: 1 });
    expect(metrics.fallbackRate).toBe(33);
    expect(metrics.cacheHitRate).toBe(33);
    expect(metrics.draftRuns).toBe(2);
    expect(metrics.averageLatencyMs).toBe(400);
    expect(metrics.p95LatencyMs).toBe(900);
    expect(metrics.tokenEstimate).toBe(60);
  });

  it("calculates percentiles and rates for empty samples", () => {
    expect(percentile([], 95)).toBe(0);
    expect(ratePercent(1, 4)).toBe(25);
    expect(ratePercent(0, 0)).toBe(0);
  });
});
