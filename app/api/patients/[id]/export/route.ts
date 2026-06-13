import { NextResponse } from "next/server";
import { auditLog } from "@/lib/audit";
import { prisma } from "@/lib/db";
import { requireUser } from "@/lib/security/rbac";
import { patientExportSchema } from "@/lib/validation";

export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireUser();
  if (auth.response) return auth.response;
  const routeParams = await params;
  const search = new URL(request.url).searchParams;
  const parsed = patientExportSchema.safeParse({
    reason: search.get("reason") ?? "",
    redacted: search.get("redacted") ?? "true"
  });
  if (!parsed.success) {
    return NextResponse.json({ error: "Export reason is required", issues: parsed.error.flatten() }, { status: 400 });
  }
  const redacted = parsed.data.redacted === "true";

  const patient = await prisma.patient.findFirst({
    where: { id: routeParams.id, clinicId: auth.user.clinicId },
    include: {
      consultations: { orderBy: { startedAt: "desc" } },
      notes: { orderBy: { createdAt: "desc" } },
      documents: { orderBy: { createdAt: "desc" } },
      tasks: { orderBy: { createdAt: "desc" } },
      followUps: { orderBy: { scheduledFor: "desc" } },
      appointments: { orderBy: { startsAt: "desc" } },
      aiGenerations: {
        orderBy: { createdAt: "desc" },
        select: {
          id: true,
          type: true,
          provider: true,
          model: true,
          promptVersion: true,
          reviewStatus: true,
          reviewedAt: true,
          createdAt: true
        }
      }
    }
  });

  if (!patient) return NextResponse.json({ error: "Patient not found" }, { status: 404 });

  await auditLog({
    user: auth.user,
    action: "PATIENT_CHART_EXPORTED",
    entityType: "Patient",
    entityId: patient.id,
    patientId: patient.id,
    metadata: { format: "json", generatedAt: new Date().toISOString(), reason: parsed.data.reason, redacted }
  });

  const exportedPatient = redacted
    ? {
        ...patient,
        phone: patient.phone ? "[redacted]" : null,
        email: patient.email ? "[redacted]" : null
      }
    : patient;

  const payload = {
    exportedAt: new Date().toISOString(),
    reason: parsed.data.reason,
    redacted,
    disclaimer: "Demo export. Validate legal/compliance requirements before using with real patient data.",
    patient: exportedPatient
  };

  return new NextResponse(JSON.stringify(payload, null, 2), {
    headers: {
      "Content-Type": "application/json",
      "Content-Disposition": `attachment; filename="${patient.mrn}-chart-export.json"`
    }
  });
}
