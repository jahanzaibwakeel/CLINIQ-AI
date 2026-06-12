import { z } from "zod";
import type { SafeAiOutput } from "@/lib/ai/types";

const outputSchema = z
  .object({
    disclaimer: z.literal("AI draft, doctor review required."),
    summary: z.string().optional(),
    soap: z
      .object({
        subjective: z.string(),
        objective: z.string(),
        assessment: z.string(),
        plan: z.string()
      })
      .optional(),
    tasks: z
      .array(
        z.object({
          title: z.string(),
          priority: z.enum(["low", "medium", "high"]),
          rationale: z.string()
        })
      )
      .optional(),
    flags: z.array(z.string()).optional(),
    explanation: z.string().optional(),
    patientInstructions: z.array(z.string()).optional(),
    referralLetter: z.string().optional(),
    answer: z.string().optional(),
    citations: z.array(z.string()).optional(),
    extracted: z.record(z.unknown()).optional()
  })
  .passthrough();

export function parseSafeAiOutput(raw: string): SafeAiOutput {
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    parsed = {
      disclaimer: "AI draft, doctor review required.",
      summary: raw.slice(0, 2000)
    };
  }

  const withDisclaimer = {
    ...(typeof parsed === "object" && parsed ? parsed : {}),
    disclaimer: "AI draft, doctor review required."
  };

  return outputSchema.parse(withDisclaimer) as SafeAiOutput;
}

export function trimContext(input: string, maxChars = 12000) {
  if (input.length <= maxChars) return input;
  return `${input.slice(0, maxChars / 2)}\n\n[Context truncated]\n\n${input.slice(-maxChars / 2)}`;
}
