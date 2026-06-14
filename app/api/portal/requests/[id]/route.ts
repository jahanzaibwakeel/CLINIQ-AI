import { NextResponse } from "next/server";
import { Role } from "@prisma/client";
import { auditLog } from "@/lib/audit";
import { prisma } from "@/lib/db";
import { patientPortalEmailHtml, sendEmail } from "@/lib/email";
import { apiError, parseJson } from "@/lib/http";
import { requestIdFrom } from "@/lib/observability";
import { requireUser } from "@/lib/security/rbac";
import { patientPortalRequestUpdateSchema } from "@/lib/validation";

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireUser([Role.DOCTOR, Role.CLINIC_ADMIN, Role.ASSISTANT]);
  if (auth.response) return auth.response;
  const requestId = requestIdFrom(request);

  try {
    const routeParams = await params;
    const input = await parseJson(request, patientPortalRequestUpdateSchema);
    const existing = await prisma.patientPortalRequest.findFirst({
      where: { id: routeParams.id, clinicId: auth.user.clinicId }
    });

    if (!existing) {
      return NextResponse.json({ error: "Portal request not found" }, { status: 404 });
    }

    const updated = await prisma.patientPortalRequest.update({
      where: { id: existing.id },
      data: { status: input.status },
      include: { patient: { select: { firstName: true, lastName: true, mrn: true, email: true } } }
    });

    let delivery: "none" | "smtp" | "log" = "none";
    if (updated.patient.email && updated.status !== existing.status) {
      const result = await sendEmail({
        to: updated.patient.email,
        subject: `MediPilot portal request ${statusLabel(updated.status)}`,
        text: `Your request "${updated.subject}" is now ${statusLabel(updated.status)}.`,
        html: patientPortalEmailHtml(
          "Portal request status update",
          `${updated.patient.firstName}, your request "${updated.subject}" is now ${statusLabel(updated.status)}.`
        ),
        requestId
      });
      delivery = result.delivery;
    }

    await auditLog({
      user: auth.user,
      action: "PATIENT_PORTAL_REQUEST_UPDATED",
      entityType: "PatientPortalRequest",
      entityId: updated.id,
      patientId: updated.patientId,
      metadata: { previousStatus: existing.status, nextStatus: updated.status, requestId, delivery }
    });

    return NextResponse.json({ request: updated });
  } catch (error) {
    return apiError(error, request);
  }
}

function statusLabel(status: string) {
  return status.replaceAll("_", " ").toLowerCase();
}
