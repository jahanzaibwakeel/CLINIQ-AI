"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { CheckCircle2, Loader2, XCircle } from "lucide-react";
import { csrfHeaders } from "@/lib/client/csrf";

type ReviewItem = {
  id: string;
  type: string;
  provider: string;
  model: string;
  promptVersion: string;
  reviewStatus: string;
  createdAt: string | Date;
  output: unknown;
  patient?: { firstName: string; lastName: string; mrn: string } | null;
  consultation?: { reason: string } | null;
};

export function AiReviewQueue({ items }: { items: ReviewItem[] }) {
  const router = useRouter();
  const [busyId, setBusyId] = useState<string | null>(null);
  const [note, setNote] = useState("");
  const [error, setError] = useState("");

  async function review(id: string, reviewStatus: "REVIEWED" | "REJECTED") {
    setBusyId(id);
    setError("");
    const response = await fetch(`/api/ai/generations/${id}/review`, {
      method: "PATCH",
      headers: csrfHeaders({ "Content-Type": "application/json" }),
      body: JSON.stringify({ reviewStatus, reviewerNote: note || undefined })
    });
    setBusyId(null);

    if (!response.ok) {
      setError("Review update failed. Confirm your role and session are valid.");
      return;
    }

    setNote("");
    router.refresh();
  }

  return (
    <div className="grid">
      <section className="card card-pad">
        <div className="section-head">
          <div>
            <h2 className="section-title">AI draft review queue</h2>
            <p className="muted" style={{ marginBottom: 0 }}>
              Approve or reject AI drafts before they are used in clinical documentation.
            </p>
          </div>
          <span className="badge warn">{items.length} pending</span>
        </div>
        <label className="field">
          <span className="label">Reviewer note</span>
          <input
            className="input"
            value={note}
            onChange={(event) => setNote(event.target.value)}
            placeholder="Optional note for audit log, e.g. corrected medication wording before approval."
          />
        </label>
        {error ? <div className="badge warn">{error}</div> : null}
      </section>

      {items.length ? (
        items.map((item) => (
          <article className="card card-pad" key={item.id}>
            <div className="section-head">
              <div>
                <h3 className="section-title">{item.type.replaceAll("_", " ").toLowerCase()}</h3>
                <p className="muted" style={{ marginBottom: 0 }}>
                  {item.patient ? `${item.patient.firstName} ${item.patient.lastName} (${item.patient.mrn})` : "Clinic-wide draft"}
                  {item.consultation ? ` | ${item.consultation.reason}` : ""}
                </p>
              </div>
              <span className="badge warn">{item.reviewStatus}</span>
            </div>
            <div className="ai-banner" style={{ marginBottom: 12 }}>
              Provider {item.provider} | Model {item.model} | Prompt {item.promptVersion}
            </div>
            <pre className="result-box" style={{ overflowX: "auto" }}>
              {JSON.stringify(item.output, null, 2)}
            </pre>
            <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
              <button className="button" disabled={busyId === item.id} onClick={() => review(item.id, "REVIEWED")} type="button">
                {busyId === item.id ? <Loader2 size={18} /> : <CheckCircle2 size={18} />}
                Approve draft
              </button>
              <button className="button secondary" disabled={busyId === item.id} onClick={() => review(item.id, "REJECTED")} type="button">
                <XCircle size={18} />
                Reject draft
              </button>
            </div>
          </article>
        ))
      ) : (
        <div className="empty">No pending AI drafts. New AI outputs will appear here for doctor review.</div>
      )}
    </div>
  );
}
