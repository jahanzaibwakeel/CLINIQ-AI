"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { CheckCircle2, LogIn, RotateCcw, XCircle } from "lucide-react";
import { csrfHeaders } from "@/lib/client/csrf";

type AppointmentStatus = "SCHEDULED" | "CHECKED_IN" | "COMPLETED" | "CANCELLED" | "NO_SHOW";

const actions: Array<{ status: AppointmentStatus; label: string; icon: React.ReactNode }> = [
  { status: "CHECKED_IN", label: "Check in", icon: <LogIn size={16} /> },
  { status: "COMPLETED", label: "Complete", icon: <CheckCircle2 size={16} /> },
  { status: "NO_SHOW", label: "No-show", icon: <XCircle size={16} /> },
  { status: "SCHEDULED", label: "Reopen", icon: <RotateCcw size={16} /> },
  { status: "CANCELLED", label: "Cancel", icon: <XCircle size={16} /> }
];

export function AppointmentStatusActions({
  appointmentId,
  status
}: {
  appointmentId: string;
  status: AppointmentStatus;
}) {
  const router = useRouter();
  const [loading, setLoading] = useState<AppointmentStatus | null>(null);

  async function update(nextStatus: AppointmentStatus) {
    setLoading(nextStatus);
    const response = await fetch(`/api/appointments/${appointmentId}`, {
      method: "PATCH",
      headers: csrfHeaders({ "Content-Type": "application/json" }),
      body: JSON.stringify({ status: nextStatus })
    });
    setLoading(null);
    if (response.ok) router.refresh();
  }

  return (
    <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
      {actions
        .filter((action) => action.status !== status)
        .slice(0, 3)
        .map((action) => (
          <button className="button secondary" disabled={Boolean(loading)} key={action.status} onClick={() => update(action.status)} type="button">
            {action.icon}
            {loading === action.status ? "Saving" : action.label}
          </button>
        ))}
    </div>
  );
}
