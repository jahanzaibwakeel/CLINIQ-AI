"use client";

import { useRouter } from "next/navigation";
import type React from "react";
import { useState } from "react";
import { ClipboardCheck, Send, Sparkles } from "lucide-react";
import { AiOutputRenderer } from "@/components/ai-output-renderer";
import { csrfHeaders } from "@/lib/client/csrf";

type DraftResult = {
  draft: string;
  output: Record<string, unknown>;
  metadata: {
    provider: string;
    model: string;
    usedFallback: boolean;
    reviewStatus: string;
    generationId: string;
  };
};

export function PortalRequestReplyForm({ requestId }: { requestId: string }) {
  const router = useRouter();
  const [body, setBody] = useState("");
  const [instruction, setInstruction] = useState("");
  const [draft, setDraft] = useState<DraftResult | null>(null);
  const [showAssist, setShowAssist] = useState(false);
  const [loading, setLoading] = useState(false);
  const [drafting, setDrafting] = useState(false);
  const [error, setError] = useState("");
  const [draftError, setDraftError] = useState("");

  async function generateDraft() {
    setDrafting(true);
    setDraftError("");
    const response = await fetch(`/api/portal/requests/${requestId}/draft-reply`, {
      method: "POST",
      headers: csrfHeaders({ "Content-Type": "application/json" }),
      body: JSON.stringify({ instruction })
    });
    setDrafting(false);
    const payload = await response.json().catch(() => null) as DraftResult & { error?: string } | null;
    if (!response.ok || !payload) {
      setDraftError(payload?.error ?? "Unable to draft a reply.");
      return;
    }
    setDraft(payload);
  }

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
      <div className="command-actions" style={{ justifyContent: "flex-start" }}>
        <button className="button secondary" onClick={() => setShowAssist((current) => !current)} type="button">
          <Sparkles size={16} />
          {showAssist ? "Hide AI assist" : "AI draft"}
        </button>
      </div>
      {showAssist ? (
        <div className="inline-ai-draft">
          <div className="section-head">
            <div>
              <strong>AI reply assist</strong>
              <p className="muted">Draft patient-safe wording, then insert and edit before sending.</p>
            </div>
            <span className="badge warn">review required</span>
          </div>
          <label className="field">
            <span className="label">Optional staff instruction</span>
            <input
              className="input"
              maxLength={500}
              onChange={(event) => setInstruction(event.target.value)}
              placeholder="Example: acknowledge request and say scheduling will call"
              value={instruction}
            />
          </label>
          <button className="button secondary" disabled={drafting} onClick={generateDraft} type="button">
            <Sparkles size={16} />
            {drafting ? "Drafting..." : "Generate AI draft"}
          </button>
          {draftError ? <span className="badge warn">{draftError}</span> : null}
          {draft ? (
            <div className="ai-output-shell compact-ai-output">
              <AiOutputRenderer output={draft.output} metadata={{ ...draft.metadata, type: "PORTAL_REPLY_DRAFT" }} />
              <button className="button secondary" onClick={() => setBody(draft.draft)} type="button">
                <ClipboardCheck size={16} />
                Insert draft
              </button>
            </div>
          ) : null}
        </div>
      ) : null}
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
