import { describe, expect, it } from "vitest";
import { accountTokenCleanupWhere, hashAccountToken } from "@/lib/security/account-tokens";
import { hashPatientPortalToken } from "@/lib/security/patient-portal-tokens";
import { isAccountLocked, nextFailedLoginState } from "@/lib/security/login-policy";

describe("Login security policy", () => {
  it("locks a known account on the fifth failed login", () => {
    const now = new Date("2026-06-12T12:00:00.000Z");
    const state = nextFailedLoginState(4, now);
    expect(state.failedLoginCount).toBe(5);
    expect(state.lockedUntil?.toISOString()).toBe("2026-06-12T12:15:00.000Z");
  });

  it("detects active lockouts only while the lock is in the future", () => {
    const now = new Date("2026-06-12T12:00:00.000Z");
    expect(isAccountLocked(new Date("2026-06-12T12:01:00.000Z"), now)).toBe(true);
    expect(isAccountLocked(new Date("2026-06-12T11:59:00.000Z"), now)).toBe(false);
    expect(isAccountLocked(null, now)).toBe(false);
  });

  it("hashes account tokens deterministically without storing raw tokens", () => {
    expect(hashAccountToken("reset-token")).toBe(hashAccountToken("reset-token"));
    expect(hashAccountToken("reset-token")).not.toBe("reset-token");
    expect(hashAccountToken("reset-token")).not.toBe(hashAccountToken("other-token"));
  });

  it("hashes patient portal tokens without storing raw link values", () => {
    expect(hashPatientPortalToken("portal-token")).toBe(hashPatientPortalToken("portal-token"));
    expect(hashPatientPortalToken("portal-token")).not.toBe("portal-token");
    expect(hashPatientPortalToken("portal-token")).not.toBe(hashPatientPortalToken("other-token"));
  });

  it("builds cleanup filters for expired and old used account tokens", () => {
    const now = new Date("2026-06-13T12:00:00.000Z");
    const where = accountTokenCleanupWhere(now, 7);
    expect(where).toEqual({
      OR: [
        { expiresAt: { lt: now } },
        { usedAt: { lt: new Date("2026-06-06T12:00:00.000Z") } }
      ]
    });
  });
});
