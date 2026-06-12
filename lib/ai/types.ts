import type { AiGenerationType } from "@prisma/client";

export type AiProviderName = "ollama" | "groq" | "gemini" | "fallback";

export type AiCompletionRequest = {
  system: string;
  user: string;
  json?: boolean;
  temperature?: number;
};

export type AiCompletionResponse = {
  provider: AiProviderName;
  model: string;
  text: string;
  usedFallback?: boolean;
};

export interface AiProvider {
  name: AiProviderName;
  model: string;
  complete(request: AiCompletionRequest): Promise<AiCompletionResponse>;
  embed?(input: string): Promise<number[]>;
}

export type PromptTemplate = {
  version: string;
  type: AiGenerationType;
  system: string;
  buildUserPrompt(input: {
    patientContext?: string;
    sourceText: string;
    question?: string;
  }): string;
};

export type SafeAiOutput = {
  disclaimer: "AI draft, doctor review required.";
  summary?: string;
  soap?: {
    subjective: string;
    objective: string;
    assessment: string;
    plan: string;
  };
  tasks?: Array<{ title: string; priority: "low" | "medium" | "high"; rationale: string }>;
  flags?: string[];
  explanation?: string;
  patientInstructions?: string[];
  referralLetter?: string;
  answer?: string;
  citations?: string[];
  extracted?: Record<string, unknown>;
};
