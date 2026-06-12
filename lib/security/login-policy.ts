const lockThreshold = 5;
const lockMinutes = 15;

export function nextFailedLoginState(currentFailures: number, now = new Date()) {
  const failedLoginCount = currentFailures + 1;
  const lockedUntil =
    failedLoginCount >= lockThreshold
      ? new Date(now.getTime() + lockMinutes * 60 * 1000)
      : null;

  return { failedLoginCount, lockedUntil };
}

export function isAccountLocked(lockedUntil: Date | null | undefined, now = new Date()) {
  return Boolean(lockedUntil && lockedUntil > now);
}

export function lockoutCopy(lockedUntil: Date | null | undefined) {
  if (!lockedUntil) return "Account temporarily locked. Try again later or contact the clinic admin.";
  return `Account temporarily locked until ${lockedUntil.toISOString()}. Contact the clinic admin if this was unexpected.`;
}
