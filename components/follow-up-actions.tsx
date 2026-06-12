"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { CheckCircle2, XCircle } from "lucide-react";
import { csrfHeaders } from "@/lib/client/csrf";

export function FollowUpActions({ followUpId, status }: { followUpId: string; status: string }) {
  const router = useRouter();
  const [loading, setLoading] = useState<string | null>(null);

  async function update(nextStatus: "COMPLETED" | "MISSED" | "CANCELLED") {
    setLoading(nextStatus);
    const response = await fetch(`/api/follow-ups/${followUpId}`, {
      method: "PATCH",
      headers: csrfHeaders({ "Content-Type": "application/json" }),
      body: JSON.stringify({ status: nextStatus })
    });
    setLoading(null);
    if (response.ok) router.refresh();
  }

  if (status !== "SCHEDULED") {
    return <span className="muted">Closed</span>;
  }

  return (
    <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
      <button className="button secondary" disabled={Boolean(loading)} onClick={() => update("COMPLETED")} type="button">
        <CheckCircle2 size={16} />
        Done
      </button>
      <button className="button secondary" disabled={Boolean(loading)} onClick={() => update("MISSED")} type="button">
        <XCircle size={16} />
        Missed
      </button>
    </div>
  );
}
