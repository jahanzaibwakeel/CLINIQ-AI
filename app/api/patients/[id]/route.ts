import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireUser } from "@/lib/security/rbac";

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireUser();
  if (auth.response) return auth.response;

  const routeParams = await params;
  const patient = await prisma.patient.findFirst({
    where: { id: routeParams.id, clinicId: auth.user.clinicId },
    include: {
      primaryDoctor: { select: { name: true } },
      consultations: { orderBy: { startedAt: "desc" }, take: 10 },
      notes: { orderBy: { createdAt: "desc" }, take: 10 },
      documents: { orderBy: { createdAt: "desc" }, take: 10 },
      tasks: { orderBy: { createdAt: "desc" }, take: 10 },
      followUps: { orderBy: { scheduledFor: "desc" }, take: 10 },
      aiGenerations: { orderBy: { createdAt: "desc" }, take: 10 }
    }
  });

  if (!patient) return NextResponse.json({ error: "Patient not found" }, { status: 404 });
  return NextResponse.json({ patient });
}
