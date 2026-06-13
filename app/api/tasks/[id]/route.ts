import { NextResponse } from "next/server";
import { auditLog } from "@/lib/audit";
import { prisma } from "@/lib/db";
import { apiError, parseJson } from "@/lib/http";
import { requireUser } from "@/lib/security/rbac";
import { taskUpdateSchema } from "@/lib/validation";

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireUser();
  if (auth.response) return auth.response;

  try {
    const routeParams = await params;
    const input = await parseJson(request, taskUpdateSchema);
    const task = await prisma.task.findFirst({
      where: { id: routeParams.id, clinicId: auth.user.clinicId }
    });

    if (!task) {
      return NextResponse.json({ error: "Task not found" }, { status: 404 });
    }

    const updated = await prisma.task.update({
      where: { id: task.id },
      data: {
        status: input.status,
        assigneeId: input.assigneeId === null ? null : input.assigneeId,
        dueAt: input.dueAt === null ? null : input.dueAt ? new Date(input.dueAt) : undefined
      },
      include: {
        patient: { select: { firstName: true, lastName: true, mrn: true } },
        assignee: { select: { name: true } }
      }
    });

    await auditLog({
      user: auth.user,
      action: "TASK_UPDATED",
      entityType: "Task",
      entityId: task.id,
      patientId: task.patientId ?? undefined,
      consultationId: task.consultationId ?? undefined,
      metadata: {
        previousStatus: task.status,
        nextStatus: updated.status
      }
    });

    return NextResponse.json({ task: updated });
  } catch (error) {
    return apiError(error);
  }
}
