import { Role } from "@prisma/client";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { apiError, parseJson } from "@/lib/http";
import { requireUser } from "@/lib/security/rbac";
import { consultationCreateSchema } from "@/lib/validation";
import { auditLog } from "@/lib/audit";

export async function GET() {
  const auth = await requireUser();
  if (auth.response) return auth.response;

  const consultations = await prisma.consultation.findMany({
    where: { clinicId: auth.user.clinicId },
    include: {
      patient: { select: { firstName: true, lastName: true, mrn: true } },
      doctor: { select: { name: true } }
    },
    orderBy: { startedAt: "desc" },
    take: 50
  });
  return NextResponse.json({ consultations });
}

export async function POST(request: Request) {
  const auth = await requireUser([Role.DOCTOR]);
  if (auth.response) return auth.response;

  try {
    const input = await parseJson(request, consultationCreateSchema);
    const patient = await prisma.patient.findFirst({
      where: { id: input.patientId, clinicId: auth.user.clinicId }
    });
    if (!patient) return NextResponse.json({ error: "Patient not found" }, { status: 404 });

    const consultation = await prisma.consultation.create({
      data: {
        clinicId: auth.user.clinicId,
        patientId: input.patientId,
        doctorId: auth.user.id,
        reason: input.reason,
        rawNotes: input.rawNotes,
        startedAt: input.startedAt ? new Date(input.startedAt) : new Date()
      }
    });

    await auditLog({
      user: auth.user,
      action: "CONSULTATION_CREATED",
      entityType: "Consultation",
      entityId: consultation.id,
      patientId: input.patientId,
      consultationId: consultation.id
    });

    return NextResponse.json({ consultation }, { status: 201 });
  } catch (error) {
    return apiError(error);
  }
}
