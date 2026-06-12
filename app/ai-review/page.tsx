import { Role } from "@prisma/client";
import { redirect } from "next/navigation";
import { AppShell } from "@/components/app-shell";
import { AiReviewQueue } from "@/components/ai-review-queue";
import { prisma } from "@/lib/db";
import { getSession } from "@/lib/security/session";

export default async function AiReviewPage() {
  const user = await getSession();
  if (user?.role === Role.ASSISTANT) redirect("/");
  const generations = await prisma.aiGeneration.findMany({
    where: {
      clinicId: user?.clinicId ?? "",
      reviewStatus: "DRAFT"
    },
    include: {
      patient: { select: { firstName: true, lastName: true, mrn: true } },
      consultation: { select: { reason: true } }
    },
    orderBy: { createdAt: "desc" },
    take: 50
  });

  return (
    <AppShell active="/ai-review">
      <AiReviewQueue items={generations} />
    </AppShell>
  );
}
