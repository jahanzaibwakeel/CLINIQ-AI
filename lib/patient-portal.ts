import { prisma } from "@/lib/db";

export function patientPortalDayRange(date: string) {
  const start = new Date(`${date}T00:00:00.000Z`);
  const end = new Date(start.getTime() + 24 * 60 * 60 * 1000);
  return { start, end };
}

export async function findPatientForPortalLookup(input: { mrn: string; dateOfBirth: string; email?: string }) {
  const { start, end } = patientPortalDayRange(input.dateOfBirth);
  return prisma.patient.findFirst({
    where: {
      mrn: input.mrn.trim(),
      dateOfBirth: { gte: start, lt: end },
      ...(input.email ? { email: { equals: input.email.trim().toLowerCase(), mode: "insensitive" as const } } : {})
    },
    select: {
      id: true,
      clinicId: true,
      firstName: true,
      lastName: true,
      mrn: true,
      email: true,
      clinic: { select: { name: true } }
    }
  });
}

export async function getPatientPortalPayload(patientId: string, clinicId?: string) {
  const patient = await prisma.patient.findFirst({
    where: {
      id: patientId,
      ...(clinicId ? { clinicId } : {})
    },
    include: {
      clinic: { select: { name: true } },
      appointments: {
        where: { status: "SCHEDULED", startsAt: { gte: new Date() } },
        orderBy: { startsAt: "asc" },
        take: 5,
        select: { title: true, reason: true, startsAt: true, endsAt: true, location: true, status: true }
      },
      followUps: {
        where: { status: { in: ["SCHEDULED", "MISSED"] } },
        orderBy: { scheduledFor: "asc" },
        take: 5,
        select: { title: true, instructions: true, scheduledFor: true, status: true }
      },
      documents: {
        orderBy: { createdAt: "desc" },
        take: 5,
        select: { fileName: true, status: true, createdAt: true }
      },
      aiGenerations: {
        where: { type: "VISIT_SUMMARY", reviewStatus: "REVIEWED" },
        orderBy: { createdAt: "desc" },
        take: 3,
        select: { output: true, reviewedAt: true, createdAt: true }
      }
    }
  });

  if (!patient) return null;

  return {
    patient: {
      id: patient.id,
      firstName: patient.firstName,
      lastName: patient.lastName,
      mrn: patient.mrn,
      clinicName: patient.clinic.name
    },
    appointments: patient.appointments,
    followUps: patient.followUps,
    documents: patient.documents,
    visitSummaries: patient.aiGenerations.map((generation) => ({
      summary: summaryFromOutput(generation.output),
      reviewedAt: generation.reviewedAt ?? generation.createdAt
    }))
  };
}

function summaryFromOutput(output: unknown) {
  if (!output || typeof output !== "object") return "Reviewed visit summary available.";
  const record = output as { summary?: unknown; patientInstructions?: unknown; instructions?: unknown };
  if (typeof record.summary === "string") return record.summary;
  if (typeof record.patientInstructions === "string") return record.patientInstructions;
  if (typeof record.instructions === "string") return record.instructions;
  return "Reviewed visit summary available.";
}
