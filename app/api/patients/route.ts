import { Role } from "@prisma/client";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { apiError, parseJson } from "@/lib/http";
import { requireUser } from "@/lib/security/rbac";
import { patientCreateSchema } from "@/lib/validation";
import { auditLog } from "@/lib/audit";

export async function GET() {
  const auth = await requireUser();
  if (auth.response) return auth.response;

  const patients = await prisma.patient.findMany({
    where: { clinicId: auth.user.clinicId },
    include: {
      primaryDoctor: { select: { name: true } },
      consultations: { select: { id: true } },
      followUps: { where: { status: "SCHEDULED" }, select: { id: true, scheduledFor: true } }
    },
    orderBy: [{ updatedAt: "desc" }]
  });
  return NextResponse.json({ patients });
}

export async function POST(request: Request) {
  const auth = await requireUser([Role.DOCTOR, Role.CLINIC_ADMIN]);
  if (auth.response) return auth.response;

  try {
    const input = await parseJson(request, patientCreateSchema);
    const patient = await prisma.patient.create({
      data: {
        clinicId: auth.user.clinicId,
        primaryDoctorId: auth.user.role === Role.DOCTOR ? auth.user.id : undefined,
        firstName: input.firstName,
        lastName: input.lastName,
        dateOfBirth: new Date(input.dateOfBirth),
        sex: input.sex,
        phone: input.phone,
        email: input.email || undefined,
        mrn: input.mrn,
        allergies: input.allergies,
        medications: input.medications,
        conditions: input.conditions
      }
    });

    await auditLog({
      user: auth.user,
      action: "PATIENT_CREATED",
      entityType: "Patient",
      entityId: patient.id,
      patientId: patient.id
    });

    return NextResponse.json({ patient }, { status: 201 });
  } catch (error) {
    return apiError(error);
  }
}
