import { describe, expect, it } from "vitest";
import { parseSafeAiOutput } from "@/lib/ai/guardrails";
import { prompts } from "@/lib/ai/prompts";
import { FallbackProvider, hashEmbedding } from "@/lib/ai/providers/fallback";

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
