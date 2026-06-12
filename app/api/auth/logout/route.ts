import { NextResponse } from "next/server";
import { clearSessionCookie } from "@/lib/security/session";

export async function POST() {
  clearSessionCookie();
  return NextResponse.json({ ok: true });
}
