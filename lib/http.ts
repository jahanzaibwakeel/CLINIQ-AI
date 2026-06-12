import { NextResponse } from "next/server";
import { ZodError, type ZodSchema } from "zod";

export async function parseJson<T>(request: Request, schema: ZodSchema<T>): Promise<T> {
  const body = await request.json();
  return schema.parse(body);
}

export function apiError(error: unknown) {
  if (error instanceof ZodError) {
    return NextResponse.json(
      { error: "Validation failed", issues: error.flatten() },
      { status: 400 }
    );
  }

  console.error(error);
  return NextResponse.json({ error: "Unexpected server error" }, { status: 500 });
}
