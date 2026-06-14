import { Role, type AiGenerationType } from "@prisma/client";
import { NextResponse } from "next/server";
import { getSession, type SessionUser } from "@/lib/security/session";

const assistantAiTypes = new Set<AiGenerationType>(["TASK_EXTRACTION", "FOLLOW_UP_INSTRUCTIONS"]);

export function hasRole(user: SessionUser, allowed: Role[]) {
  return allowed.includes(user.role);
}

export function canGenerateAiForRole(role: Role, type: AiGenerationType) {
  if (role === Role.ASSISTANT) return assistantAiTypes.has(type);
  return role === Role.DOCTOR || role === Role.CLINIC_ADMIN;
}

export function assistantAiScopeDescription() {
  return "Assistants can generate operational task and follow-up drafts only. Clinical summaries, risk explanations, referrals, semantic answers, and AI review remain doctor/admin responsibilities.";
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
