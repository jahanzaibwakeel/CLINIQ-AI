import { AppShell } from "@/components/app-shell";
import { AiWorkbench, SemanticSearchBox } from "@/components/ai-workbench";

export default function AssistantPage() {
  return (
    <AppShell active="/assistant">
      <div className="grid two-column">
        <AiWorkbench defaultText="Selected patient context can be pasted here or launched from a patient profile." />
        <SemanticSearchBox />
      </div>
    </AppShell>
  );
}
