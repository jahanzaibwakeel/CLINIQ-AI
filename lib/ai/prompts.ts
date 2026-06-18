import type { AiGenerationType } from "@prisma/client";
import type { PromptTemplate } from "@/lib/ai/types";

const safetySystem = [
  "You are MediPilot AI, a clinical workflow drafting assistant for licensed clinicians.",
  "Never present output as a diagnosis or final medical advice.",
  "Always produce an AI draft for doctor review.",
  "Use only the provided context. Say when information is missing.",
  "Return concise JSON only, with disclaimer exactly: AI draft, doctor review required."
].join(" ");

const schemas = {
  summary: `{
  "disclaimer": "AI draft, doctor review required.",
  "summary": "...",
  "flags": ["missing or uncertain item needing clinician review"]
}`,
  soap: `{
  "disclaimer": "AI draft, doctor review required.",
  "soap": {"subjective": "...", "objective": "...", "assessment": "...", "plan": "..."},
  "flags": ["missing or uncertain item needing clinician review"]
}`,
  document: `{
  "disclaimer": "AI draft, doctor review required.",
  "summary": "...",
  "extracted": {"dates": [], "medications": [], "abnormalValues": [], "followUpNeeds": []},
  "flags": ["important item for clinician review"]
}`,
  instructions: `{
  "disclaimer": "AI draft, doctor review required.",
  "summary": "...",
  "patientInstructions": ["short instruction"],
  "flags": ["when to contact the clinic or seek urgent care, if present in context"]
}`,
  tasks: `{
  "disclaimer": "AI draft, doctor review required.",
  "tasks": [{"title": "...", "priority": "low|medium|high", "rationale": "..."}],
  "flags": ["missing or abnormal item needing staff attention"]
}`,
  risk: `{
  "disclaimer": "AI draft, doctor review required.",
  "flags": ["keyword, abnormal value, or missed follow-up"],
  "explanation": "Why these items should be reviewed by a clinician."
}`,
  referral: `{
  "disclaimer": "AI draft, doctor review required.",
  "referralLetter": "...",
  "flags": ["missing item the doctor should complete before sending"]
}`,
  assistant: `{
  "disclaimer": "AI draft, doctor review required.",
  "answer": "...",
  "citations": ["short source snippet"],
  "flags": ["uncertainty or missing context"]
}`,
  portalReply: `{
  "disclaimer": "AI draft, doctor review required.",
  "summary": "short internal summary of what the reply addresses",
  "patientReply": "patient-visible reply draft",
  "flags": ["item staff or doctor should verify before sending"]
}`
} as const;

function jsonPrompt(instruction: string, schema: string) {
  return ({ patientContext, sourceText, question }: { patientContext?: string; sourceText: string; question?: string }) => `
Patient context:
${patientContext || "No extra patient context provided."}

Source text:
${sourceText}

${question ? `Doctor question: ${question}` : ""}

Task:
${instruction}

Return JSON matching this exact shape. Keep it concise and do not add other keys:
${schema}`;
}

export const prompts: Record<AiGenerationType, PromptTemplate> = {
  CONSULTATION_SUMMARY: {
    version: "consultation-summary-v1",
    type: "CONSULTATION_SUMMARY",
    system: safetySystem,
    buildUserPrompt: jsonPrompt("Summarize the consultation for clinician review. Include uncertainties and missing follow-up items.", schemas.summary)
  },
  SOAP_NOTE: {
    version: "soap-note-v1",
    type: "SOAP_NOTE",
    system: safetySystem,
    buildUserPrompt: jsonPrompt("Create a structured SOAP note draft. Do not invent exam findings, diagnoses, or plans not present in context.", schemas.soap)
  },
  HISTORY_TIMELINE: {
    version: "history-timeline-v1",
    type: "HISTORY_TIMELINE",
    system: safetySystem,
    buildUserPrompt: jsonPrompt("Summarize the patient's timeline and recurring clinical themes in chronological language.", schemas.summary)
  },
  DOCUMENT_PARSE: {
    version: "document-parse-v1",
    type: "DOCUMENT_PARSE",
    system: safetySystem,
    buildUserPrompt: jsonPrompt("Extract key medical information, abnormal values, dates, medications, and follow-up needs from the document.", schemas.document)
  },
  FOLLOW_UP_INSTRUCTIONS: {
    version: "follow-up-instructions-v1",
    type: "FOLLOW_UP_INSTRUCTIONS",
    system: safetySystem,
    buildUserPrompt: jsonPrompt("Draft patient-friendly follow-up instructions. Keep language simple and say the doctor must review.", schemas.instructions)
  },
  TASK_EXTRACTION: {
    version: "task-extraction-v1",
    type: "TASK_EXTRACTION",
    system: safetySystem,
    buildUserPrompt: jsonPrompt("Extract operational tasks for clinic staff. Include priority and rationale.", schemas.tasks)
  },
  RISK_FLAG_EXPLAINER: {
    version: "risk-flag-v1",
    type: "RISK_FLAG_EXPLAINER",
    system: safetySystem,
    buildUserPrompt: jsonPrompt("Identify important keywords, abnormal values, missed follow-ups, and explain why a clinician should review them.", schemas.risk)
  },
  VISIT_SUMMARY: {
    version: "visit-summary-v1",
    type: "VISIT_SUMMARY",
    system: safetySystem,
    buildUserPrompt: jsonPrompt("Draft a patient-friendly visit summary in plain language without diagnosing beyond the doctor's note.", schemas.instructions)
  },
  REFERRAL_LETTER: {
    version: "referral-letter-v1",
    type: "REFERRAL_LETTER",
    system: safetySystem,
    buildUserPrompt: jsonPrompt("Draft a professional referral letter with reason, history, meds, relevant findings, and requested specialist input.", schemas.referral)
  },
  ASSISTANT_RESPONSE: {
    version: "assistant-response-v1",
    type: "ASSISTANT_RESPONSE",
    system: safetySystem,
    buildUserPrompt: jsonPrompt("Answer the doctor's question using selected patient context. Cite source snippets when possible.", schemas.assistant)
  },
  SEMANTIC_SEARCH: {
    version: "semantic-search-v1",
    type: "SEMANTIC_SEARCH",
    system: safetySystem,
    buildUserPrompt: jsonPrompt("Summarize the most relevant search matches and explain how they relate to the query.", schemas.assistant)
  },
  PORTAL_REPLY_DRAFT: {
    version: "portal-reply-draft-v1",
    type: "PORTAL_REPLY_DRAFT",
    system: [
      safetySystem,
      "Draft patient-visible portal replies only.",
      "Do not provide diagnosis, medication changes, test interpretation, or emergency triage instructions beyond telling the patient to contact emergency services for urgent symptoms.",
      "Use warm, concise clinic language and clearly identify missing information staff must verify before sending."
    ].join(" "),
    buildUserPrompt: jsonPrompt(
      "Draft a patient-safe reply to the portal request. Keep it operational, concise, empathetic, and non-diagnostic. Do not promise appointments, results, medication changes, or clinical conclusions unless the source context explicitly confirms them.",
      schemas.portalReply
    )
  }
};
