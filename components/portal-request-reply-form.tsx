"use client";

import { useRouter } from "next/navigation";
import type React from "react";
import { useState } from "react";
import { Send } from "lucide-react";
import { csrfHeaders } from "@/lib/client/csrf";

export function PortalRequestReplyForm({ requestId }: { requestId: string }) {
  const router = useRouter();
  const [body, setBody] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    setLoading(true);
    setError("");
    const response = await fetch(`/api/portal/requests/${requestId}/comments`, {
      method: "POST",
      headers: csrfHeaders({ "Content-Type": "application/json" }),
      body: JSON.stringify({ body })
    });
    setLoading(false);
    if (!response.ok) {
      const payload = await response.json().catch(() => null) as { error?: string } | null;
      setError(payload?.error ?? "Unable to send reply.");
      return;
    }
    setBody("");
    router.refresh();
  }

  return (
    <form className="form-grid" onSubmit={submit}>
      <label className="field">
        <span className="label">Clinic reply</span>
        <textarea
          className="textarea compact-textarea"
          maxLength={2000}
          minLength={2}
          onChange={(event) => setBody(event.target.value)}
          placeholder="Write a patient-visible update..."
          required
          value={body}
        />
      </label>
      {error ? <span className="badge warn">{error}</span> : null}
      <button className="button secondary" disabled={loading || body.trim().length < 2} type="submit">
        <Send size={16} />
        {loading ? "Sending..." : "Send reply"}
      </button>
    </form>
  );
}
