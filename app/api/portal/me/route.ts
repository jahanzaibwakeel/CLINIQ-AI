import { NextResponse } from "next/server";
import { getPatientPortalPayload } from "@/lib/patient-portal";
import { getPatientPortalSession } from "@/lib/security/patient-portal-session";

export async function GET() {
  const session = await getPatientPortalSession();
  if (!session) return NextResponse.json({ patient: null }, { status: 401 });

  const payload = await getPatientPortalPayload(session.patientId, session.clinicId);
  if (!payload) return NextResponse.json({ patient: null }, { status: 404 });

  return NextResponse.json(payload);
}
