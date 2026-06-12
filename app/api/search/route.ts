import { NextResponse } from "next/server";
import { z } from "zod";
import { apiError, parseJson } from "@/lib/http";
import { requireUser } from "@/lib/security/rbac";
import { semanticSearch } from "@/lib/ai/semantic-search";

const searchSchema = z.object({
  query: z.string().min(2),
  patientId: z.string().optional()
});

export async function POST(request: Request) {
  const auth = await requireUser();
  if (auth.response) return auth.response;

  try {
    const input = await parseJson(request, searchSchema);
    const results = await semanticSearch({
      clinicId: auth.user.clinicId,
      patientId: input.patientId,
      query: input.query
    });
    return NextResponse.json({ results });
  } catch (error) {
    return apiError(error);
  }
}
