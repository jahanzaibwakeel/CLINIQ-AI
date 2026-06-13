import { NextResponse } from "next/server";
import { requestIdFrom } from "@/lib/observability";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const requestId = requestIdFrom(request);
  return NextResponse.json({
    status: "ok",
    service: "medipilot-ai",
    requestId,
    timestamp: new Date().toISOString()
  });
}
