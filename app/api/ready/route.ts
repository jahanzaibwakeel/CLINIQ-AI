import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { cacheHealth } from "@/lib/cache";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const [cache] = await Promise.all([cacheHealth(), prisma.$queryRaw`SELECT 1`]);
    return NextResponse.json({
      status: "ready",
      checks: {
        database: "ok",
        cache
      },
      timestamp: new Date().toISOString()
    });
  } catch {
    return NextResponse.json(
      {
        status: "not_ready",
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
