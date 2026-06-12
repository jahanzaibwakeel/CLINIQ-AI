import { Role } from "@prisma/client";
import { redirect } from "next/navigation";
import { AppShell } from "@/components/app-shell";
import { AiWorkbench, SemanticSearchBox } from "@/components/ai-workbench";
import { getSession } from "@/lib/security/session";

export default async function AssistantPage() {
  const user = await getSession();
  if (user?.role === Role.ASSISTANT) redirect("/");

  return (
    <AppShell active="/assistant">
      <div className="grid two-column">
        <AiWorkbench defaultText="Selected patient context can be pasted here or launched from a patient profile." />
        <SemanticSearchBox />
      </div>
    </AppShell>
  );
}
