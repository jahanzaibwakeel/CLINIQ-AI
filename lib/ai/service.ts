import { createHash } from "crypto";
import type { AiGenerationType, Prisma } from "@prisma/client";
import { prompts } from "@/lib/ai/prompts";
import type { AiProvider, SafeAiOutput } from "@/lib/ai/types";
import { OllamaProvider } from "@/lib/ai/providers/ollama";
import { FallbackProvider } from "@/lib/ai/providers/fallback";
import { GeminiProvider, GroqProvider } from "@/lib/ai/providers/external";
import { parseSafeAiOutput, trimContext } from "@/lib/ai/guardrails";
import { env } from "@/lib/env";
import { cacheGet, cacheSet } from "@/lib/cache";
import { prisma } from "@/lib/db";
import type { SessionUser } from "@/lib/security/session";
import { auditLog } from "@/lib/audit";
import { estimateTokens } from "@/lib/observability";

export function getAiProvider(): AiProvider {
  if (env.AI_PROVIDER === "groq") return new GroqProvider();
  if (env.AI_PROVIDER === "gemini") return new GeminiProvider();
  if (env.AI_PROVIDER === "ollama") return new OllamaProvider();
  return new FallbackProvider();
}

export async function runAiGeneration(input: {
  user: SessionUser;
  type: AiGenerationType;
  sourceText: string;
  patientContext?: string;
  question?: string;
  patientId?: string;
  consultationId?: string;
  documentId?: string;
  requestId?: string;
}): Promise<{
  output: SafeAiOutput;
  provider: string;
  model: string;
  generationId: string;
  usedFallback: boolean;
  latencyMs: number;
  cacheHit: boolean;
}> {
  const startedAt = Date.now();
  const prompt = prompts[input.type];
  const userPrompt = prompt.buildUserPrompt({
    patientContext: trimContext(input.patientContext ?? "", 6000),
    sourceText: trimContext(input.sourceText),
    question: input.question
  });
  const cacheKey = `ai:${createHash("sha256")
    .update(JSON.stringify({ type: input.type, userPrompt, version: prompt.version }))
    .digest("hex")}`;
  const cached = await cacheGet<{ output: SafeAiOutput; provider: string; model: string }>(cacheKey);

  let providerName = "cache";
  let model = "cache";
  let output: SafeAiOutput;
  let rawOutput: string | undefined;
  let usedFallback = false;
  let cacheHit = false;

  if (cached) {
    output = cached.output;
    providerName = cached.provider;
    model = cached.model;
    cacheHit = true;
  } else {
    const provider = getAiProvider();
    const fallback = new FallbackProvider();
    try {
      const response = await provider.complete({
        system: prompt.system,
        user: userPrompt,
        json: true,
        temperature: 0.2
      });
      providerName = response.provider;
      model = response.model;
      rawOutput = response.text;
      output = parseSafeAiOutput(response.text);
      usedFallback = Boolean(response.usedFallback);
    } catch {
      const response = await fallback.complete({
        system: prompt.system,
        user: userPrompt,
        json: true
      });
      providerName = response.provider;
      model = response.model;
      rawOutput = response.text;
      output = parseSafeAiOutput(response.text);
      usedFallback = true;
    }
    await cacheSet(cacheKey, { output, provider: providerName, model }, 600);
  }
  const latencyMs = Date.now() - startedAt;
  const tokenEstimate = estimateTokens(prompt.system, userPrompt, rawOutput);

  const generation = await prisma.aiGeneration.create({
    data: {
      clinicId: input.user.clinicId,
      patientId: input.patientId,
      consultationId: input.consultationId,
      documentId: input.documentId,
      type: input.type,
      provider: providerName,
      model,
      promptVersion: prompt.version,
      sourceContext: {
        sourceTextPreview: input.sourceText.slice(0, 500),
        question: input.question,
        containsPhi: true,
        externalAiAllowed: env.ALLOW_EXTERNAL_AI === "true",
        requestId: input.requestId
      },
      output: JSON.parse(JSON.stringify(output)) as Prisma.InputJsonValue,
      rawOutput,
      latencyMs,
      cacheHit,
      tokenEstimate,
      requestId: input.requestId,
      reviewStatus: "DRAFT"
    }
  });

  await auditLog({
    user: input.user,
    action: "AI_GENERATION_CREATED",
    entityType: "AiGeneration",
    entityId: generation.id,
    patientId: input.patientId,
    consultationId: input.consultationId,
    metadata: { type: input.type, provider: providerName, model, promptVersion: prompt.version, latencyMs, cacheHit, tokenEstimate, requestId: input.requestId }
  });

  return { output, provider: providerName, model, generationId: generation.id, usedFallback, latencyMs, cacheHit };
}
