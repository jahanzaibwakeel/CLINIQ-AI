import { cookies } from "next/headers";
import { jwtVerify, SignJWT } from "jose";
import { env } from "@/lib/env";

const cookieName = "medipilot_patient_portal";
const secret = new TextEncoder().encode(env.SESSION_SECRET);

export type PatientPortalSession = {
  patientId: string;
  clinicId: string;
  mrn: string;
  name: string;
};

function isLocalHttpUrl(value: string | undefined) {
  if (!value) return false;

  try {
    const url = new URL(value);
    return url.protocol === "http:" && ["localhost", "127.0.0.1", "::1"].includes(url.hostname);
  } catch {
    return false;
  }
}

function shouldUseSecureCookies() {
  if (process.env.NODE_ENV !== "production") return false;
  return !isLocalHttpUrl(process.env.NEXT_PUBLIC_APP_URL);
}

export async function setPatientPortalSessionCookie(session: PatientPortalSession) {
  const token = await new SignJWT(session)
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("30m")
    .sign(secret);
  const cookieStore = await cookies();
  cookieStore.set(cookieName, token, {
    httpOnly: true,
    secure: shouldUseSecureCookies(),
    sameSite: "lax",
    maxAge: 60 * 30,
    path: "/"
  });
}

export async function getPatientPortalSession(): Promise<PatientPortalSession | null> {
  const cookieStore = await cookies();
  const token = cookieStore.get(cookieName)?.value;
  if (!token) return null;

  try {
    const { payload } = await jwtVerify(token, secret);
    return {
      patientId: String(payload.patientId),
      clinicId: String(payload.clinicId),
      mrn: String(payload.mrn),
      name: String(payload.name)
    };
  } catch {
    return null;
  }
}

export async function clearPatientPortalSessionCookie() {
  const cookieStore = await cookies();
  cookieStore.delete(cookieName);
}
