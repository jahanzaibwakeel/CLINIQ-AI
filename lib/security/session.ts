import { cookies } from "next/headers";
import { jwtVerify, SignJWT } from "jose";
import type { Role } from "@prisma/client";
import { env } from "@/lib/env";

const cookieName = "medipilot_session";
const secret = new TextEncoder().encode(env.SESSION_SECRET);

function isLocalHttpUrl(value: string | undefined) {
  if (!value) return false;

  try {
    const url = new URL(value);
    return url.protocol === "http:" && ["localhost", "127.0.0.1", "::1"].includes(url.hostname);
  } catch {
    return false;
  }
}

function shouldUseSecureCookies() {
  if (process.env.NODE_ENV !== "production") return false;
  return !isLocalHttpUrl(process.env.NEXT_PUBLIC_APP_URL);
}

export type SessionUser = {
  id: string;
  clinicId: string;
  email: string;
  name: string;
  role: Role;
};

export async function createSessionToken(user: SessionUser) {
  return new SignJWT(user)
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("8h")
    .sign(secret);
}

export async function setSessionCookie(user: SessionUser) {
  const token = await createSessionToken(user);
  cookies().set(cookieName, token, {
    httpOnly: true,
    secure: shouldUseSecureCookies(),
    sameSite: "lax",
    maxAge: 60 * 60 * 8,
    path: "/"
  });
}

export function clearSessionCookie() {
  cookies().delete(cookieName);
}

export async function getSession(): Promise<SessionUser | null> {
  const token = cookies().get(cookieName)?.value;
  if (!token) return null;

  try {
    const { payload } = await jwtVerify(token, secret);
    return {
      id: String(payload.id),
      clinicId: String(payload.clinicId),
      email: String(payload.email),
      name: String(payload.name),
      role: payload.role as Role
    };
  } catch {
    return null;
  }
}
