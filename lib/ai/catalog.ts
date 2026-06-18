export type AiTaskType =
  | "CONSULTATION_SUMMARY"
  | "SOAP_NOTE"
  | "HISTORY_TIMELINE"
  | "DOCUMENT_PARSE"
  | "FOLLOW_UP_INSTRUCTIONS"
  | "TASK_EXTRACTION"
  | "RISK_FLAG_EXPLAINER"
  | "VISIT_SUMMARY"
  | "REFERRAL_LETTER"
  | "ASSISTANT_RESPONSE"
  | "SEMANTIC_SEARCH"
  | "PORTAL_REPLY_DRAFT";

export type AiTaskCopy = {
  type: AiTaskType;
  shortLabel: string;
  actionLabel: string;
  draftTitle: string;
  primarySectionTitle: string;
  reviewTitle: string;
  help: string;
  outputSummary: string;
};

export const aiTaskOrder: AiTaskType[] = [
  "CONSULTATION_SUMMARY",
  "SOAP_NOTE",
  "HISTORY_TIMELINE",
  "DOCUMENT_PARSE",
  "FOLLOW_UP_INSTRUCTIONS",
  "TASK_EXTRACTION",
  "RISK_FLAG_EXPLAINER",
  "VISIT_SUMMARY",
  "REFERRAL_LETTER",
  "ASSISTANT_RESPONSE",
  "SEMANTIC_SEARCH",
  "PORTAL_REPLY_DRAFT"
];

