import { NextResponse } from "next/server";
import { auditLog } from "@/lib/audit";
import { prisma } from "@/lib/db";
import { apiError, parseJson } from "@/lib/http";
import { requireUser } from "@/lib/security/rbac";
import { appointmentUpdateSchema } from "@/lib/validation";

export async function PATCH(request: Request, { params }: { params: { id: string } }) {
  const auth = await requireUser();
  if (auth.response) return auth.response;

  try {
    const input = await parseJson(request, appointmentUpdateSchema);
    const appointment = await prisma.appointment.findFirst({
      where: { id: params.id, clinicId: auth.user.clinicId }
    });

    if (!appointment) {
      return NextResponse.json({ error: "Appointment not found" }, { status: 404 });
    }

    const updated = await prisma.appointment.update({
      where: { id: appointment.id },
      data: { status: input.status },
      include: {
        patient: { select: { firstName: true, lastName: true, mrn: true } },
        clinician: { select: { name: true } }
      }
    });

    await auditLog({
      user: auth.user,
      action: "APPOINTMENT_UPDATED",
      entityType: "Appointment",
      entityId: appointment.id,
      patientId: appointment.patientId,
      metadata: {
        previousStatus: appointment.status,
        nextStatus: updated.status
      }
    });

    return NextResponse.json({ appointment: updated });
  } catch (error) {
    return apiError(error);
  }
}
