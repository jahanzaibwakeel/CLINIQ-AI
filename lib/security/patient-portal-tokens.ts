import { createHash, randomBytes } from "crypto";
import { prisma } from "@/lib/db";

export function hashPatientPortalToken(token: string) {
  return createHash("sha256").update(token).digest("hex");
}

export async function createPatientPortalToken(input: {
  clinicId: string;
  patientId: string;
  expiresInMinutes: number;
}) {
  const token = randomBytes(32).toString("base64url");
  const expiresAt = new Date(Date.now() + input.expiresInMinutes * 60 * 1000);

  await prisma.patientPortalToken.create({
    data: {
      clinicId: input.clinicId,
      patientId: input.patientId,
      tokenHash: hashPatientPortalToken(token),
      expiresAt
    }
  });

  return { token, expiresAt };
}

export async function findValidPatientPortalToken(token: string) {
  return prisma.patientPortalToken.findFirst({
    where: {
      tokenHash: hashPatientPortalToken(token),
      usedAt: null,
      expiresAt: { gt: new Date() }
    },
    include: {
      patient: {
        select: { id: true, clinicId: true, firstName: true, lastName: true, mrn: true }
      }
    }
  });
}
