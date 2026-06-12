import { NextResponse } from "next/server";
import { auditLog } from "@/lib/audit";
import { prisma } from "@/lib/db";
import { apiError, parseJson } from "@/lib/http";
import { requireUser } from "@/lib/security/rbac";
import { followUpCreateSchema } from "@/lib/validation";

export async function GET() {
  const auth = await requireUser();
  if (auth.response) return auth.response;

  const followUps = await prisma.followUp.findMany({
    where: { clinicId: auth.user.clinicId },
    include: {
      patient: { select: { firstName: true, lastName: true, mrn: true } },
      owner: { select: { name: true } },
      consultation: { select: { reason: true } }
    },
    orderBy: [{ status: "asc" }, { scheduledFor: "asc" }],
    take: 100
  });

  return NextResponse.json({ followUps });
}

export async function POST(request: Request) {
  const auth = await requireUser();
  if (auth.response) return auth.response;

  try {
    const input = await parseJson(request, followUpCreateSchema);
    const patient = await prisma.patient.findFirst({
      where: { id: input.patientId, clinicId: auth.user.clinicId }
    });

    if (!patient) {
      return NextResponse.json({ error: "Patient not found" }, { status: 404 });
    }

    const followUp = await prisma.followUp.create({
      data: {
        clinicId: auth.user.clinicId,
        patientId: input.patientId,
        consultationId: input.consultationId,
        ownerId: auth.user.id,
        title: input.title,
        instructions: input.instructions,
        scheduledFor: new Date(input.scheduledFor)
      }
    });

    await auditLog({
      user: auth.user,
      action: "FOLLOW_UP_CREATED",
      entityType: "FollowUp",
      entityId: followUp.id,
      patientId: input.patientId,
      consultationId: input.consultationId,
      metadata: { scheduledFor: input.scheduledFor }
    });

    return NextResponse.json({ followUp }, { status: 201 });
  } catch (error) {
    return apiError(error);
  }
}
