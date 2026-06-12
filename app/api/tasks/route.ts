import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { apiError, parseJson } from "@/lib/http";
import { requireUser } from "@/lib/security/rbac";
import { taskCreateSchema } from "@/lib/validation";
import { auditLog } from "@/lib/audit";

export async function GET() {
  const auth = await requireUser();
  if (auth.response) return auth.response;
  const tasks = await prisma.task.findMany({
    where: { clinicId: auth.user.clinicId },
    include: {
      patient: { select: { firstName: true, lastName: true, mrn: true } },
      assignee: { select: { name: true } }
    },
    orderBy: [{ status: "asc" }, { dueAt: "asc" }],
    take: 80
  });
  return NextResponse.json({ tasks });
}

export async function POST(request: Request) {
  const auth = await requireUser();
  if (auth.response) return auth.response;

  try {
    const input = await parseJson(request, taskCreateSchema);
    const task = await prisma.task.create({
      data: {
        clinicId: auth.user.clinicId,
        patientId: input.patientId,
        consultationId: input.consultationId,
        assigneeId: input.assigneeId,
        createdById: auth.user.id,
        title: input.title,
        description: input.description,
        dueAt: input.dueAt ? new Date(input.dueAt) : undefined
      }
    });

    await auditLog({
      user: auth.user,
      action: "TASK_CREATED",
      entityType: "Task",
      entityId: task.id,
      patientId: input.patientId,
      consultationId: input.consultationId
    });

    return NextResponse.json({ task }, { status: 201 });
  } catch (error) {
    return apiError(error);
  }
}
