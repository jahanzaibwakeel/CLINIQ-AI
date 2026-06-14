import { NextResponse } from "next/server";
import { Role } from "@prisma/client";
import { patientPortalEmailHtml, sendEmail } from "@/lib/email";
import { prisma } from "@/lib/db";
import { apiError, parseJson } from "@/lib/http";
import { patientPortalDayRange } from "@/lib/patient-portal";
import { rateLimit } from "@/lib/rate-limit";
import { requestIdFrom } from "@/lib/observability";
import { getPatientPortalSession } from "@/lib/security/patient-portal-session";
import { requireUser } from "@/lib/security/rbac";
import { patientPortalRequestSchema } from "@/lib/validation";

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
  const requestId = requestIdFrom(request);
  const limited = await rateLimit(`portal-request:${clientKey(request)}`, 6, 60);
  if (limited) return limited;

  try {
    const input = await parseJson(request, patientPortalRequestSchema);
    const portalSession = await getPatientPortalSession();
    const verifiedBySession = portalSession?.patientId === input.patientId;
    const dobVerification = input.mrn && input.dateOfBirth ? patientPortalDayRange(input.dateOfBirth) : null;

    if (!verifiedBySession && !dobVerification) {
      return NextResponse.json({ error: "Patient verification is required." }, { status: 401 });
    }

    const patient = await prisma.patient.findFirst({
      where: {
        id: input.patientId,
        ...(verifiedBySession
          ? { clinicId: portalSession.clinicId }
          : {
              mrn: input.mrn?.trim(),
              dateOfBirth: { gte: dobVerification?.start, lt: dobVerification?.end }
            })
      },
      select: { id: true, clinicId: true, firstName: true, email: true }
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

    let delivery: "none" | "smtp" | "log" = "none";
    if (patient.email) {
      const result = await sendEmail({
        to: patient.email,
        subject: "MediPilot portal request received",
        text: `Your clinic request was received: ${portalRequest.subject}`,
        html: patientPortalEmailHtml(
          "Your clinic request was received",
          `${patient.firstName}, your clinic team received "${portalRequest.subject}". A staff member will review it during clinic hours.`
        ),
        requestId
      });
      delivery = result.delivery;
    }

    await prisma.auditLog.create({
      data: {
        clinicId: patient.clinicId,
        actorId: null,
        patientId: patient.id,
        action: "PATIENT_PORTAL_REQUEST_CREATED",
        entityType: "PatientPortalRequest",
        entityId: portalRequest.id,
        metadata: { type: portalRequest.type, status: portalRequest.status, requestId, delivery }
      }
    });

    return NextResponse.json({ request: portalRequest }, { status: 201 });
  } catch (error) {
    return apiError(error, request);
  }
}
