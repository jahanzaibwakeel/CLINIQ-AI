import { describe, expect, it } from "vitest";
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
});
