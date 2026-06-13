import { NextResponse } from "next/server";
import { Role } from "@prisma/client";
import { auditLog } from "@/lib/audit";
import { prisma } from "@/lib/db";
import { apiError, parseJson } from "@/lib/http";
import { requireUser } from "@/lib/security/rbac";
import { staffUpdateSchema } from "@/lib/validation";

export async function PATCH(request: Request, { params }: { params: { id: string } }) {
  const auth = await requireUser([Role.CLINIC_ADMIN]);
  if (auth.response) return auth.response;

  try {
    const input = await parseJson(request, staffUpdateSchema);
    const member = await prisma.user.findFirst({
      where: { id: params.id, clinicId: auth.user.clinicId }
    });

    if (!member) return NextResponse.json({ error: "Staff member not found" }, { status: 404 });

    const nextRole = input.role ?? member.role;
    const nextActive = input.isActive ?? member.isActive;
    const activeAdminCount = await prisma.user.count({
      where: { clinicId: auth.user.clinicId, role: Role.CLINIC_ADMIN, isActive: true }
    });
    const wouldRemoveAdmin =
      member.role === Role.CLINIC_ADMIN &&
      member.isActive &&
      (nextRole !== Role.CLINIC_ADMIN || nextActive === false);

    if (wouldRemoveAdmin && activeAdminCount <= 1) {
      return NextResponse.json({ error: "At least one active clinic admin is required" }, { status: 409 });
    }

    if (member.id === auth.user.id && nextActive === false) {
      return NextResponse.json({ error: "Admins cannot deactivate their own account" }, { status: 409 });
    }

    if (member.id === auth.user.id && input.role && input.role !== member.role) {
      return NextResponse.json({ error: "Admins cannot change their own role" }, { status: 409 });
    }

    const updated = await prisma.user.update({
      where: { id: member.id },
      data: {
        role: input.role,
        isActive: input.isActive,
        failedLoginCount: input.resetLockout ? 0 : undefined,
        lockedUntil: input.resetLockout ? null : undefined
      },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        isActive: true,
        failedLoginCount: true,
        lockedUntil: true
      }
    });

    await auditLog({
      user: auth.user,
      action: "STAFF_UPDATED",
      entityType: "User",
      entityId: member.id,
      metadata: {
        previousRole: member.role,
        nextRole: updated.role,
        previousActive: member.isActive,
        nextActive: updated.isActive,
        resetLockout: Boolean(input.resetLockout)
      }
    });

    return NextResponse.json({ user: updated });
  } catch (error) {
    return apiError(error);
  }
}
