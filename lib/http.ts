import { NextResponse } from "next/server";
import { ZodError, type ZodSchema } from "zod";
import { logError, requestIdFrom } from "@/lib/observability";

export async function parseJson<T>(request: Request, schema: ZodSchema<T>): Promise<T> {
  const body = await request.json();
  return schema.parse(body);
}

export function apiError(error: unknown, request?: Request) {
  const requestId = requestIdFrom(request);
  if (error instanceof ZodError) {
    return NextResponse.json(
      { error: "Validation failed", issues: error.flatten(), requestId },
      { status: 400 }
    );
  }

  logError("api.unexpected_error", error, { requestId });
  return NextResponse.json({ error: "Unexpected server error", requestId }, { status: 500 });
}
