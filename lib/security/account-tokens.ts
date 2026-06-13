import { createHash, randomBytes } from "crypto";
import type { AccountTokenType } from "@prisma/client";
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
