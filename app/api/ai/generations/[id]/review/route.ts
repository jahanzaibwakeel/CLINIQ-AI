import { Role } from "@prisma/client";
import { NextResponse } from "next/server";
import { z } from "zod";
import { auditLog } from "@/lib/audit";
import { prisma } from "@/lib/db";
import { apiError, parseJson } from "@/lib/http";
import { requireUser } from "@/lib/security/rbac";

const reviewSchema = z.object({
  reviewStatus: z.enum(["REVIEWED", "REJECTED"]),
  reviewerNote: z.string().max(1000).optional()
});

export async function PATCH(request: Request, { params }: { params: { id: string } }) {
  const auth = await requireUser([Role.DOCTOR, Role.CLINIC_ADMIN]);
  if (auth.response) return auth.response;

  try {
    const input = await parseJson(request, reviewSchema);
    const generation = await prisma.aiGeneration.findFirst({
      where: {
        id: params.id,
        clinicId: auth.user.clinicId
      }
    });

    if (!generation) {
      return NextResponse.json({ error: "AI generation not found" }, { status: 404 });
    }

    const reviewed = await prisma.aiGeneration.update({
      where: { id: generation.id },
      data: {
        reviewStatus: input.reviewStatus,
        reviewerId: auth.user.id,
        reviewedAt: new Date(),
        sourceContext: {
          ...(generation.sourceContext as Record<string, unknown>),
          reviewerNote: input.reviewerNote
        }
      }
    });

    await auditLog({
      user: auth.user,
      action: input.reviewStatus === "REVIEWED" ? "AI_GENERATION_REVIEWED" : "AI_GENERATION_REJECTED",
      entityType: "AiGeneration",
      entityId: generation.id,
      patientId: generation.patientId ?? undefined,
      consultationId: generation.consultationId ?? undefined,
      metadata: {
        type: generation.type,
        reviewerNote: input.reviewerNote
      }
    });

    return NextResponse.json({ generation: reviewed });
  } catch (error) {
    return apiError(error);
  }
}
