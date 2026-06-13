import { Role, type AiGeneration, type Prisma } from "@prisma/client";
import { NextResponse } from "next/server";
import { auditLog } from "@/lib/audit";
import { prisma } from "@/lib/db";
import { apiError, parseJson } from "@/lib/http";
import { requireUser } from "@/lib/security/rbac";
import { aiReviewSchema } from "@/lib/validation";

function asRecord(value: unknown): Record<string, unknown> {
  return typeof value === "object" && value !== null ? (value as Record<string, unknown>) : {};
}

function textValue(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

function stringArray(value: unknown) {
  return Array.isArray(value) ? value.filter((item): item is string => typeof item === "string" && item.trim().length > 0) : [];
}

async function applyReviewedOutput(input: {
  generation: AiGeneration;
  output: unknown;
  userId: string;
  clinicId: string;
}) {
  const output = asRecord(input.output);
  const applied: string[] = [];

  if (input.generation.consultationId && input.generation.type === "CONSULTATION_SUMMARY") {
    const summary = textValue(output.summary);
    if (summary) {
      await prisma.consultation.update({
        where: { id: input.generation.consultationId },
        data: { summary }
      });
      applied.push("consultation.summary");
    }
  }

  if (input.generation.consultationId && input.generation.type === "SOAP_NOTE") {
    const soap = output.soap;
    if (typeof soap === "object" && soap !== null) {
      await prisma.consultation.update({
        where: { id: input.generation.consultationId },
        data: { soapNote: soap as Prisma.InputJsonValue }
      });
      applied.push("consultation.soapNote");
    }
  }

  if (input.generation.patientId && input.generation.type === "TASK_EXTRACTION") {
    const tasks = Array.isArray(output.tasks) ? output.tasks : [];
    for (const task of tasks.slice(0, 8)) {
      const taskRecord = asRecord(task);
      const title = textValue(taskRecord.title);
      if (!title) continue;
      await prisma.task.create({
        data: {
          clinicId: input.clinicId,
          patientId: input.generation.patientId,
          consultationId: input.generation.consultationId,
          createdById: input.userId,
          title,
          description: textValue(taskRecord.rationale) || "Created from reviewed AI task extraction.",
          source: "ai_reviewed"
        }
      });
      applied.push("task");
    }
  }

  if (input.generation.patientId && input.generation.type === "FOLLOW_UP_INSTRUCTIONS") {
    const instructions = stringArray(output.patientInstructions);
    if (instructions.length) {
      await prisma.followUp.create({
        data: {
          clinicId: input.clinicId,
          patientId: input.generation.patientId,
          consultationId: input.generation.consultationId,
          ownerId: input.userId,
          title: "Reviewed AI follow-up",
          instructions: instructions.join("\n"),
          scheduledFor: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)
        }
      });
      applied.push("followUp");
    }
  }

  if (input.generation.documentId && input.generation.type === "DOCUMENT_PARSE") {
    const extracted = output.extracted;
    if (typeof extracted === "object" && extracted !== null) {
      await prisma.document.update({
        where: { id: input.generation.documentId },
        data: { parsedJson: extracted as Prisma.InputJsonValue }
      });
      applied.push("document.parsedJson");
    }
  }

  if (
    input.generation.patientId &&
    ["VISIT_SUMMARY", "REFERRAL_LETTER", "HISTORY_TIMELINE", "RISK_FLAG_EXPLAINER"].includes(input.generation.type)
  ) {
    const body =
      textValue(output.summary) ||
      textValue(output.referralLetter) ||
      stringArray(output.patientInstructions).join("\n") ||
      textValue(output.explanation);

    if (body) {
      await prisma.note.create({
        data: {
          clinicId: input.clinicId,
          patientId: input.generation.patientId,
          consultationId: input.generation.consultationId,
          authorId: input.userId,
          title: `Reviewed AI ${input.generation.type.replaceAll("_", " ").toLowerCase()}`,
          body,
          tags: ["ai-reviewed"]
        }
      });
      applied.push("note");
    }
  }

  return applied;
}

export async function PATCH(request: Request, { params }: { params: { id: string } }) {
  const auth = await requireUser([Role.DOCTOR, Role.CLINIC_ADMIN]);
  if (auth.response) return auth.response;

  try {
    const input = await parseJson(request, aiReviewSchema);
    const generation = await prisma.aiGeneration.findFirst({
      where: {
        id: params.id,
        clinicId: auth.user.clinicId
      }
    });

    if (!generation) {
      return NextResponse.json({ error: "AI generation not found" }, { status: 404 });
    }

    const output = input.output ?? generation.output;
    const appliedEntities =
      input.reviewStatus === "REVIEWED" && input.applyToRecord
        ? await applyReviewedOutput({
            generation,
            output,
            userId: auth.user.id,
            clinicId: auth.user.clinicId
          })
        : [];

    const reviewed = await prisma.aiGeneration.update({
      where: { id: generation.id },
      data: {
        reviewStatus: input.reviewStatus,
        reviewerId: auth.user.id,
        reviewedAt: new Date(),
        output: output as Prisma.InputJsonValue,
        sourceContext: {
          ...(generation.sourceContext as Record<string, unknown>),
          reviewerNote: input.reviewerNote,
          appliedEntities
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
        reviewerNote: input.reviewerNote,
        applyToRecord: input.applyToRecord,
        appliedEntities
      }
    });

    return NextResponse.json({ generation: reviewed });
  } catch (error) {
    return apiError(error);
  }
}
