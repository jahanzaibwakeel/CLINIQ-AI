import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { apiError, parseJson } from "@/lib/http";
import { requireUser } from "@/lib/security/rbac";
import { aiGenerateSchema } from "@/lib/validation";
import { runAiGeneration } from "@/lib/ai/service";
import { rateLimit } from "@/lib/rate-limit";
import { requestIdFrom } from "@/lib/observability";

export async function POST(request: Request) {
  const auth = await requireUser();
  if (auth.response) return auth.response;

  const limited = await rateLimit(`ai:${auth.user.id}`, 30, 60);
  if (limited) return limited;

  try {
    const input = await parseJson(request, aiGenerateSchema);
    let patientContext = "";

    if (input.patientId) {
      const patient = await prisma.patient.findFirst({
        where: { id: input.patientId, clinicId: auth.user.clinicId },
        include: { notes: { take: 5, orderBy: { createdAt: "desc" } }, documents: { take: 3 } }
      });
      if (!patient) return NextResponse.json({ error: "Patient not found" }, { status: 404 });
      patientContext = [
        `${patient.firstName} ${patient.lastName}, MRN ${patient.mrn}`,
        `Conditions: ${patient.conditions.join(", ") || "none listed"}`,
        `Medications: ${patient.medications.join(", ") || "none listed"}`,
        `Allergies: ${patient.allergies.join(", ") || "none listed"}`,
        ...patient.notes.map((note) => `Note: ${note.title} - ${note.body}`),
        ...patient.documents.map((doc) => `Document: ${doc.fileName} - ${doc.extractedText?.slice(0, 500) ?? ""}`)
      ].join("\n");
    }

    const result = await runAiGeneration({
      user: auth.user,
      type: input.type,
      sourceText: input.input,
      patientContext,
      question: input.question,
      patientId: input.patientId,
      consultationId: input.consultationId,
      documentId: input.documentId,
      requestId: requestIdFrom(request)
    });

    return NextResponse.json(result);
  } catch (error) {
    return apiError(error);
  }
}
