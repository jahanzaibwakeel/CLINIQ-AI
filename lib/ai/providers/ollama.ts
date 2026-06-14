import { env, ollamaBaseUrl } from "@/lib/env";
import type { AiCompletionRequest, AiCompletionResponse, AiProvider } from "@/lib/ai/types";
import { hashEmbedding } from "@/lib/ai/providers/fallback";

export class OllamaProvider implements AiProvider {
  name = "ollama" as const;
  model = env.OLLAMA_MODEL;

  async complete(request: AiCompletionRequest): Promise<AiCompletionResponse> {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), env.OLLAMA_REQUEST_TIMEOUT_MS);
    const response = await fetch(`${ollamaBaseUrl}/api/chat`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      signal: controller.signal,
      body: JSON.stringify({
        model: this.model,
        stream: false,
        format: request.json ? "json" : undefined,
        options: {
          temperature: request.temperature ?? 0.2,
          num_predict: request.maxTokens ?? env.OLLAMA_NUM_PREDICT
        },
        messages: [
          { role: "system", content: request.system },
          { role: "user", content: request.user }
        ]
      })
    }).finally(() => clearTimeout(timeout));

    if (!response.ok) {
      throw new Error(`Ollama request failed: ${response.status}`);
    }

    const data = (await response.json()) as { message?: { content?: string } };
    return {
      provider: this.name,
      model: this.model,
      text: data.message?.content ?? ""
    };
  }

  async embed(input: string) {
    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), env.OLLAMA_REQUEST_TIMEOUT_MS);
      const response = await fetch(`${ollamaBaseUrl}/api/embeddings`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        signal: controller.signal,
        body: JSON.stringify({
          model: env.OLLAMA_EMBEDDING_MODEL,
          prompt: input
        })
      }).finally(() => clearTimeout(timeout));
      if (!response.ok) throw new Error(`Ollama embedding failed: ${response.status}`);
      const data = (await response.json()) as { embedding?: number[] };
      return data.embedding ?? hashEmbedding(input);
    } catch {
      return hashEmbedding(input);
    }
  }
}
