import { z } from "zod";

export const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8)
});

export const patientCreateSchema = z.object({
  firstName: z.string().min(1),
  lastName: z.string().min(1),
  dateOfBirth: z.string().datetime().or(z.string().regex(/^\d{4}-\d{2}-\d{2}$/)),
  sex: z.string().min(1),
  phone: z.string().optional(),
  email: z.string().email().optional().or(z.literal("")),
  mrn: z.string().min(3),
  allergies: z.array(z.string()).default([]),
  medications: z.array(z.string()).default([]),
  conditions: z.array(z.string()).default([])
});

export const consultationCreateSchema = z.object({
  patientId: z.string().min(1),
  reason: z.string().min(2),
  rawNotes: z.string().min(5),
  startedAt: z.string().datetime().optional()
});

export const documentCreateSchema = z.object({
  patientId: z.string().min(1),
  fileName: z.string().min(1),
  mimeType: z.string().min(1),
  extractedText: z.string().min(5).max(250_000)
});

export const aiGenerateSchema = z.object({
  patientId: z.string().optional(),
  consultationId: z.string().optional(),
  documentId: z.string().optional(),
  type: z.enum([
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
    "SEMANTIC_SEARCH"
  ]),
  input: z.string().min(1),
  question: z.string().optional()
});

export const taskCreateSchema = z.object({
  patientId: z.string().optional(),
  consultationId: z.string().optional(),
  assigneeId: z.string().optional(),
  title: z.string().min(2),
  description: z.string().optional(),
  dueAt: z.string().datetime().optional()
});

export const taskUpdateSchema = z.object({
  status: z.enum(["OPEN", "IN_PROGRESS", "DONE", "CANCELLED"]).optional(),
  assigneeId: z.string().optional().nullable(),
  dueAt: z.string().datetime().optional().nullable()
});

export const followUpCreateSchema = z.object({
  patientId: z.string().min(1),
  consultationId: z.string().optional(),
  title: z.string().min(2),
  instructions: z.string().min(5),
  scheduledFor: z.string().datetime()
});

export const followUpUpdateSchema = z.object({
  status: z.enum(["SCHEDULED", "COMPLETED", "MISSED", "CANCELLED"])
});
