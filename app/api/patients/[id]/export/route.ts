import { NextResponse } from "next/server";
import { auditLog } from "@/lib/audit";
import { prisma } from "@/lib/db";
import { requireUser } from "@/lib/security/rbac";

export async function GET(_request: Request, { params }: { params: { id: string } }) {
  const auth = await requireUser();
  if (auth.response) return auth.response;

  const patient = await prisma.patient.findFirst({
    where: { id: params.id, clinicId: auth.user.clinicId },
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
    metadata: { format: "json", generatedAt: new Date().toISOString() }
  });

  const payload = {
    exportedAt: new Date().toISOString(),
    disclaimer: "Demo export. Validate legal/compliance requirements before using with real patient data.",
    patient
  };

  return new NextResponse(JSON.stringify(payload, null, 2), {
    headers: {
      "Content-Type": "application/json",
      "Content-Disposition": `attachment; filename="${patient.mrn}-chart-export.json"`
    }
  });
}
