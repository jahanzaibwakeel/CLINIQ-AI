import React from "react";
import { ShieldAlert } from "lucide-react";

export function SafetyBanner() {
  return (
    <div className="ai-banner" role="note">
      <ShieldAlert size={22} />
      <div>
        <strong>Clinical safety boundary:</strong> MediPilot AI drafts summaries, tasks, and patient communications for clinician productivity. It is not a diagnostic replacement, and all AI outputs require doctor review before use.
      </div>
    </div>
  );
}
