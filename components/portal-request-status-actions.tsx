"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { CheckCircle2, Clock3, Inbox, XCircle } from "lucide-react";
import { csrfHeaders } from "@/lib/client/csrf";

const options = [
  { status: "NEW", label: "New", icon: Inbox },
  { status: "IN_REVIEW", label: "In review", icon: Clock3 },
  { status: "RESOLVED", label: "Resolved", icon: CheckCircle2 },
  { status: "CLOSED", label: "Closed", icon: XCircle }
] as const;

export function PortalRequestStatusActions({ requestId, status }: { requestId: string; status: string }) {
  const router = useRouter();
  const [loading, setLoading] = useState("");

  async function updateStatus(nextStatus: string) {
    setLoading(nextStatus);
    const response = await fetch(`/api/portal/requests/${requestId}`, {
      method: "PATCH",
      headers: csrfHeaders({ "Content-Type": "application/json" }),
      body: JSON.stringify({ status: nextStatus })
    });
    setLoading("");
    if (response.ok) router.refresh();
  }

  return (
    <div className="segmented" aria-label="Portal request status actions">
      {options.map((option) => {
        const Icon = option.icon;
        const active = option.status === status;
        return (
          <button
            className={active ? "segment active" : "segment"}
            disabled={active || Boolean(loading)}
            key={option.status}
            onClick={() => updateStatus(option.status)}
            title={`Mark ${option.label.toLowerCase()}`}
            type="button"
          >
            <Icon size={15} />
            {loading === option.status ? "Saving" : option.label}
          </button>
        );
      })}
    </div>
  );
}
