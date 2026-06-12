import { prisma } from "@/lib/db";
import type { SessionUser } from "@/lib/security/session";
import type { Prisma } from "@prisma/client";

export async function auditLog(input: {
  user: SessionUser;
  action: string;
  entityType: string;
  entityId: string;
  patientId?: string;
  consultationId?: string;
  metadata?: Record<string, unknown>;
}) {
  await prisma.auditLog.create({
    data: {
      clinicId: input.user.clinicId,
      actorId: input.user.id,
      action: input.action,
      entityType: input.entityType,
      entityId: input.entityId,
      patientId: input.patientId,
      consultationId: input.consultationId,
      metadata: input.metadata as Prisma.InputJsonValue | undefined
    }
  });
}
