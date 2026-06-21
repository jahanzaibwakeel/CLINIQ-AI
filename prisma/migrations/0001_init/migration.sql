-- Initial CLINIK AI schema. Generated for PostgreSQL deployment readiness.
-- In local development, run `npm run db:migrate` to let Prisma manage future migrations.

CREATE TYPE "Role" AS ENUM ('DOCTOR', 'CLINIC_ADMIN', 'ASSISTANT');
CREATE TYPE "ConsultationStatus" AS ENUM ('DRAFT', 'IN_REVIEW', 'SIGNED');
CREATE TYPE "DocumentStatus" AS ENUM ('UPLOADED', 'PROCESSING', 'PROCESSED', 'FAILED');
CREATE TYPE "AiGenerationType" AS ENUM ('CONSULTATION_SUMMARY', 'SOAP_NOTE', 'HISTORY_TIMELINE', 'DOCUMENT_PARSE', 'FOLLOW_UP_INSTRUCTIONS', 'TASK_EXTRACTION', 'RISK_FLAG_EXPLAINER', 'VISIT_SUMMARY', 'REFERRAL_LETTER', 'ASSISTANT_RESPONSE', 'SEMANTIC_SEARCH');
CREATE TYPE "ReviewStatus" AS ENUM ('DRAFT', 'REVIEWED', 'REJECTED');
CREATE TYPE "TaskStatus" AS ENUM ('OPEN', 'IN_PROGRESS', 'DONE', 'CANCELLED');
CREATE TYPE "FollowUpStatus" AS ENUM ('SCHEDULED', 'COMPLETED', 'MISSED', 'CANCELLED');

