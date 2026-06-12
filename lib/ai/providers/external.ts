import { env, externalAiAllowed } from "@/lib/env";
import type { AiCompletionRequest, AiCompletionResponse, AiProvider } from "@/lib/ai/types";

export class GroqProvider implements AiProvider {
  name = "groq" as const;
  model = env.GROQ_MODEL;

  async complete(request: AiCompletionRequest): Promise<AiCompletionResponse> {
    if (!externalAiAllowed || !env.GROQ_API_KEY) {
      throw new Error("Groq is disabled. Set ALLOW_EXTERNAL_AI=true and GROQ_API_KEY.");
    }

    const response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${env.GROQ_API_KEY}`
      },
      body: JSON.stringify({
        model: this.model,
        temperature: request.temperature ?? 0.2,
        response_format: request.json ? { type: "json_object" } : undefined,
        messages: [
          { role: "system", content: request.system },
          { role: "user", content: request.user }
        ]
      })
    });

    if (!response.ok) throw new Error(`Groq request failed: ${response.status}`);
    const data = (await response.json()) as { choices?: Array<{ message?: { content?: string } }> };
    return { provider: this.name, model: this.model, text: data.choices?.[0]?.message?.content ?? "" };
  }
}

export class GeminiProvider implements AiProvider {
  name = "gemini" as const;
  model = env.GEMINI_MODEL;

  async complete(request: AiCompletionRequest): Promise<AiCompletionResponse> {
    if (!externalAiAllowed || !env.GEMINI_API_KEY) {
      throw new Error("Gemini is disabled. Set ALLOW_EXTERNAL_AI=true and GEMINI_API_KEY.");
    }

    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${this.model}:generateContent?key=${env.GEMINI_API_KEY}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          generationConfig: {
            temperature: request.temperature ?? 0.2,
            responseMimeType: request.json ? "application/json" : "text/plain"
          },
          contents: [
            {
              role: "user",
              parts: [{ text: `${request.system}\n\n${request.user}` }]
            }
          ]
        })
      }
    );

    if (!response.ok) throw new Error(`Gemini request failed: ${response.status}`);
    const data = (await response.json()) as {
      candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }>;
    };
    return {
      provider: this.name,
      model: this.model,
      text: data.candidates?.[0]?.content?.parts?.[0]?.text ?? ""
    };
  }
}
