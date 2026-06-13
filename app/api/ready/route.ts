import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { cacheHealth } from "@/lib/cache";
import { logError, requestIdFrom } from "@/lib/observability";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const requestId = requestIdFrom(request);
  try {
    const [cache] = await Promise.all([cacheHealth(), prisma.$queryRaw`SELECT 1`]);
    return NextResponse.json({
      status: "ready",
      requestId,
      checks: {
        database: "ok",
        cache
      },
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    logError("readiness.failed", error, { requestId });
    return NextResponse.json(
      {
        status: "not_ready",
        requestId,
        checks: {
          database: "failed",
          cache: "unknown"
        },
        timestamp: new Date().toISOString()
      },
      { status: 503 }
    );
  }
}
