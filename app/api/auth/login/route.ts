import bcrypt from "bcryptjs";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { apiError, parseJson } from "@/lib/http";
import { loginSchema } from "@/lib/validation";
import { setSessionCookie } from "@/lib/security/session";
import { rateLimit } from "@/lib/rate-limit";
import { isAccountLocked, lockoutCopy, nextFailedLoginState } from "@/lib/security/login-policy";
import { requestIdFrom } from "@/lib/observability";

function clientKey(request: Request) {
  return (
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    request.headers.get("x-real-ip") ||
    "local"
  );
}

export async function POST(request: Request) {
  try {
    const requestId = requestIdFrom(request);
    const ip = clientKey(request);
    const limited = await rateLimit(`login:ip:${ip}`, 60, 60);
    if (limited) return limited;

    const input = await parseJson(request, loginSchema);
    const email = input.email.toLowerCase();
    const emailLimited = await rateLimit(`login:email:${email}:${ip}`, 10, 300);
    if (emailLimited) return emailLimited;

    const user = await prisma.user.findUnique({ where: { email } });
    if (!user || !user.isActive) {
      return NextResponse.json({ error: "Invalid email or password" }, { status: 401 });
    }

    if (isAccountLocked(user.lockedUntil)) {
      await prisma.auditLog.create({
        data: {
          clinicId: user.clinicId,
          actorId: user.id,
          action: "LOGIN_BLOCKED_LOCKED_ACCOUNT",
          entityType: "User",
          entityId: user.id,
          metadata: { ip, requestId, lockedUntil: user.lockedUntil }
        }
      });
      return NextResponse.json({ error: lockoutCopy(user.lockedUntil) }, { status: 423 });
    }

    const valid = await bcrypt.compare(input.password, user.passwordHash);
    if (!valid) {
      const failedState = nextFailedLoginState(user.failedLoginCount);
      await prisma.user.update({
        where: { id: user.id },
        data: failedState
      });
      await prisma.auditLog.create({
        data: {
          clinicId: user.clinicId,
          actorId: user.id,
          action: "LOGIN_FAILED",
          entityType: "User",
          entityId: user.id,
          metadata: { ip, requestId, failedLoginCount: failedState.failedLoginCount, lockedUntil: failedState.lockedUntil }
        }
      });
      return NextResponse.json({ error: "Invalid email or password" }, { status: 401 });
    }

    await prisma.user.update({
      where: { id: user.id },
      data: {
        failedLoginCount: 0,
        lockedUntil: null,
        lastLoginAt: new Date()
      }
    });

    await setSessionCookie({
      id: user.id,
      clinicId: user.clinicId,
      email: user.email,
      name: user.name,
      role: user.role
    });

    await prisma.auditLog.create({
      data: {
        clinicId: user.clinicId,
        actorId: user.id,
        action: "LOGIN_SUCCESS",
        entityType: "User",
        entityId: user.id,
        metadata: { ip, requestId }
      }
    });

    return NextResponse.json({
      user: { id: user.id, email: user.email, name: user.name, role: user.role }
    });
  } catch (error) {
    return apiError(error);
  }
}
