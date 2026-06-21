import { randomBytes } from "crypto";
import bcrypt from "bcryptjs";
import { AccountTokenType, Role } from "@prisma/client";
import { NextResponse } from "next/server";
import { auditLog } from "@/lib/audit";
import { prisma } from "@/lib/db";
import { accountEmailHtml, sendEmail } from "@/lib/email";
import { apiError, parseJson } from "@/lib/http";
import { requestIdFrom } from "@/lib/observability";
import { createAccountToken } from "@/lib/security/account-tokens";
import { requireUser } from "@/lib/security/rbac";
import { staffInviteSchema } from "@/lib/validation";

export async function POST(request: Request) {
  const auth = await requireUser([Role.CLINIC_ADMIN]);
  if (auth.response) return auth.response;

  const requestId = requestIdFrom(request);

  try {
    const input = await parseJson(request, staffInviteSchema);
    const email = input.email.toLowerCase();
    const existing = await prisma.user.findUnique({ where: { email } });
    if (existing && existing.clinicId !== auth.user.clinicId) {
      return NextResponse.json({ error: "That email is already assigned to another clinic" }, { status: 409 });
    }

    const user = existing ?? (await prisma.user.create({
      data: {
        clinicId: auth.user.clinicId,
        email,
        name: input.name,
        role: input.role,
        title: input.title,
        isActive: false,
        passwordHash: await bcrypt.hash(randomBytes(32).toString("hex"), 12)
      }
    }));

    const updated = existing ? await prisma.user.update({
      where: { id: existing.id },
      data: {
        name: input.name,
        role: input.role,
        title: input.title,
        isActive: existing.isActive
      }
    }) : user;

    const { token, expiresAt } = await createAccountToken({
      clinicId: auth.user.clinicId,
      userId: updated.id,
      type: AccountTokenType.STAFF_INVITE,
      expiresInMinutes: 60 * 24
    });
    const inviteUrl = accountUrl(request, "/accept-invite", token);

    await sendEmail({
      to: updated.email,
      subject: "You're invited to CLINIK AI",
      text: `Set up your CLINIK AI account: ${inviteUrl}`,
      html: accountEmailHtml(
        "You're invited to CLINIK AI",
        `${auth.user.name} invited you to join CLINIK AI as ${updated.role.replace("_", " ")}. This link expires at ${expiresAt.toLocaleString()}.`,
        "Set up account",
        inviteUrl
      ),
      requestId
    });

    await auditLog({
      user: auth.user,
      action: existing ? "STAFF_INVITE_RESENT" : "STAFF_INVITED",
      entityType: "User",
      entityId: updated.id,
      metadata: {
        invitedEmail: updated.email,
        role: updated.role,
        requestId
      }
    });

    return NextResponse.json({
      user: {
        id: updated.id,
        email: updated.email,
        name: updated.name,
        role: updated.role,
        isActive: updated.isActive
      }
    });
  } catch (error) {
    return apiError(error, request);
  }
}

function accountUrl(request: Request, path: string, token: string) {
  const url = new URL(path, request.url);
  url.searchParams.set("token", token);
  return url.toString();
}
