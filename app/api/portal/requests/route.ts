import { NextResponse } from "next/server";
import { Role } from "@prisma/client";
import { prisma } from "@/lib/db";
import { apiError, parseJson } from "@/lib/http";
import { rateLimit } from "@/lib/rate-limit";
import { requireUser } from "@/lib/security/rbac";
import { patientPortalRequestSchema } from "@/lib/validation";

function dayRange(date: string) {
  const start = new Date(`${date}T00:00:00.000Z`);
  const end = new Date(start.getTime() + 24 * 60 * 60 * 1000);
  return { start, end };
}

function clientKey(request: Request) {
  return request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";
}

export async function GET() {
  const auth = await requireUser([Role.DOCTOR, Role.CLINIC_ADMIN, Role.ASSISTANT]);
  if (auth.response) return auth.response;

  const requests = await prisma.patientPortalRequest.findMany({
    where: { clinicId: auth.user.clinicId },
    include: { patient: { select: { firstName: true, lastName: true, mrn: true, phone: true, email: true } } },
    orderBy: [{ status: "asc" }, { createdAt: "desc" }],
    take: 100
  });

  return NextResponse.json({ requests });
}

export async function POST(request: Request) {
  const limited = await rateLimit(`portal-request:${clientKey(request)}`, 6, 60);
  if (limited) return limited;

  try {
    const input = await parseJson(request, patientPortalRequestSchema);
    const { start, end } = dayRange(input.dateOfBirth);
    const patient = await prisma.patient.findFirst({
      where: {
        id: input.patientId,
        mrn: input.mrn.trim(),
        dateOfBirth: { gte: start, lt: end }
      },
      select: { id: true, clinicId: true }
    });

    if (!patient) {
      return NextResponse.json({ error: "Patient verification failed." }, { status: 404 });
    }

    const portalRequest = await prisma.patientPortalRequest.create({
      data: {
        clinicId: patient.clinicId,
        patientId: patient.id,
        type: input.type,
        subject: input.subject.trim(),
        message: input.message.trim(),
        preferredContact: input.preferredContact?.trim() || null
      }
    });

    await prisma.auditLog.create({
      data: {
        clinicId: patient.clinicId,
        actorId: null,
        patientId: patient.id,
        action: "PATIENT_PORTAL_REQUEST_CREATED",
        entityType: "PatientPortalRequest",
        entityId: portalRequest.id,
        metadata: { type: portalRequest.type, status: portalRequest.status }
      }
    });

    return NextResponse.json({ request: portalRequest }, { status: 201 });
  } catch (error) {
    return apiError(error, request);
  }
}
