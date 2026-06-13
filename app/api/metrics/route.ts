import { Role } from "@prisma/client";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { env } from "@/lib/env";
import { apiError } from "@/lib/http";
import { requestIdFrom, summarizeAiMetrics } from "@/lib/observability";
import { requireUser } from "@/lib/security/rbac";
import type { SessionUser } from "@/lib/security/session";

export const dynamic = "force-dynamic";

async function authorizeMetricsRequest(request: Request) {
  const authorization = request.headers.get("authorization");
  if (env.METRICS_BEARER_TOKEN && authorization === `Bearer ${env.METRICS_BEARER_TOKEN}`) {
    return { response: null, accessMode: "bearer-token" as const, user: null };
  }

  const auth = await requireUser([Role.CLINIC_ADMIN]);
  if (auth.response) return { response: auth.response, accessMode: null, user: null };
  return { response: null, accessMode: "clinic-admin-session" as const, user: auth.user };
}

function metricsWindowHours(request: Request) {
  const url = new URL(request.url);
  const parsed = Number(url.searchParams.get("windowHours") ?? 24);
  if (!Number.isFinite(parsed)) return 24;
  return Math.min(168, Math.max(1, Math.round(parsed)));
}

export async function GET(request: Request) {
  const requestId = requestIdFrom(request);
  const auth = await authorizeMetricsRequest(request);
  if (auth.response) return auth.response;

  try {
    const windowHours = metricsWindowHours(request);
    const now = new Date();
    const since = new Date(now.getTime() - windowHours * 60 * 60 * 1000);
    const scope = clinicScope(auth.user);

    const [
      aiGenerations,
      pendingAiReview,
      rejectedAiDrafts,
      processedDocuments,
      failedDocuments,
      openTasks,
      overdueTasks,
      missedFollowUps,
      activeUsers,
      lockedUsers,
      recentAuditEvents
    ] = await Promise.all([
      prisma.aiGeneration.findMany({
        where: { ...scope, createdAt: { gte: since } },
        select: { provider: true, latencyMs: true, cacheHit: true, tokenEstimate: true, reviewStatus: true, createdAt: true },
        take: 500,
        orderBy: { createdAt: "desc" }
      }),
      prisma.aiGeneration.count({ where: { ...scope, reviewStatus: "DRAFT" } }),
      prisma.aiGeneration.count({ where: { ...scope, reviewStatus: "REJECTED", createdAt: { gte: since } } }),
      prisma.document.count({ where: { ...scope, status: "PROCESSED", updatedAt: { gte: since } } }),
      prisma.document.count({ where: { ...scope, status: "FAILED" } }),
      prisma.task.count({ where: { ...scope, status: { in: ["OPEN", "IN_PROGRESS"] } } }),
      prisma.task.count({ where: { ...scope, dueAt: { lt: now }, status: { in: ["OPEN", "IN_PROGRESS"] } } }),
      prisma.followUp.count({ where: { ...scope, status: "MISSED" } }),
      prisma.user.count({ where: { ...scope, isActive: true } }),
      prisma.user.count({ where: { ...scope, lockedUntil: { gt: now } } }),
      prisma.auditLog.count({ where: { ...scope, createdAt: { gte: since } } })
    ]);

    return NextResponse.json({
      service: "medipilot-ai",
      status: failedDocuments > 0 || overdueTasks > 0 ? "attention_required" : "ok",
      requestId,
      accessMode: auth.accessMode,
      generatedAt: now.toISOString(),
      window: {
        hours: windowHours,
        since: since.toISOString()
      },
      ai: summarizeAiMetrics(aiGenerations),
      review: {
        pendingAiDrafts: pendingAiReview,
        rejectedAiDrafts
      },
      documents: {
        processedInWindow: processedDocuments,
        failedTotal: failedDocuments
      },
      workflow: {
        openTasks,
        overdueTasks,
        missedFollowUps
      },
      security: {
        activeUsers,
        lockedUsers,
        recentAuditEvents
      }
    });
  } catch (error) {
    return apiError(error, request);
  }
}

function clinicScope(user: SessionUser | null) {
  return user ? { clinicId: user.clinicId } : {};
}
