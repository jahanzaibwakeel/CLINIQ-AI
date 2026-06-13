import { z } from "zod";
import { env } from "@/lib/env";

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
  extractedText: z.string().min(5).max(250_000),
  fileBase64: z.string().optional()
}).refine((value) => {
  if (!value.fileBase64) return true;
  const payload = value.fileBase64.includes(",") ? value.fileBase64.split(",").pop() ?? "" : value.fileBase64;
  return Math.ceil((payload.length * 3) / 4) <= env.DOCUMENT_MAX_UPLOAD_BYTES;
}, {
  message: "Uploaded file exceeds configured size limit",
  path: ["fileBase64"]
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

export const aiReviewSchema = z.object({
  reviewStatus: z.enum(["REVIEWED", "REJECTED"]),
  reviewerNote: z.string().max(1000).optional(),
  output: z.unknown().optional(),
  applyToRecord: z.boolean().default(false)
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

export const appointmentCreateSchema = z.object({
  patientId: z.string().min(1),
  clinicianId: z.string().optional(),
  title: z.string().min(2),
  reason: z.string().optional(),
  startsAt: z.string().datetime(),
  endsAt: z.string().datetime(),
  location: z.string().optional(),
  notes: z.string().optional()
}).refine((value) => new Date(value.endsAt) > new Date(value.startsAt), {
  message: "Appointment end time must be after start time",
  path: ["endsAt"]
});

export const appointmentUpdateSchema = z.object({
  status: z.enum(["SCHEDULED", "CHECKED_IN", "COMPLETED", "CANCELLED", "NO_SHOW"])
});

export const staffUpdateSchema = z.object({
  role: z.enum(["DOCTOR", "CLINIC_ADMIN", "ASSISTANT"]).optional(),
  isActive: z.boolean().optional(),
  resetLockout: z.boolean().optional()
}).refine((value) => value.role !== undefined || value.isActive !== undefined || value.resetLockout === true, {
  message: "At least one staff update action is required"
});

export const patientExportSchema = z.object({
  reason: z.string().min(8).max(240),
  redacted: z.enum(["true", "false"]).default("true")
});
