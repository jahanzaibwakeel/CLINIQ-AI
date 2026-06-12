import bcrypt from "bcryptjs";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { apiError, parseJson } from "@/lib/http";
import { loginSchema } from "@/lib/validation";
import { setSessionCookie } from "@/lib/security/session";
import { rateLimit } from "@/lib/rate-limit";

function clientKey(request: Request) {
  return (
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    request.headers.get("x-real-ip") ||
    "local"
  );
}

export async function POST(request: Request) {
  try {
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

    const valid = await bcrypt.compare(input.password, user.passwordHash);
    if (!valid) {
      await prisma.auditLog.create({
        data: {
          clinicId: user.clinicId,
          actorId: user.id,
          action: "LOGIN_FAILED",
          entityType: "User",
          entityId: user.id,
          metadata: { ip }
        }
      });
      return NextResponse.json({ error: "Invalid email or password" }, { status: 401 });
    }

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
        metadata: { ip }
      }
    });

    return NextResponse.json({
      user: { id: user.id, email: user.email, name: user.name, role: user.role }
    });
  } catch (error) {
    return apiError(error);
  }
}
