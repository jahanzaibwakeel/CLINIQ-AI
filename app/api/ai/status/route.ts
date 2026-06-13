import { NextResponse } from "next/server";
import { getAiRuntimeStatus } from "@/lib/ai/status";
import { apiError } from "@/lib/http";
import { requireUser } from "@/lib/security/rbac";

export const dynamic = "force-dynamic";

export async function GET() {
  const auth = await requireUser();
  if (auth.response) return auth.response;

  try {
    return NextResponse.json(await getAiRuntimeStatus());
  } catch (error) {
    return apiError(error);
  }
}
