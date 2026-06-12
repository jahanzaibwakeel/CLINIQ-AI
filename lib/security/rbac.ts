import type { Role } from "@prisma/client";
import { NextResponse } from "next/server";
import { getSession, type SessionUser } from "@/lib/security/session";

export function hasRole(user: SessionUser, allowed: Role[]) {
  return allowed.includes(user.role);
}

export async function requireUser(allowed?: Role[]) {
  const user = await getSession();
  if (!user) {
    return {
      user: null,
      response: NextResponse.json({ error: "Authentication required" }, { status: 401 })
    };
  }

  if (allowed && !hasRole(user, allowed)) {
    return {
      user: null,
      response: NextResponse.json({ error: "Insufficient permissions" }, { status: 403 })
    };
  }

  return { user, response: null };
}
