import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { apiError, parseJson } from "@/lib/http";
import { requireUser } from "@/lib/security/rbac";
import { documentCreateSchema } from "@/lib/validation";
import { processDocumentJob } from "@/lib/jobs";
import { auditLog } from "@/lib/audit";
import { rateLimit } from "@/lib/rate-limit";
import { requestIdFrom } from "@/lib/observability";
import { saveDocumentFile } from "@/lib/storage";

export async function GET() {
  const auth = await requireUser();
  if (auth.response) return auth.response;

  const documents = await prisma.document.findMany({
    where: { clinicId: auth.user.clinicId },
    include: {
      patient: { select: { firstName: true, lastName: true, mrn: true } },
      uploadedBy: { select: { name: true } }
    },
    orderBy: { createdAt: "desc" },
    take: 50
  });
  return NextResponse.json({ documents });
}

export async function POST(request: Request) {
  const auth = await requireUser();
  if (auth.response) return auth.response;

  try {
    const limited = await rateLimit(`document-upload:${auth.user.id}`, 20, 60);
    if (limited) return limited;

    const input = await parseJson(request, documentCreateSchema);
    const patient = await prisma.patient.findFirst({
      where: { id: input.patientId, clinicId: auth.user.clinicId }
    });
    if (!patient) return NextResponse.json({ error: "Patient not found" }, { status: 404 });
    const storedFile = await saveDocumentFile({
      clinicId: auth.user.clinicId,
      fileName: input.fileName,
      fileBase64: input.fileBase64,
      extractedText: input.extractedText
    });

    const document = await prisma.document.create({
      data: {
        clinicId: auth.user.clinicId,
        patientId: input.patientId,
        uploadedById: auth.user.id,
        fileName: input.fileName,
        mimeType: input.mimeType,
        storageKey: storedFile.storageKey,
        storageProvider: storedFile.storageProvider,
        fileSizeBytes: storedFile.fileSizeBytes,
        checksumSha256: storedFile.checksumSha256,
        virusScanStatus: storedFile.virusScanStatus,
        extractedText: input.extractedText,
        status: "UPLOADED"
      }
    });

    await processDocumentJob({
      clinicId: auth.user.clinicId,
      patientId: input.patientId,
      documentId: document.id,
      extractedText: input.extractedText,
      user: auth.user,
      requestId: requestIdFrom(request)
    });

    await auditLog({
      user: auth.user,
      action: "DOCUMENT_UPLOADED",
      entityType: "Document",
      entityId: document.id,
      patientId: input.patientId,
      metadata: {
        storageProvider: storedFile.storageProvider,
        fileSizeBytes: storedFile.fileSizeBytes,
        checksumSha256: storedFile.checksumSha256,
        virusScanStatus: storedFile.virusScanStatus
      }
    });

    const processedDocument = await prisma.document.findUnique({
      where: { id: document.id },
      include: { chunks: true }
    });

    return NextResponse.json({ document: processedDocument ?? document }, { status: 201 });
  } catch (error) {
    return apiError(error);
  }
}
