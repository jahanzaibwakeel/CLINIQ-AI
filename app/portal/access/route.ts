import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { findValidPatientPortalToken } from "@/lib/security/patient-portal-tokens";
import { setPatientPortalSessionCookie } from "@/lib/security/patient-portal-session";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const token = url.searchParams.get("token");
  const redirectUrl = new URL("/portal", request.url);

  if (!token) {
    redirectUrl.searchParams.set("error", "missing-link");
    return NextResponse.redirect(redirectUrl);
  }

  const portalToken = await findValidPatientPortalToken(token);
  if (!portalToken) {
    redirectUrl.searchParams.set("error", "expired-link");
    return NextResponse.redirect(redirectUrl);
  }

  await prisma.$transaction([
    prisma.patientPortalToken.update({
      where: { id: portalToken.id },
      data: { usedAt: new Date() }
    }),
    prisma.auditLog.create({
      data: {
        clinicId: portalToken.clinicId,
        actorId: null,
        patientId: portalToken.patientId,
        action: "PATIENT_PORTAL_LINK_USED",
        entityType: "PatientPortalToken",
        entityId: portalToken.id,
        metadata: { mrn: portalToken.patient.mrn }
      }
    })
  ]);

  await setPatientPortalSessionCookie({
    patientId: portalToken.patientId,
    clinicId: portalToken.clinicId,
    mrn: portalToken.patient.mrn,
    name: `${portalToken.patient.firstName} ${portalToken.patient.lastName}`
  });

  redirectUrl.searchParams.set("linked", "true");
  return NextResponse.redirect(redirectUrl);
}
