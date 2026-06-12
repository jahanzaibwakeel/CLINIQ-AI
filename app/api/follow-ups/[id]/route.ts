import { NextResponse } from "next/server";
import { auditLog } from "@/lib/audit";
import { prisma } from "@/lib/db";
import { apiError, parseJson } from "@/lib/http";
import { requireUser } from "@/lib/security/rbac";
import { followUpUpdateSchema } from "@/lib/validation";

export async function PATCH(request: Request, { params }: { params: { id: string } }) {
  const auth = await requireUser();
  if (auth.response) return auth.response;

  try {
    const input = await parseJson(request, followUpUpdateSchema);
    const followUp = await prisma.followUp.findFirst({
      where: { id: params.id, clinicId: auth.user.clinicId }
    });

    if (!followUp) {
      return NextResponse.json({ error: "Follow-up not found" }, { status: 404 });
    }

    const updated = await prisma.followUp.update({
      where: { id: followUp.id },
      data: { status: input.status },
      include: {
        patient: { select: { firstName: true, lastName: true, mrn: true } }
      }
    });

    await auditLog({
      user: auth.user,
      action: "FOLLOW_UP_UPDATED",
      entityType: "FollowUp",
      entityId: followUp.id,
      patientId: followUp.patientId,
      consultationId: followUp.consultationId ?? undefined,
      metadata: {
        previousStatus: followUp.status,
        nextStatus: updated.status
      }
    });

    return NextResponse.json({ followUp: updated });
  } catch (error) {
    return apiError(error);
  }
}
