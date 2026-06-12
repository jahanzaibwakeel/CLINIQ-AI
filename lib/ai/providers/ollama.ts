import { env, ollamaBaseUrl } from "@/lib/env";
import type { AiCompletionRequest, AiCompletionResponse, AiProvider } from "@/lib/ai/types";
import { hashEmbedding } from "@/lib/ai/providers/fallback";

export class OllamaProvider implements AiProvider {
  name = "ollama" as const;
  model = env.OLLAMA_MODEL;

  async complete(request: AiCompletionRequest): Promise<AiCompletionResponse> {
    const response = await fetch(`${ollamaBaseUrl}/api/chat`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        model: this.model,
        stream: false,
        format: request.json ? "json" : undefined,
        options: { temperature: request.temperature ?? 0.2 },
        messages: [
          { role: "system", content: request.system },
          { role: "user", content: request.user }
        ]
      })
    });

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
      const response = await fetch(`${ollamaBaseUrl}/api/embeddings`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          model: env.OLLAMA_EMBEDDING_MODEL,
          prompt: input
        })
      });
      if (!response.ok) throw new Error(`Ollama embedding failed: ${response.status}`);
      const data = (await response.json()) as { embedding?: number[] };
      return data.embedding ?? hashEmbedding(input);
    } catch {
      return hashEmbedding(input);
    }
  }
}
