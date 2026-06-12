"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { CheckCircle2, CircleDot, PlayCircle, XCircle } from "lucide-react";
import { csrfHeaders } from "@/lib/client/csrf";

type TaskStatus = "OPEN" | "IN_PROGRESS" | "DONE" | "CANCELLED";

const actions: Array<{ status: TaskStatus; label: string; icon: React.ReactNode }> = [
  { status: "OPEN", label: "Open", icon: <CircleDot size={16} /> },
  { status: "IN_PROGRESS", label: "Start", icon: <PlayCircle size={16} /> },
  { status: "DONE", label: "Done", icon: <CheckCircle2 size={16} /> },
  { status: "CANCELLED", label: "Cancel", icon: <XCircle size={16} /> }
];

export function TaskStatusActions({ taskId, status }: { taskId: string; status: TaskStatus }) {
  const router = useRouter();
  const [loading, setLoading] = useState<TaskStatus | null>(null);

  async function update(nextStatus: TaskStatus) {
    setLoading(nextStatus);
    const response = await fetch(`/api/tasks/${taskId}`, {
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