export const aiTaskCatalog: Record<AiTaskType, AiTaskCopy> = {
  CONSULTATION_SUMMARY: {
    type: "CONSULTATION_SUMMARY",
    shortLabel: "Consult summary",
    actionLabel: "consultation summary",
    draftTitle: "AI consultation summary draft",
    primarySectionTitle: "Clinical summary",
    reviewTitle: "Consultation summary review",
    help: "Turn rough doctor bullets into a concise clinician-facing consultation summary.",
    outputSummary: "Generalizes symptoms, values, orders, uncertainties, and missing follow-up items for doctor review."
  },
  SOAP_NOTE: {
    type: "SOAP_NOTE",
    shortLabel: "SOAP note",
    actionLabel: "SOAP note",
    draftTitle: "AI SOAP note draft",
    primarySectionTitle: "SOAP note",
    reviewTitle: "SOAP note review",
    help: "Draft Subjective, Objective, Assessment, and Plan sections from provided context.",
    outputSummary: "Structures encounter information without inventing exam findings, diagnoses, or final plans."
  },
  HISTORY_TIMELINE: {
    type: "HISTORY_TIMELINE",
    shortLabel: "History timeline",
    actionLabel: "history timeline",
    draftTitle: "AI patient history timeline draft",
    primarySectionTitle: "Timeline summary",
    reviewTitle: "History timeline review",
    help: "Summarize patient history and recurring themes in chronological language.",
    outputSummary: "Highlights major events, repeated issues, and gaps in the patient record."
  },
  DOCUMENT_PARSE: {
    type: "DOCUMENT_PARSE",
    shortLabel: "Report parser",
    actionLabel: "report parse",
    draftTitle: "AI document parsing draft",
    primarySectionTitle: "Document summary",
    reviewTitle: "Document parse review",
    help: "Extract labs, dates, medications, abnormal values, and follow-up needs from report text.",
    outputSummary: "Normalizes document findings into reviewed clinical fields and flags."
  },
  FOLLOW_UP_INSTRUCTIONS: {
    type: "FOLLOW_UP_INSTRUCTIONS",
    shortLabel: "Follow-up plan",
    actionLabel: "follow-up plan",
    draftTitle: "AI follow-up instruction draft",
    primarySectionTitle: "Follow-up summary",
    reviewTitle: "Follow-up instruction review",
    help: "Draft simple next-step instructions for patient or clinic follow-up.",
    outputSummary: "Converts doctor notes into clear follow-up actions and patient-facing instructions."
  },
  TASK_EXTRACTION: {
    type: "TASK_EXTRACTION",
    shortLabel: "Task extraction",
    actionLabel: "task list",
    draftTitle: "AI clinic task extraction draft",
    primarySectionTitle: "Task extraction summary",
    reviewTitle: "Task extraction review",
    help: "Find operational tasks for assistants, doctors, or clinic staff.",
    outputSummary: "Extracts call backs, lab tracking, scheduling, review tasks, priorities, and rationale."
  },
  RISK_FLAG_EXPLAINER: {
    type: "RISK_FLAG_EXPLAINER",
    shortLabel: "Risk flags",
    actionLabel: "risk flag explanation",
    draftTitle: "AI risk flag explanation draft",
    primarySectionTitle: "Risk flag summary",
    reviewTitle: "Risk flag review",
    help: "Explain missed follow-up, abnormal values, and important clinical keywords.",
    outputSummary: "Explains why selected items deserve clinician attention without final diagnosis language."
  },
  VISIT_SUMMARY: {
    type: "VISIT_SUMMARY",
    shortLabel: "Patient summary",
    actionLabel: "patient visit summary",
    draftTitle: "AI patient-friendly visit summary draft",
    primarySectionTitle: "Patient-friendly summary",
    reviewTitle: "Patient summary review",
    help: "Convert clinical notes into plain-language patient-friendly wording.",
    outputSummary: "Creates simple visit language and instructions that still require doctor approval."
  },
  REFERRAL_LETTER: {
    type: "REFERRAL_LETTER",
    shortLabel: "Referral letter",
    actionLabel: "referral letter",
    draftTitle: "AI referral letter draft",
    primarySectionTitle: "Referral letter",
    reviewTitle: "Referral letter review",
    help: "Draft a professional specialist referral letter from selected patient context.",
    outputSummary: "Prepares referral wording with reason, context, relevant findings, and missing send-ready items."
  },
  ASSISTANT_RESPONSE: {
    type: "ASSISTANT_RESPONSE",
    shortLabel: "Ask context",
    actionLabel: "context answer",
    draftTitle: "AI patient-context answer draft",
    primarySectionTitle: "Context answer",
    reviewTitle: "Patient-context answer review",
    help: "Ask a focused question about the selected patient context.",
    outputSummary: "Answers the doctor's question using available snippets and cites the source context."
  },
  SEMANTIC_SEARCH: {
    type: "SEMANTIC_SEARCH",
    shortLabel: "Semantic search",
    actionLabel: "search summary",
    draftTitle: "AI semantic search summary draft",
    primarySectionTitle: "Search summary",
    reviewTitle: "Semantic search review",
    help: "Summarize relevant note and document matches for a clinical query.",
    outputSummary: "Ranks and explains patient-history matches using local embeddings when available."
  },
  PORTAL_REPLY_DRAFT: {
    type: "PORTAL_REPLY_DRAFT",
    shortLabel: "Portal reply",
    actionLabel: "patient-safe portal reply",
    draftTitle: "AI patient portal reply draft",
    primarySectionTitle: "Reply summary",
    reviewTitle: "Portal reply review",
    help: "Draft a warm, operational response to a patient portal request without giving diagnosis or treatment changes.",
    outputSummary: "Creates patient-safe wording for staff to review, edit, and send manually."
  }
};

export function getAiTaskCopy(type: string | undefined): AiTaskCopy {
  if (type && type in aiTaskCatalog) return aiTaskCatalog[type as AiTaskType];
  return {
    type: "CONSULTATION_SUMMARY",
    shortLabel: type ? type.replaceAll("_", " ").toLowerCase() : "AI draft",
    actionLabel: "AI draft",
    draftTitle: type ? `AI ${type.replaceAll("_", " ").toLowerCase()} draft` : "AI draft",
    primarySectionTitle: "Summary",
    reviewTitle: "AI draft review",
    help: "Generate a doctor-reviewed AI draft from selected context.",
    outputSummary: "Stores a structured AI draft for clinician review."
  };
}
