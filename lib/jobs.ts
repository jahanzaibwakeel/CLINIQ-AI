import { prisma } from "@/lib/db";
import { embedText } from "@/lib/ai/semantic-search";
import { runAiGeneration } from "@/lib/ai/service";
import { auditLog } from "@/lib/audit";
import type { SessionUser } from "@/lib/security/session";

export async function processDocumentJob(input: {
  clinicId: string;
  patientId: string;
  documentId: string;
  extractedText: string;
  user: SessionUser;
  requestId?: string;
}) {
  try {
    await prisma.document.update({
      where: { id: input.documentId },
      data: { status: "PROCESSING" }
    });

    const chunks = input.extractedText.match(/[\s\S]{1,1200}/g) ?? [input.extractedText];
    for (const [index, chunk] of chunks.entries()) {
      const documentChunk = await prisma.documentChunk.create({
        data: {
          documentId: input.documentId,
          chunkIndex: index,
          content: chunk,
          metadata: { processor: "inline-worker" }
        }
      });
      const vector = await embedText(chunk);
      await prisma.embedding.create({
        data: {
          clinicId: input.clinicId,
          patientId: input.patientId,
          documentChunkId: documentChunk.id,
          model: "configured-provider-or-local-hash",
          vector,
          contentPreview: chunk.slice(0, 240)
        }
      });
    }

    await prisma.document.update({
      where: { id: input.documentId },
      data: { status: "PROCESSED" }
    });

    await createDocumentTriageDrafts(input);
  } catch (error) {
    await prisma.document.update({
      where: { id: input.documentId },
      data: { status: "FAILED" }
    });
    await auditLog({
      user: input.user,
      action: "DOCUMENT_PROCESSING_FAILED",
      entityType: "Document",
      entityId: input.documentId,
      patientId: input.patientId,
      metadata: {
        requestId: input.requestId,
        error: error instanceof Error ? error.message : "Unknown document processing error"
      }
    });
    throw error;
  }
}

async function createDocumentTriageDrafts(input: {
  clinicId: string;
  patientId: string;
  documentId: string;
  extractedText: string;
  user: SessionUser;
  requestId?: string;
}) {
  const patient = await prisma.patient.findUnique({
    where: { id: input.patientId },
    select: {
      firstName: true,
      lastName: true,
      mrn: true,
      allergies: true,
      medications: true,
      conditions: true
    }
  });
  const patientContext = patient
    ? [
        `${patient.firstName} ${patient.lastName}, MRN ${patient.mrn}`,
        `Conditions: ${patient.conditions.join(", ") || "none listed"}`,
        `Medications: ${patient.medications.join(", ") || "none listed"}`,
        `Allergies: ${patient.allergies.join(", ") || "none listed"}`
      ].join("\n")
    : "";

  const triageTypes = ["DOCUMENT_PARSE", "RISK_FLAG_EXPLAINER", "TASK_EXTRACTION"] as const;
  const triageResults = [];
  for (const type of triageTypes) {
    try {
      const result = await runAiGeneration({
        user: input.user,
        type,
        sourceText: input.extractedText,
        patientContext,
        patientId: input.patientId,
        documentId: input.documentId,
        requestId: input.requestId
      });
      triageResults.push({ type, generationId: result.generationId, provider: result.provider, latencyMs: result.latencyMs });
    } catch (error) {
      triageResults.push({ type, error: error instanceof Error ? error.message : "AI triage failed" });
    }
  }

  await auditLog({
    user: input.user,
    action: "DOCUMENT_AI_TRIAGE_COMPLETED",
    entityType: "Document",
    entityId: input.documentId,
    patientId: input.patientId,
    metadata: { requestId: input.requestId, triageResults }
  });
}
