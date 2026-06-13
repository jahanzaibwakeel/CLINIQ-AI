import { AccountTokenType } from "@prisma/client";
import { NextResponse } from "next/server";
import { accountEmailHtml, sendEmail } from "@/lib/email";
import { parseJson } from "@/lib/http";
import { logError, requestIdFrom } from "@/lib/observability";
import { prisma } from "@/lib/db";
import { createAccountToken } from "@/lib/security/account-tokens";
import { passwordResetRequestSchema } from "@/lib/validation";

export async function POST(request: Request) {
  const requestId = requestIdFrom(request);

  try {
    const input = await parseJson(request, passwordResetRequestSchema);
    const email = input.email.toLowerCase();
    const user = await prisma.user.findUnique({ where: { email } });

    if (user?.isActive) {
      const { token, expiresAt } = await createAccountToken({
        clinicId: user.clinicId,
        userId: user.id,
        type: AccountTokenType.PASSWORD_RESET,
        expiresInMinutes: 30
      });
      const resetUrl = accountUrl(request, "/reset-password", token);

      await sendEmail({
        to: user.email,
        subject: "Reset your MediPilot AI password",
        text: `Reset your MediPilot AI password: ${resetUrl}`,
        html: accountEmailHtml(
          "Reset your MediPilot AI password",
          `A password reset was requested for your clinic account. This link expires at ${expiresAt.toLocaleString()}.`,
          "Reset password",
          resetUrl
        ),
        requestId
      });

      await prisma.auditLog.create({
        data: {
          clinicId: user.clinicId,
          actorId: user.id,
          action: "PASSWORD_RESET_REQUESTED",
          entityType: "User",
          entityId: user.id,
          metadata: { requestId, delivery: "email" }
        }
      });
    }

    return NextResponse.json({
      ok: true,
      message: "If that account exists, password reset instructions have been sent."
    });
  } catch (error) {
    logError("password_reset.request_failed", error, { requestId });
    return NextResponse.json({
      ok: true,
      message: "If that account exists, password reset instructions have been sent."
    });
  }
}

function accountUrl(request: Request, path: string, token: string) {
  const url = new URL(path, request.url);
  url.searchParams.set("token", token);
  return url.toString();
}
