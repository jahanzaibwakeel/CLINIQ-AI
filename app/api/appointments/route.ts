import { NextResponse } from "next/server";
import { Role } from "@prisma/client";
import { auditLog } from "@/lib/audit";
import { prisma } from "@/lib/db";
import { apiError, parseJson } from "@/lib/http";
import { requireUser } from "@/lib/security/rbac";
import { appointmentCreateSchema } from "@/lib/validation";

export async function GET() {
  const auth = await requireUser();
  if (auth.response) return auth.response;

  const appointments = await prisma.appointment.findMany({
    where: { clinicId: auth.user.clinicId },
    include: {
      patient: { select: { firstName: true, lastName: true, mrn: true } },
      clinician: { select: { name: true, role: true } }
    },
    orderBy: { startsAt: "asc" },
    take: 100
  });

  return NextResponse.json({ appointments });
}

export async function POST(request: Request) {
  const auth = await requireUser([Role.DOCTOR, Role.CLINIC_ADMIN, Role.ASSISTANT]);
  if (auth.response) return auth.response;

  try {
    const input = await parseJson(request, appointmentCreateSchema);
    const patient = await prisma.patient.findFirst({
      where: { id: input.patientId, clinicId: auth.user.clinicId }
    });
    if (!patient) return NextResponse.json({ error: "Patient not found" }, { status: 404 });

    const clinicianId = input.clinicianId || auth.user.id;
    const clinician = await prisma.user.findFirst({
      where: { id: clinicianId, clinicId: auth.user.clinicId, role: { in: [Role.DOCTOR, Role.CLINIC_ADMIN] }, isActive: true }
    });
    if (!clinician) return NextResponse.json({ error: "Clinician not found" }, { status: 404 });

    const appointment = await prisma.appointment.create({
      data: {
        clinicId: auth.user.clinicId,
        patientId: input.patientId,
        clinicianId,
        title: input.title,
        reason: input.reason,
        startsAt: new Date(input.startsAt),
        endsAt: new Date(input.endsAt),
        location: input.location,
        notes: input.notes
      }
    });

    await auditLog({
      user: auth.user,
      action: "APPOINTMENT_CREATED",
      entityType: "Appointment",
      entityId: appointment.id,
      patientId: input.patientId,
      metadata: { startsAt: input.startsAt, endsAt: input.endsAt, clinicianId }
    });

    return NextResponse.json({ appointment }, { status: 201 });
  } catch (error) {
    return apiError(error);
  }
}
