import { z } from "zod";

const envSchema = z.object({
  DATABASE_URL: z.string().optional(),
  NEXT_PUBLIC_APP_URL: z.string().url().optional(),
  SESSION_SECRET: z.string().min(32).default("development-only-secret-change-me-32"),
  VALKEY_URL: z.string().optional(),
  AI_PROVIDER: z.string().default("ollama"),
  OLLAMA_BASE_URL: z.preprocess(
    (value) => (value === "" ? undefined : value),
    z.string().url().optional()
  ),
  OLLAMA_HOST: z.string().default("localhost"),
  OLLAMA_HOST_PORT: z.string().default("11434"),
  OLLAMA_MODEL: z.string().default("qwen2.5:7b"),
  OLLAMA_EMBEDDING_MODEL: z.string().default("nomic-embed-text"),
  OLLAMA_NUM_PREDICT: z.coerce.number().int().positive().default(220),
  OLLAMA_REQUEST_TIMEOUT_MS: z.coerce.number().int().positive().default(1500),
  ALLOW_EXTERNAL_AI: z.enum(["true", "false"]).default("false"),
  GROQ_API_KEY: z.string().optional(),
  GROQ_MODEL: z.string().default("llama-3.1-70b-versatile"),
  GEMINI_API_KEY: z.string().optional(),
  GEMINI_MODEL: z.string().default("gemini-1.5-flash"),
  DOCUMENT_STORAGE_DIR: z.string().default("uploads"),
  DOCUMENT_MAX_UPLOAD_BYTES: z.coerce.number().int().positive().default(2_000_000),
  METRICS_BEARER_TOKEN: z.preprocess(
    (value) => (value === "" ? undefined : value),
    z.string().min(24).optional()
  ),
  SMTP_URL: z.preprocess((value) => (value === "" ? undefined : value), z.string().url().optional()),
  SMTP_HOST: z.preprocess((value) => (value === "" ? undefined : value), z.string().optional()),
  SMTP_PORT: z.coerce.number().int().positive().default(587),
  SMTP_SECURE: z.enum(["true", "false"]).default("false"),
  SMTP_USER: z.preprocess((value) => (value === "" ? undefined : value), z.string().optional()),
  SMTP_PASS: z.preprocess((value) => (value === "" ? undefined : value), z.string().optional()),
  SMTP_FROM: z.string().default("CLINIK AI <no-reply@clinik.local>"),
  ACCOUNT_TOKEN_RETENTION_DAYS: z.coerce.number().int().min(1).max(90).default(7)
});

export const env = envSchema.parse(process.env);
export const externalAiAllowed = env.ALLOW_EXTERNAL_AI === "true";
export const ollamaBaseUrl = env.OLLAMA_BASE_URL ?? `http://${env.OLLAMA_HOST}:${env.OLLAMA_HOST_PORT}`;
