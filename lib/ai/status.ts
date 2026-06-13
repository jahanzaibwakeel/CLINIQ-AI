import { env, externalAiAllowed, ollamaBaseUrl } from "@/lib/env";

export type AiRuntimeStatus = {
  provider: string;
  mode: "local" | "external" | "fallback";
  status: "ready" | "model_missing" | "unreachable" | "external_disabled" | "configured" | "fallback";
  model: string;
  embeddingModel?: string;
  endpoint?: string;
  numPredict: number;
  externalAiAllowed: boolean;
  modelAvailable: boolean | null;
  availableModels: string[];
  checkedAt: string;
  message: string;
};

type OllamaTagsResponse = {
  models?: Array<{ name?: string; model?: string }>;
};

async function fetchOllamaModels() {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 1500);

  try {
    const response = await fetch(`${ollamaBaseUrl}/api/tags`, {
      cache: "no-store",
      signal: controller.signal
    });
    if (!response.ok) throw new Error(`Ollama tags failed: ${response.status}`);
    const data = (await response.json()) as OllamaTagsResponse;
    return (data.models ?? [])
      .map((model) => model.name ?? model.model ?? "")
      .filter(Boolean);
  } finally {
    clearTimeout(timeout);
  }
}

function externalProviderStatus(provider: string, model: string, hasKey: boolean): AiRuntimeStatus {
  const enabled = externalAiAllowed && hasKey;

  return {
    provider,
    mode: "external",
    status: enabled ? "configured" : "external_disabled",
    model,
    numPredict: env.OLLAMA_NUM_PREDICT,
    externalAiAllowed,
    modelAvailable: null,
    availableModels: [],
    checkedAt: new Date().toISOString(),
    message: enabled
      ? "External provider is configured. Confirm clinic policy before sending patient data."
      : "External provider is disabled. Private patient data stays local unless explicitly configured."
  };
}

export async function getAiRuntimeStatus(): Promise<AiRuntimeStatus> {
  if (env.AI_PROVIDER === "groq") {
    return externalProviderStatus("groq", env.GROQ_MODEL, Boolean(env.GROQ_API_KEY));
  }

  if (env.AI_PROVIDER === "gemini") {
    return externalProviderStatus("gemini", env.GEMINI_MODEL, Boolean(env.GEMINI_API_KEY));
  }

  if (env.AI_PROVIDER !== "ollama") {
    return {
      provider: "fallback",
      mode: "fallback",
      status: "fallback",
      model: "rule-based-safe-fallback",
      numPredict: env.OLLAMA_NUM_PREDICT,
      externalAiAllowed,
      modelAvailable: null,
      availableModels: [],
      checkedAt: new Date().toISOString(),
      message: "Safe fallback mode is active. AI drafts will not use a language model."
    };
  }

  try {
    const availableModels = await fetchOllamaModels();
    const modelAvailable = availableModels.includes(env.OLLAMA_MODEL);

    return {
      provider: "ollama",
      mode: "local",
      status: modelAvailable ? "ready" : "model_missing",
      model: env.OLLAMA_MODEL,
      embeddingModel: env.OLLAMA_EMBEDDING_MODEL,
      endpoint: ollamaBaseUrl,
      numPredict: env.OLLAMA_NUM_PREDICT,
      externalAiAllowed,
      modelAvailable,
      availableModels,
      checkedAt: new Date().toISOString(),
      message: modelAvailable
        ? "Local Ollama is reachable and the configured model is installed."
        : "Local Ollama is reachable, but the configured model is not installed."
    };
  } catch {
    return {
      provider: "ollama",
      mode: "local",
      status: "unreachable",
      model: env.OLLAMA_MODEL,
      embeddingModel: env.OLLAMA_EMBEDDING_MODEL,
      endpoint: ollamaBaseUrl,
      numPredict: env.OLLAMA_NUM_PREDICT,
      externalAiAllowed,
      modelAvailable: false,
      availableModels: [],
      checkedAt: new Date().toISOString(),
      message: "Local Ollama is not reachable. MediPilot will use safe fallback drafts until it is available."
    };
  }
}