CREATE TABLE "Clinic" ("id" TEXT NOT NULL, "name" TEXT NOT NULL, "timezone" TEXT NOT NULL DEFAULT 'UTC', "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, "updatedAt" TIMESTAMP(3) NOT NULL, CONSTRAINT "Clinic_pkey" PRIMARY KEY ("id"));
CREATE TABLE "User" ("id" TEXT NOT NULL, "clinicId" TEXT NOT NULL, "email" TEXT NOT NULL, "passwordHash" TEXT NOT NULL, "name" TEXT NOT NULL, "role" "Role" NOT NULL, "title" TEXT, "isActive" BOOLEAN NOT NULL DEFAULT true, "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, "updatedAt" TIMESTAMP(3) NOT NULL, CONSTRAINT "User_pkey" PRIMARY KEY ("id"));
CREATE TABLE "Patient" ("id" TEXT NOT NULL, "clinicId" TEXT NOT NULL, "primaryDoctorId" TEXT, "firstName" TEXT NOT NULL, "lastName" TEXT NOT NULL, "dateOfBirth" TIMESTAMP(3) NOT NULL, "sex" TEXT NOT NULL, "phone" TEXT, "email" TEXT, "mrn" TEXT NOT NULL, "allergies" TEXT[], "medications" TEXT[], "conditions" TEXT[], "riskScore" INTEGER NOT NULL DEFAULT 0, "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, "updatedAt" TIMESTAMP(3) NOT NULL, CONSTRAINT "Patient_pkey" PRIMARY KEY ("id"));
CREATE TABLE "Consultation" ("id" TEXT NOT NULL, "clinicId" TEXT NOT NULL, "patientId" TEXT NOT NULL, "doctorId" TEXT NOT NULL, "status" "ConsultationStatus" NOT NULL DEFAULT 'DRAFT', "reason" TEXT NOT NULL, "rawNotes" TEXT NOT NULL, "summary" TEXT, "soapNote" JSONB, "startedAt" TIMESTAMP(3) NOT NULL, "signedAt" TIMESTAMP(3), "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, "updatedAt" TIMESTAMP(3) NOT NULL, CONSTRAINT "Consultation_pkey" PRIMARY KEY ("id"));
CREATE TABLE "Note" ("id" TEXT NOT NULL, "clinicId" TEXT NOT NULL, "patientId" TEXT NOT NULL, "consultationId" TEXT, "authorId" TEXT NOT NULL, "title" TEXT NOT NULL, "body" TEXT NOT NULL, "tags" TEXT[], "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, "updatedAt" TIMESTAMP(3) NOT NULL, CONSTRAINT "Note_pkey" PRIMARY KEY ("id"));
CREATE TABLE "Document" ("id" TEXT NOT NULL, "clinicId" TEXT NOT NULL, "patientId" TEXT NOT NULL, "uploadedById" TEXT NOT NULL, "fileName" TEXT NOT NULL, "mimeType" TEXT NOT NULL, "storageKey" TEXT NOT NULL, "extractedText" TEXT, "parsedJson" JSONB, "status" "DocumentStatus" NOT NULL DEFAULT 'UPLOADED', "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, "updatedAt" TIMESTAMP(3) NOT NULL, CONSTRAINT "Document_pkey" PRIMARY KEY ("id"));
CREATE TABLE "DocumentChunk" ("id" TEXT NOT NULL, "documentId" TEXT NOT NULL, "chunkIndex" INTEGER NOT NULL, "content" TEXT NOT NULL, "metadata" JSONB, "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, CONSTRAINT "DocumentChunk_pkey" PRIMARY KEY ("id"));
CREATE TABLE "Embedding" ("id" TEXT NOT NULL, "clinicId" TEXT NOT NULL, "patientId" TEXT NOT NULL, "noteId" TEXT, "documentChunkId" TEXT, "model" TEXT NOT NULL, "vector" JSONB NOT NULL, "contentPreview" TEXT NOT NULL, "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, CONSTRAINT "Embedding_pkey" PRIMARY KEY ("id"));
CREATE TABLE "AiGeneration" ("id" TEXT NOT NULL, "clinicId" TEXT NOT NULL, "patientId" TEXT, "consultationId" TEXT, "documentId" TEXT, "type" "AiGenerationType" NOT NULL, "provider" TEXT NOT NULL, "model" TEXT NOT NULL, "promptVersion" TEXT NOT NULL, "sourceContext" JSONB NOT NULL, "output" JSONB NOT NULL, "rawOutput" TEXT, "reviewStatus" "ReviewStatus" NOT NULL DEFAULT 'DRAFT', "reviewerId" TEXT, "reviewedAt" TIMESTAMP(3), "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, CONSTRAINT "AiGeneration_pkey" PRIMARY KEY ("id"));
CREATE TABLE "Task" ("id" TEXT NOT NULL, "clinicId" TEXT NOT NULL, "patientId" TEXT, "consultationId" TEXT, "createdById" TEXT NOT NULL, "assigneeId" TEXT, "title" TEXT NOT NULL, "description" TEXT, "status" "TaskStatus" NOT NULL DEFAULT 'OPEN', "dueAt" TIMESTAMP(3), "source" TEXT NOT NULL DEFAULT 'manual', "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, "updatedAt" TIMESTAMP(3) NOT NULL, CONSTRAINT "Task_pkey" PRIMARY KEY ("id"));
CREATE TABLE "FollowUp" ("id" TEXT NOT NULL, "clinicId" TEXT NOT NULL, "patientId" TEXT NOT NULL, "consultationId" TEXT, "ownerId" TEXT NOT NULL, "title" TEXT NOT NULL, "instructions" TEXT NOT NULL, "scheduledFor" TIMESTAMP(3) NOT NULL, "status" "FollowUpStatus" NOT NULL DEFAULT 'SCHEDULED', "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, "updatedAt" TIMESTAMP(3) NOT NULL, CONSTRAINT "FollowUp_pkey" PRIMARY KEY ("id"));
CREATE TABLE "AuditLog" ("id" TEXT NOT NULL, "clinicId" TEXT NOT NULL, "actorId" TEXT, "patientId" TEXT, "consultationId" TEXT, "action" TEXT NOT NULL, "entityType" TEXT NOT NULL, "entityId" TEXT NOT NULL, "metadata" JSONB, "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, CONSTRAINT "AuditLog_pkey" PRIMARY KEY ("id"));

CREATE UNIQUE INDEX "User_email_key" ON "User"("email");
CREATE UNIQUE INDEX "Patient_mrn_key" ON "Patient"("mrn");
CREATE UNIQUE INDEX "DocumentChunk_documentId_chunkIndex_key" ON "DocumentChunk"("documentId", "chunkIndex");
CREATE INDEX "Patient_clinicId_lastName_firstName_idx" ON "Patient"("clinicId", "lastName", "firstName");
CREATE INDEX "Consultation_clinicId_patientId_startedAt_idx" ON "Consultation"("clinicId", "patientId", "startedAt");
CREATE INDEX "Document_clinicId_patientId_status_idx" ON "Document"("clinicId", "patientId", "status");
CREATE INDEX "Embedding_clinicId_patientId_idx" ON "Embedding"("clinicId", "patientId");
CREATE INDEX "AiGeneration_clinicId_patientId_type_createdAt_idx" ON "AiGeneration"("clinicId", "patientId", "type", "createdAt");
CREATE INDEX "AuditLog_clinicId_createdAt_idx" ON "AuditLog"("clinicId", "createdAt");

ALTER TABLE "User" ADD CONSTRAINT "User_clinicId_fkey" FOREIGN KEY ("clinicId") REFERENCES "Clinic"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "Patient" ADD CONSTRAINT "Patient_clinicId_fkey" FOREIGN KEY ("clinicId") REFERENCES "Clinic"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "Patient" ADD CONSTRAINT "Patient_primaryDoctorId_fkey" FOREIGN KEY ("primaryDoctorId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "Consultation" ADD CONSTRAINT "Consultation_patientId_fkey" FOREIGN KEY ("patientId") REFERENCES "Patient"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "Consultation" ADD CONSTRAINT "Consultation_doctorId_fkey" FOREIGN KEY ("doctorId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "Note" ADD CONSTRAINT "Note_patientId_fkey" FOREIGN KEY ("patientId") REFERENCES "Patient"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "Note" ADD CONSTRAINT "Note_consultationId_fkey" FOREIGN KEY ("consultationId") REFERENCES "Consultation"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "Note" ADD CONSTRAINT "Note_authorId_fkey" FOREIGN KEY ("authorId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "Document" ADD CONSTRAINT "Document_patientId_fkey" FOREIGN KEY ("patientId") REFERENCES "Patient"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "Document" ADD CONSTRAINT "Document_uploadedById_fkey" FOREIGN KEY ("uploadedById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "DocumentChunk" ADD CONSTRAINT "DocumentChunk_documentId_fkey" FOREIGN KEY ("documentId") REFERENCES "Document"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "Embedding" ADD CONSTRAINT "Embedding_documentChunkId_fkey" FOREIGN KEY ("documentChunkId") REFERENCES "DocumentChunk"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "AiGeneration" ADD CONSTRAINT "AiGeneration_clinicId_fkey" FOREIGN KEY ("clinicId") REFERENCES "Clinic"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "AiGeneration" ADD CONSTRAINT "AiGeneration_patientId_fkey" FOREIGN KEY ("patientId") REFERENCES "Patient"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "AiGeneration" ADD CONSTRAINT "AiGeneration_consultationId_fkey" FOREIGN KEY ("consultationId") REFERENCES "Consultation"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "AiGeneration" ADD CONSTRAINT "AiGeneration_documentId_fkey" FOREIGN KEY ("documentId") REFERENCES "Document"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "AiGeneration" ADD CONSTRAINT "AiGeneration_reviewerId_fkey" FOREIGN KEY ("reviewerId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "Task" ADD CONSTRAINT "Task_patientId_fkey" FOREIGN KEY ("patientId") REFERENCES "Patient"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "Task" ADD CONSTRAINT "Task_consultationId_fkey" FOREIGN KEY ("consultationId") REFERENCES "Consultation"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "Task" ADD CONSTRAINT "Task_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "Task" ADD CONSTRAINT "Task_assigneeId_fkey" FOREIGN KEY ("assigneeId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "FollowUp" ADD CONSTRAINT "FollowUp_patientId_fkey" FOREIGN KEY ("patientId") REFERENCES "Patient"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "FollowUp" ADD CONSTRAINT "FollowUp_consultationId_fkey" FOREIGN KEY ("consultationId") REFERENCES "Consultation"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "FollowUp" ADD CONSTRAINT "FollowUp_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "AuditLog" ADD CONSTRAINT "AuditLog_clinicId_fkey" FOREIGN KEY ("clinicId") REFERENCES "Clinic"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "AuditLog" ADD CONSTRAINT "AuditLog_actorId_fkey" FOREIGN KEY ("actorId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "AuditLog" ADD CONSTRAINT "AuditLog_patientId_fkey" FOREIGN KEY ("patientId") REFERENCES "Patient"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "AuditLog" ADD CONSTRAINT "AuditLog_consultationId_fkey" FOREIGN KEY ("consultationId") REFERENCES "Consultation"("id") ON DELETE SET NULL ON UPDATE CASCADE;
