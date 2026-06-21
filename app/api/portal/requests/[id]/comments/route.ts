import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { patientPortalEmailHtml, sendEmail } from "@/lib/email";
import { apiError, parseJson } from "@/lib/http";
import { requestIdFrom } from "@/lib/observability";
import { rateLimit } from "@/lib/rate-limit";
import { getPatientPortalSession } from "@/lib/security/patient-portal-session";
import { getSession } from "@/lib/security/session";
import { patientPortalCommentSchema } from "@/lib/validation";

function clientKey(request: Request) {
  return request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";
}

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const requestId = requestIdFrom(request);
  const limited = await rateLimit(`portal-comment:${clientKey(request)}`, 12, 60);
  if (limited) return limited;

  try {
    const routeParams = await params;
    const input = await parseJson(request, patientPortalCommentSchema);
    const staffUser = await getSession();
    const patientSession = staffUser ? null : await getPatientPortalSession();

    if (!staffUser && !patientSession) {
      return NextResponse.json({ error: "Authentication required" }, { status: 401 });
    }

    const portalRequest = await prisma.patientPortalRequest.findFirst({
      where: {
        id: routeParams.id,
        ...(staffUser
          ? { clinicId: staffUser.clinicId }
          : { clinicId: patientSession?.clinicId, patientId: patientSession?.patientId })
      },
      include: {
        patient: { select: { firstName: true, email: true } }
      }
    });

    if (!portalRequest) {
      return NextResponse.json({ error: "Portal request not found" }, { status: 404 });
    }

    const authorType = staffUser ? "STAFF" : "PATIENT";
    const comment = await prisma.patientPortalRequestComment.create({
      data: {
        clinicId: portalRequest.clinicId,
        requestId: portalRequest.id,
        patientId: portalRequest.patientId,
        authorUserId: staffUser?.id,
        authorType,
        body: input.body.trim()
      },
      include: { authorUser: { select: { name: true, role: true } } }
    });

    let delivery: "none" | "smtp" | "log" = "none";
    if (staffUser && portalRequest.patient.email) {
      const result = await sendEmail({
        to: portalRequest.patient.email,
        subject: "CLINIK AI portal reply from your clinic",
        text: `${staffUser.name} replied to "${portalRequest.subject}": ${comment.body}`,
        html: patientPortalEmailHtml(
          "New portal reply from your clinic",
          `${portalRequest.patient.firstName}, ${staffUser.name} replied to "${portalRequest.subject}": ${comment.body}`
        ),
        requestId
      });
      delivery = result.delivery;
    }

    await prisma.auditLog.create({
      data: {
        clinicId: portalRequest.clinicId,
        actorId: staffUser?.id ?? null,
        patientId: portalRequest.patientId,
        action: "PATIENT_PORTAL_REQUEST_COMMENT_CREATED",
        entityType: "PatientPortalRequestComment",
        entityId: comment.id,
        metadata: {
          requestId,
          portalRequestId: portalRequest.id,
          authorType,
          delivery
        }
      }
    });

    return NextResponse.json({
      comment: {
        id: comment.id,
        authorType: comment.authorType,
        authorName: comment.authorUser?.name ?? (comment.authorType === "PATIENT" ? "Patient" : "Clinic team"),
        body: comment.body,
        createdAt: comment.createdAt
      }
    }, { status: 201 });
  } catch (error) {
    return apiError(error, request);
  }
}
