import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    await prisma.$queryRaw`SELECT 1`;
    return NextResponse.json({
      status: "ready",
      checks: {
        database: "ok"
      },
      timestamp: new Date().toISOString()
    });
  } catch {
    return NextResponse.json(
      {
        status: "not_ready",
        checks: {
          database: "failed"
        },
        timestamp: new Date().toISOString()
      },
      { status: 503 }
    );
  }
}
