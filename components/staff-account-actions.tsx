"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { LockKeyhole, ShieldCheck, UserCheck, UserMinus } from "lucide-react";
import { csrfHeaders } from "@/lib/client/csrf";

type Role = "DOCTOR" | "CLINIC_ADMIN" | "ASSISTANT";

export function StaffAccountActions({
  userId,
  role,
  isActive,
  locked
}: {
  userId: string;
  role: Role;
  isActive: boolean;
  locked: boolean;
}) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  async function patch(body: Record<string, unknown>) {
    setLoading(true);
    const response = await fetch(`/api/staff/${userId}`, {
      method: "PATCH",
      headers: csrfHeaders({ "Content-Type": "application/json" }),
      body: JSON.stringify(body)
    });
    setLoading(false);
    if (response.ok) router.refresh();
  }

  return (
    <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
      <button className="button secondary" disabled={loading} onClick={() => patch({ isActive: !isActive })} type="button">
        {isActive ? <UserMinus size={16} /> : <UserCheck size={16} />}
        {isActive ? "Deactivate" : "Activate"}
      </button>
      {locked ? (
        <button className="button secondary" disabled={loading} onClick={() => patch({ resetLockout: true })} type="button">
          <LockKeyhole size={16} />
          Unlock
        </button>
      ) : null}
      {(["DOCTOR", "ASSISTANT", "CLINIC_ADMIN"] as Role[])
        .filter((nextRole) => nextRole !== role)
        .slice(0, 2)
        .map((nextRole) => (
          <button className="button secondary" disabled={loading} key={nextRole} onClick={() => patch({ role: nextRole })} type="button">
            <ShieldCheck size={16} />
            {nextRole === "CLINIC_ADMIN" ? "Make admin" : nextRole === "DOCTOR" ? "Make doctor" : "Make assistant"}
          </button>
        ))}
    </div>
  );
}
