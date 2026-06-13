import bcrypt from "bcryptjs";
import { AccountTokenType } from "@prisma/client";
import { NextResponse } from "next/server";
import { apiError, parseJson } from "@/lib/http";
import { requestIdFrom } from "@/lib/observability";
import { prisma } from "@/lib/db";
import { findValidAccountToken } from "@/lib/security/account-tokens";
import { passwordResetSchema } from "@/lib/validation";

export async function POST(request: Request) {
  const requestId = requestIdFrom(request);

  try {
    const input = await parseJson(request, passwordResetSchema);
    const accountToken = await findValidAccountToken(input.token, AccountTokenType.PASSWORD_RESET);
    if (!accountToken || !accountToken.user.isActive) {
      return NextResponse.json({ error: "Reset link is invalid or expired" }, { status: 400 });
    }

    const passwordHash = await bcrypt.hash(input.password, 12);
    await prisma.$transaction([
      prisma.user.update({
        where: { id: accountToken.userId },
        data: {
          passwordHash,
          failedLoginCount: 0,
          lockedUntil: null
        }
      }),
      prisma.accountToken.update({
        where: { id: accountToken.id },
        data: { usedAt: new Date() }
      }),
      prisma.auditLog.create({
        data: {
          clinicId: accountToken.clinicId,
          actorId: accountToken.userId,
          action: "PASSWORD_RESET_COMPLETED",
          entityType: "User",
          entityId: accountToken.userId,
          metadata: { requestId }
        }
      })
    ]);

    return NextResponse.json({ ok: true });
  } catch (error) {
    return apiError(error, request);
  }
}
