import type { AiGenerationType } from "@prisma/client";
import type { PromptTemplate } from "@/lib/ai/types";

const safetySystem = [
  "You are MediPilot AI, a clinical workflow drafting assistant for licensed clinicians.",
  "Never present output as a diagnosis or final medical advice.",
  "Always produce an AI draft for doctor review.",
  "Use only the provided context. Say when information is missing.",
  "Return concise JSON only, with disclaimer exactly: AI draft, doctor review required."
].join(" ");

function jsonPrompt(instruction: string) {
  return ({ patientContext, sourceText, question }: { patientContext?: string; sourceText: string; question?: string }) => `
Patient context:
${patientContext || "No extra patient context provided."}

Source text:
${sourceText}

${question ? `Doctor question: ${question}` : ""}

Task:
${instruction}

Return JSON with only relevant keys from:
{
  "disclaimer": "AI draft, doctor review required.",
  "summary": "...",
  "soap": {"subjective": "...", "objective": "...", "assessment": "...", "plan": "..."},
  "tasks": [{"title": "...", "priority": "low|medium|high", "rationale": "..."}],
  "flags": ["..."],
  "explanation": "...",
  "patientInstructions": ["..."],
  "referralLetter": "...",
  "answer": "...",
  "citations": ["..."],
  "extracted": {}
}`;
}

export const prompts: Record<AiGenerationType, PromptTemplate> = {
  CONSULTATION_SUMMARY: {
    version: "consultation-summary-v1",
    type: "CONSULTATION_SUMMARY",
    system: safetySystem,
    buildUserPrompt: jsonPrompt("Summarize the consultation for clinician review. Include uncertainties and missing follow-up items.")
  },
  SOAP_NOTE: {
    version: "soap-note-v1",
    type: "SOAP_NOTE",
    system: safetySystem,
    buildUserPrompt: jsonPrompt("Create a structured SOAP note draft. Do not invent exam findings, diagnoses, or plans not present in context.")
  },
  HISTORY_TIMELINE: {
    version: "history-timeline-v1",
    type: "HISTORY_TIMELINE",
    system: safetySystem,
    buildUserPrompt: jsonPrompt("Summarize the patient's timeline and recurring clinical themes in chronological language.")
  },
  DOCUMENT_PARSE: {
    version: "document-parse-v1",
    type: "DOCUMENT_PARSE",
    system: safetySystem,
    buildUserPrompt: jsonPrompt("Extract key medical information, abnormal values, dates, medications, and follow-up needs from the document.")
  },
  FOLLOW_UP_INSTRUCTIONS: {
    version: "follow-up-instructions-v1",
    type: "FOLLOW_UP_INSTRUCTIONS",
    system: safetySystem,
    buildUserPrompt: jsonPrompt("Draft patient-friendly follow-up instructions. Keep language simple and say the doctor must review.")
  },
  TASK_EXTRACTION: {
    version: "task-extraction-v1",
    type: "TASK_EXTRACTION",
    system: safetySystem,
    buildUserPrompt: jsonPrompt("Extract operational tasks for clinic staff. Include priority and rationale.")
  },
  RISK_FLAG_EXPLAINER: {
    version: "risk-flag-v1",
    type: "RISK_FLAG_EXPLAINER",
    system: safetySystem,
    buildUserPrompt: jsonPrompt("Identify important keywords, abnormal values, missed follow-ups, and explain why a clinician should review them.")
  },
  VISIT_SUMMARY: {
    version: "visit-summary-v1",
    type: "VISIT_SUMMARY",
    system: safetySystem,
    buildUserPrompt: jsonPrompt("Draft a patient-friendly visit summary in plain language without diagnosing beyond the doctor's note.")
  },
  REFERRAL_LETTER: {
    version: "referral-letter-v1",
    type: "REFERRAL_LETTER",
    system: safetySystem,
    buildUserPrompt: jsonPrompt("Draft a professional referral letter with reason, history, meds, relevant findings, and requested specialist input.")
  },
  ASSISTANT_RESPONSE: {
    version: "assistant-response-v1",
    type: "ASSISTANT_RESPONSE",
    system: safetySystem,
    buildUserPrompt: jsonPrompt("Answer the doctor's question using selected patient context. Cite source snippets when possible.")
  },
  SEMANTIC_SEARCH: {
    version: "semantic-search-v1",
    type: "SEMANTIC_SEARCH",
    system: safetySystem,
    buildUserPrompt: jsonPrompt("Summarize the most relevant search matches and explain how they relate to the query.")
  }
};
