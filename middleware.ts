import { NextResponse, type NextRequest } from "next/server";

const csrfCookieName = "clinik_csrf";
const protectedMethods = new Set(["POST", "PUT", "PATCH", "DELETE"]);

function configuredOrigins() {
  const values = [process.env.NEXT_PUBLIC_APP_URL, process.env.TRUSTED_ORIGINS]
    .filter(Boolean)
    .flatMap((value) => String(value).split(","))
    .map((value) => value.trim())
    .filter(Boolean);

  return new Set(
    values.map((value) => {
      try {
        return new URL(value).origin;
      } catch {
        return value.replace(/\/$/, "");
      }
    })
  );
}

function isLocalOrigin(origin: string) {
  return /^https?:\/\/(localhost|127\.0\.0\.1|\[::1\])(?::\d+)?$/.test(origin);
}

function requestOriginCandidates(request: NextRequest) {
  const forwardedProto = request.headers.get("x-forwarded-proto") ?? request.nextUrl.protocol.replace(":", "");
  const hosts = [
    request.nextUrl.host,
    request.headers.get("x-forwarded-host"),
    request.headers.get("host")
  ].filter(Boolean);

  return hosts.map((host) => `${forwardedProto}://${host}`);
}

function isLocalRequest(request: NextRequest) {
  return requestOriginCandidates(request).some((origin) => isLocalOrigin(origin));
}

function originAllowed(request: NextRequest) {
  const origin = request.headers.get("origin");
  if (!origin) return true;
  if (isLocalRequest(request) && isLocalOrigin(origin)) return true;

  const allowed = configuredOrigins();
  if (allowed.size === 0) return process.env.NODE_ENV !== "production";

  return allowed.has(origin);
}

function securityHeaders(request: NextRequest) {
  const appOrigin = process.env.NEXT_PUBLIC_APP_URL
    ? (() => {
        try {
          return new URL(process.env.NEXT_PUBLIC_APP_URL).origin;
        } catch {
          return "";
        }
      })()
    : "";

  return {
  "X-Content-Type-Options": "nosniff",
  "X-Frame-Options": "DENY",
  "Referrer-Policy": "strict-origin-when-cross-origin",
  "Permissions-Policy": "camera=(), microphone=(), geolocation=(), payment=()",
  ...(process.env.NODE_ENV === "production" && !isLocalRequest(request)
    ? { "Strict-Transport-Security": "max-age=31536000; includeSubDomains" }
    : {}),
  "Content-Security-Policy": [
    "default-src 'self'",
    "base-uri 'self'",
    "frame-ancestors 'none'",
    "object-src 'none'",
    "img-src 'self' data: blob:",
    "font-src 'self' data:",
    "style-src 'self' 'unsafe-inline'",
    "script-src 'self' 'unsafe-inline' 'unsafe-eval'",
    `connect-src 'self' ${appOrigin} http://localhost:* http://127.0.0.1:*`.trim()
  ].join("; ")
};
}

export function middleware(request: NextRequest) {
  const requestId = request.headers.get("x-request-id") ?? crypto.randomUUID();
  if (request.nextUrl.pathname.startsWith("/api/") && protectedMethods.has(request.method)) {
    if (!originAllowed(request)) {
      return NextResponse.json({ error: "Request origin is not trusted" }, { status: 403 });
    }

    const csrfCookie = request.cookies.get(csrfCookieName)?.value;
    const csrfHeader = request.headers.get("x-csrf-token");

    if (!csrfCookie || !csrfHeader || csrfCookie !== csrfHeader) {
      return NextResponse.json({ error: "Invalid CSRF token" }, { status: 403 });
    }
  }

  const requestHeaders = new Headers(request.headers);
  requestHeaders.set("x-request-id", requestId);
  const response = NextResponse.next({ request: { headers: requestHeaders } });
  response.headers.set("X-Request-Id", requestId);
  for (const [key, value] of Object.entries(securityHeaders(request))) {
    response.headers.set(key, value);
  }

  if (!request.cookies.get(csrfCookieName)?.value) {
    response.cookies.set(csrfCookieName, crypto.randomUUID(), {
      httpOnly: false,
      sameSite: "strict",
      secure: process.env.NODE_ENV === "production" && !isLocalRequest(request),
      path: "/"
    });
  }

  return response;
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"]
};
