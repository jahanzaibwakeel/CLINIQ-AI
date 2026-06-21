import { NextResponse } from "next/server";
import { patientPortalEmailHtml, sendEmail } from "@/lib/email";
import { apiError, parseJson } from "@/lib/http";
import { requestIdFrom } from "@/lib/observability";
import { findPatientForPortalLookup } from "@/lib/patient-portal";
import { rateLimit } from "@/lib/rate-limit";
import { prisma } from "@/lib/db";
import { createPatientPortalToken } from "@/lib/security/patient-portal-tokens";
import { patientPortalMagicLinkRequestSchema } from "@/lib/validation";

function clientKey(request: Request) {
  return request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";
}

export async function POST(request: Request) {
  const requestId = requestIdFrom(request);
  const limited = await rateLimit(`portal-link:${clientKey(request)}`, 5, 60);
  if (limited) return limited;

  try {
    const input = await parseJson(request, patientPortalMagicLinkRequestSchema);
    const patient = await findPatientForPortalLookup(input);

    if (patient?.email) {
      const { token, expiresAt } = await createPatientPortalToken({
        clinicId: patient.clinicId,
        patientId: patient.id,
        expiresInMinutes: 20
      });
      const accessUrl = portalUrl(request, token);

      await sendEmail({
        to: patient.email,
        subject: "Your CLINIK AI patient portal link",
        text: `Open your CLINIK AI patient portal: ${accessUrl}`,
        html: patientPortalEmailHtml(
          "Your CLINIK AI patient portal link",
          `Use this time-limited link to view clinic updates from ${patient.clinic.name}. It expires at ${expiresAt.toLocaleString()}.`,
          "Open patient portal",
          accessUrl
        ),
        requestId
      });

      await prisma.auditLog.create({
        data: {
          clinicId: patient.clinicId,
          actorId: null,
          patientId: patient.id,
          action: "PATIENT_PORTAL_LINK_REQUESTED",
          entityType: "Patient",
          entityId: patient.id,
          metadata: { requestId, delivery: "email" }
        }
      });
    }

    return NextResponse.json({
      ok: true,
      message: "If the details match a portal-enabled patient, a sign-in link has been sent."
    });
  } catch (error) {
    return apiError(error, request);
  }
}

function portalUrl(request: Request, token: string) {
  const url = new URL("/portal/access", request.url);
  url.searchParams.set("token", token);
  return url.toString();
}
