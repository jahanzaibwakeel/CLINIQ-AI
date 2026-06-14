import { NextResponse } from "next/server";
import { apiError, parseJson } from "@/lib/http";
import { findPatientForPortalLookup, getPatientPortalPayload } from "@/lib/patient-portal";
import { rateLimit } from "@/lib/rate-limit";
import { patientPortalLookupSchema } from "@/lib/validation";

function clientKey(request: Request) {
  return request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";
}

export async function POST(request: Request) {
  const limited = await rateLimit(`portal-lookup:${clientKey(request)}`, 12, 60);
  if (limited) return limited;

  try {
    const input = await parseJson(request, patientPortalLookupSchema);
    const patient = await findPatientForPortalLookup(input);

    if (!patient) {
      return NextResponse.json({ error: "No portal record matched those details." }, { status: 404 });
    }

    const payload = await getPatientPortalPayload(patient.id, patient.clinicId);
    return NextResponse.json(payload);
  } catch (error) {
    return apiError(error, request);
  }
}
