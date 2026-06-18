import { NextResponse } from "next/server";
import { Role } from "@prisma/client";
import { runAiGeneration } from "@/lib/ai/service";
import { prisma } from "@/lib/db";
import { apiError, parseJson } from "@/lib/http";
import { requestIdFrom } from "@/lib/observability";
import { rateLimit } from "@/lib/rate-limit";
import { canGenerateAiForRole, requireUser } from "@/lib/security/rbac";
import { patientPortalReplyDraftSchema } from "@/lib/validation";

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireUser([Role.DOCTOR, Role.CLINIC_ADMIN, Role.ASSISTANT]);
  if (auth.response) return auth.response;

  const limited = await rateLimit(`portal-reply-ai:${auth.user.id}`, 20, 60);
  if (limited) return limited;

  if (!canGenerateAiForRole(auth.user.role, "PORTAL_REPLY_DRAFT")) {
    return NextResponse.json({ error: "Insufficient AI permissions" }, { status: 403 });
  }

  try {
    const routeParams = await params;
    const input = await parseJson(request, patientPortalReplyDraftSchema);
    const portalRequest = await prisma.patientPortalRequest.findFirst({
      where: { id: routeParams.id, clinicId: auth.user.clinicId },
      include: {
        patient: { select: { id: true, firstName: true, lastName: true, email: true } },
        comments: {
          orderBy: { createdAt: "asc" },
          take: 12,
          include: { authorUser: { select: { name: true, role: true } } }
        }
      }
    });

    if (!portalRequest) {
      return NextResponse.json({ error: "Portal request not found" }, { status: 404 });
    }

    const conversation = portalRequest.comments.length
      ? portalRequest.comments.map((comment) => {
          const author = comment.authorUser?.name ?? (comment.authorType === "PATIENT" ? "Patient" : "Clinic team");
          return `${author}: ${comment.body}`;
        }).join("\n")
      : "No prior replies.";

    const sourceText = [
      `Request type: ${portalRequest.type}`,
      `Request subject: ${portalRequest.subject}`,
      `Patient message: ${portalRequest.message}`,
      `Preferred contact: ${portalRequest.preferredContact ?? "not provided"}`,
      `Current status: ${portalRequest.status}`,
      `Conversation so far:\n${conversation}`,
      input.instruction ? `Staff instruction: ${input.instruction}` : ""
    ].filter(Boolean).join("\n\n");

    const result = await runAiGeneration({
      user: auth.user,
      type: "PORTAL_REPLY_DRAFT",
      sourceText,
      patientContext: `Patient first name: ${portalRequest.patient.firstName}. Patient-visible reply must be operational and non-diagnostic.`,
      patientId: portalRequest.patient.id,
      requestId: requestIdFrom(request)
    });

    const draft = typeof result.output.patientReply === "string"
      ? result.output.patientReply
      : result.output.summary ?? "Please review this portal request and respond with clinic-approved next steps.";

    return NextResponse.json({
      draft,
      output: result.output,
      metadata: {
        provider: result.provider,
        model: result.model,
        usedFallback: result.usedFallback,
        reviewStatus: "DRAFT",
        generationId: result.generationId,
        latencyMs: result.latencyMs,
        cacheHit: result.cacheHit
      }
    });
  } catch (error) {
    return apiError(error, request);
  }
}
