import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { apiError, parseJson } from "@/lib/http";
import { rateLimit } from "@/lib/rate-limit";
import { patientPortalLookupSchema } from "@/lib/validation";

function dayRange(date: string) {
  const start = new Date(`${date}T00:00:00.000Z`);
  const end = new Date(start.getTime() + 24 * 60 * 60 * 1000);
  return { start, end };
}

function clientKey(request: Request) {
  return request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";
}

export async function POST(request: Request) {
  const limited = await rateLimit(`portal-lookup:${clientKey(request)}`, 12, 60);
  if (limited) return limited;

  try {
    const input = await parseJson(request, patientPortalLookupSchema);
    const { start, end } = dayRange(input.dateOfBirth);
    const patient = await prisma.patient.findFirst({
      where: {
        mrn: input.mrn.trim(),
        dateOfBirth: { gte: start, lt: end }
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

    if (!patient) {
      return NextResponse.json({ error: "No portal record matched those details." }, { status: 404 });
    }

    return NextResponse.json({
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
    });
  } catch (error) {
    return apiError(error, request);
  }
}

function summaryFromOutput(output: unknown) {
  if (!output || typeof output !== "object") return "Reviewed visit summary available.";
  const record = output as { summary?: unknown; patientInstructions?: unknown; instructions?: unknown };
  if (typeof record.summary === "string") return record.summary;
  if (typeof record.patientInstructions === "string") return record.patientInstructions;
  if (typeof record.instructions === "string") return record.instructions;
  return "Reviewed visit summary available.";
}
