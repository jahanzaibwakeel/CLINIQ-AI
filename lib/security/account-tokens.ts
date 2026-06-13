import { createHash, randomBytes } from "crypto";
import type { AccountTokenType, Prisma } from "@prisma/client";
import { prisma } from "@/lib/db";

export function hashAccountToken(token: string) {
  return createHash("sha256").update(token).digest("hex");
}

export async function createAccountToken(input: {
  clinicId: string;
  userId: string;
  type: AccountTokenType;
  expiresInMinutes: number;
}) {
  const token = randomBytes(32).toString("base64url");
  const expiresAt = new Date(Date.now() + input.expiresInMinutes * 60 * 1000);

  await prisma.accountToken.create({
    data: {
      clinicId: input.clinicId,
      userId: input.userId,
      type: input.type,
      tokenHash: hashAccountToken(token),
      expiresAt
    }
  });

  return { token, expiresAt };
}

export async function findValidAccountToken(token: string, type: AccountTokenType) {
  return prisma.accountToken.findFirst({
    where: {
      tokenHash: hashAccountToken(token),
      type,
      usedAt: null,
      expiresAt: { gt: new Date() }
    },
    include: { user: true }
  });
}

export function accountTokenCleanupWhere(now: Date, retentionDays: number): Prisma.AccountTokenWhereInput {
  const usedTokenCutoff = new Date(now.getTime() - retentionDays * 24 * 60 * 60 * 1000);
  return {
    OR: [
      { expiresAt: { lt: now } },
      { usedAt: { lt: usedTokenCutoff } }
    ]
  };
}

export async function cleanupAccountTokens(input: { now?: Date; retentionDays: number }) {
  const now = input.now ?? new Date();
  const where = accountTokenCleanupWhere(now, input.retentionDays);
  const [candidateCount, result] = await prisma.$transaction([
    prisma.accountToken.count({ where }),
    prisma.accountToken.deleteMany({ where })
  ]);

  return {
    candidateCount,
    deletedCount: result.count,
    retentionDays: input.retentionDays,
    cleanedAt: now
  };
}
