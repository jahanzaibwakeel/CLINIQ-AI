import { NextResponse, type NextRequest } from "next/server";

const csrfCookieName = "medipilot_csrf";
const protectedMethods = new Set(["POST", "PUT", "PATCH", "DELETE"]);

const securityHeaders = {
  "X-Content-Type-Options": "nosniff",
  "X-Frame-Options": "DENY",
  "Referrer-Policy": "strict-origin-when-cross-origin",
  "Permissions-Policy": "camera=(), microphone=(), geolocation=(), payment=()",
  "Content-Security-Policy": [
    "default-src 'self'",
    "base-uri 'self'",
    "frame-ancestors 'none'",
    "object-src 'none'",
    "img-src 'self' data: blob:",
    "font-src 'self' data:",
    "style-src 'self' 'unsafe-inline'",
    "script-src 'self' 'unsafe-inline' 'unsafe-eval'",
    "connect-src 'self' http://localhost:* http://127.0.0.1:*"
  ].join("; ")
};

export function middleware(request: NextRequest) {
  if (request.nextUrl.pathname.startsWith("/api/") && protectedMethods.has(request.method)) {
    const csrfCookie = request.cookies.get(csrfCookieName)?.value;
    const csrfHeader = request.headers.get("x-csrf-token");

    if (!csrfCookie || !csrfHeader || csrfCookie !== csrfHeader) {
      return NextResponse.json({ error: "Invalid CSRF token" }, { status: 403 });
    }
  }

  const response = NextResponse.next();
  for (const [key, value] of Object.entries(securityHeaders)) {
    response.headers.set(key, value);
  }

  if (!request.cookies.get(csrfCookieName)?.value) {
    response.cookies.set(csrfCookieName, crypto.randomUUID(), {
      httpOnly: false,
      sameSite: "strict",
      secure: process.env.NODE_ENV === "production",
      path: "/"
    });
  }

  return response;
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"]
};
