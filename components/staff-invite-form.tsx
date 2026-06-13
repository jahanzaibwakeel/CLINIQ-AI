"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Send, UserPlus } from "lucide-react";
import { csrfHeaders } from "@/lib/client/csrf";

type Role = "DOCTOR" | "CLINIC_ADMIN" | "ASSISTANT";

export function StaffInviteForm() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [name, setName] = useState("");
  const [title, setTitle] = useState("");
  const [role, setRole] = useState<Role>("DOCTOR");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    setLoading(true);
    setMessage("");
    setError("");

    const response = await fetch("/api/staff/invitations", {
      method: "POST",
      headers: csrfHeaders({ "Content-Type": "application/json" }),
      body: JSON.stringify({ email, name, title, role })
    });

    setLoading(false);
    if (!response.ok) {
      const payload = await response.json().catch(() => null) as { error?: string; issues?: { fieldErrors?: Record<string, string[]> } } | null;
      setError(payload?.error ?? payload?.issues?.fieldErrors?.email?.[0] ?? "Unable to send staff invite.");
      return;
    }

    setMessage("Invite sent. In development, check server logs for the preview link.");
    setEmail("");
    setName("");
    setTitle("");
    setRole("DOCTOR");
    router.refresh();
  }

  return (
    <form className="form-grid" onSubmit={submit}>
      <div className="section-head">
        <div>
          <h2 className="section-title">Invite staff</h2>
          <p className="muted">Send a time-limited setup link for a clinic-scoped account.</p>
        </div>
        <UserPlus size={19} />
      </div>
      <div className="form-row">
        <label className="field">
          <span className="label">Name</span>
          <input className="input" onChange={(event) => setName(event.target.value)} required value={name} />
        </label>
        <label className="field">
          <span className="label">Email</span>
          <input className="input" onChange={(event) => setEmail(event.target.value)} required type="email" value={email} />
        </label>
      </div>
      <div className="form-row">
        <label className="field">
          <span className="label">Role</span>
          <select className="input" onChange={(event) => setRole(event.target.value as Role)} value={role}>
            <option value="DOCTOR">Doctor</option>
            <option value="ASSISTANT">Assistant</option>
            <option value="CLINIC_ADMIN">Clinic admin</option>
          </select>
        </label>
        <label className="field">
          <span className="label">Title</span>
          <input className="input" onChange={(event) => setTitle(event.target.value)} placeholder="Care coordinator, physician..." value={title} />
        </label>
      </div>
      {error ? <div className="badge warn">{error}</div> : null}
      {message ? <div className="badge good">{message}</div> : null}
      <button className="button" disabled={loading} type="submit">
        <Send size={18} />
        {loading ? "Sending..." : "Send invite"}
      </button>
    </form>
  );
}
