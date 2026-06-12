import type { AiCompletionRequest, AiCompletionResponse, AiProvider } from "@/lib/ai/types";

export class FallbackProvider implements AiProvider {
  name = "fallback" as const;
  model = "rule-based-safe-fallback";

  async complete(request: AiCompletionRequest): Promise<AiCompletionResponse> {
    const text = request.user.replace(/\s+/g, " ").slice(0, 420);
    return {
      provider: this.name,
      model: this.model,
      usedFallback: true,
      text: JSON.stringify({
        disclaimer: "AI draft, doctor review required.",
        summary:
          "AI service is unavailable. Review the source material manually. Source preview: " + text,
        flags: ["AI unavailable", "Manual clinician review required"],
        explanation:
          "MediPilot could not reach the configured AI provider, so it generated a conservative placeholder instead of clinical conclusions."
      })
    };
  }

  async embed(input: string) {
    return hashEmbedding(input);
  }
}

export function hashEmbedding(input: string, dimensions = 64) {
  const vector = Array.from({ length: dimensions }, () => 0);
  const tokens = input.toLowerCase().match(/[a-z0-9]+/g) ?? [];
  for (const token of tokens) {
    let hash = 0;
    for (let i = 0; i < token.length; i += 1) {
      hash = (hash * 31 + token.charCodeAt(i)) >>> 0;
    }
    vector[hash % dimensions] += 1;
  }
  const magnitude = Math.sqrt(vector.reduce((sum, value) => sum + value * value, 0)) || 1;
  return vector.map((value) => Number((value / magnitude).toFixed(6)));
}
