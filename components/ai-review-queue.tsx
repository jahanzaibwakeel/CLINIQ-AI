"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { CheckCircle2, Filter, Loader2, ShieldAlert, XCircle } from "lucide-react";
import { AiOutputRenderer } from "@/components/ai-output-renderer";
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
  sourceContext: unknown;
  latencyMs?: number | null;
  cacheHit?: boolean;
  tokenEstimate?: number | null;
  requestId?: string | null;
  patient?: { firstName: string; lastName: string; mrn: string } | null;
  consultation?: { reason: string } | null;
};

type ReviewFilter = "all" | "fallback" | "external" | "applyable" | "high_attention";

const applyableTypes = new Set([
  "CONSULTATION_SUMMARY",
  "SOAP_NOTE",
  "TASK_EXTRACTION",
  "FOLLOW_UP_INSTRUCTIONS",
  "DOCUMENT_PARSE",
  "VISIT_SUMMARY",
  "REFERRAL_LETTER",
  "HISTORY_TIMELINE",
  "RISK_FLAG_EXPLAINER"
]);

function prettyType(type: string) {
  return type.replaceAll("_", " ").toLowerCase();
}

function isExternalProvider(provider: string) {
  return provider !== "ollama" && provider !== "fallback" && provider !== "cache";
}

function sourceRecord(value: unknown) {
  return typeof value === "object" && value !== null ? (value as Record<string, unknown>) : {};
}

function validateDraft(text: string) {
  try {
    const parsed = JSON.parse(text) as Record<string, unknown>;
    const disclaimer = parsed.disclaimer === "AI draft, doctor review required.";
    return {
      valid: true,
      parsed,
      disclaimer,
      message: disclaimer ? "JSON valid with required disclaimer." : "JSON valid, but required disclaimer is missing or changed."
    };
  } catch {
    return {
      valid: false,
      parsed: null,
      disclaimer: false,
      message: "Edited output is not valid JSON."
    };
  }
}

function attentionReasons(item: ReviewItem, draftText: string) {
  const validation = validateDraft(draftText);
  const reasons = [];
  if (item.provider === "fallback") reasons.push("safe fallback");
  if (isExternalProvider(item.provider)) reasons.push("external provider");
  if (!validation.valid) reasons.push("invalid JSON");
  if (validation.valid && !validation.disclaimer) reasons.push("disclaimer changed");
  if (item.latencyMs && item.latencyMs > 60000) reasons.push("slow generation");
  return reasons;
}

export function AiReviewQueue({ items }: { items: ReviewItem[] }) {
  const router = useRouter();
  const [busyId, setBusyId] = useState<string | null>(null);
  const [notes, setNotes] = useState<Record<string, string>>({});
  const [filter, setFilter] = useState<ReviewFilter>("all");
  const [query, setQuery] = useState("");
  const [error, setError] = useState("");
  const [drafts, setDrafts] = useState<Record<string, string>>(() =>
    Object.fromEntries(items.map((item) => [item.id, JSON.stringify(item.output, null, 2)]))
  );

  const filteredItems = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();
    return items.filter((item) => {
      const draftText = drafts[item.id] ?? "";
      const patient = item.patient ? `${item.patient.firstName} ${item.patient.lastName} ${item.patient.mrn}` : "";
      const searchable = `${item.type} ${item.provider} ${item.model} ${patient} ${item.consultation?.reason ?? ""}`.toLowerCase();
      if (normalizedQuery && !searchable.includes(normalizedQuery)) return false;
      if (filter === "fallback") return item.provider === "fallback";
      if (filter === "external") return isExternalProvider(item.provider);
      if (filter === "applyable") return applyableTypes.has(item.type);
      if (filter === "high_attention") return attentionReasons(item, draftText).length > 0;
      return true;
    });
  }, [drafts, filter, items, query]);

  const stats = useMemo(() => {
    const fallback = items.filter((item) => item.provider === "fallback").length;
    const external = items.filter((item) => isExternalProvider(item.provider)).length;
    const applyable = items.filter((item) => applyableTypes.has(item.type)).length;
    const highAttention = items.filter((item) => attentionReasons(item, drafts[item.id] ?? "").length > 0).length;
    return { fallback, external, applyable, highAttention };
  }, [drafts, items]);

  async function review(id: string, reviewStatus: "REVIEWED" | "REJECTED", applyToRecord = false) {
    setBusyId(id);
    setError("");
    let output: unknown = undefined;

    if (reviewStatus === "REVIEWED") {
      const validation = validateDraft(drafts[id] ?? "{}");
      if (!validation.valid || !validation.disclaimer) {
        setBusyId(null);
        setError(validation.message);
        return;
      }
      output = validation.parsed;
    }

    const response = await fetch(`/api/ai/generations/${id}/review`, {
      method: "PATCH",
      headers: csrfHeaders({ "Content-Type": "application/json" }),
      body: JSON.stringify({
        reviewStatus,
        reviewerNote: notes[id] || undefined,
        output,
        applyToRecord
      })
    });
    setBusyId(null);

    if (!response.ok) {
      setError("Review update failed. Confirm your role and session are valid.");
      return;
    }

    setNotes((current) => ({ ...current, [id]: "" }));
    router.refresh();
  }

  return (
    <div className="grid">
      <section className="card card-pad">
        <div className="section-head">
          <div>
            <h2 className="section-title">AI draft review queue</h2>
            <p className="muted" style={{ marginBottom: 0 }}>
              Review, edit, approve, reject, or apply AI drafts with provider and audit context visible.
            </p>
          </div>
          <span className="badge warn">{items.length} pending</span>
        </div>
        <div className="grid dashboard-metrics">
          <ReviewMetric title="Fallback" value={stats.fallback} detail="Needs closer review" tone={stats.fallback ? "orange" : "green"} />
          <ReviewMetric title="Apply-ready" value={stats.applyable} detail="Can update records" tone="blue" />
          <ReviewMetric title="Attention" value={stats.highAttention} detail="Safety or quality signal" tone={stats.highAttention ? "orange" : "green"} />
        </div>
        <div className="inline-grid" style={{ marginTop: 14 }}>
          <label className="field">
            <span className="label">Search drafts</span>
            <input
              className="input"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Patient, MRN, provider, model, or draft type"
            />
          </label>
          <label className="field">
            <span className="label">Review filter</span>
            <select className="select" value={filter} onChange={(event) => setFilter(event.target.value as ReviewFilter)}>
              <option value="all">All pending drafts</option>
              <option value="high_attention">High-attention drafts</option>
              <option value="fallback">Fallback outputs</option>
              <option value="external">External provider outputs</option>
              <option value="applyable">Can apply to record</option>
            </select>
          </label>
        </div>
        <div className="ai-banner" style={{ marginTop: 14 }}>
          <Filter size={20} />
          <div>
            Approvals require valid JSON and the exact required disclaimer. Rejections can be filed without editing output.
          </div>
        </div>
        {error ? <div className="badge warn" style={{ marginTop: 12 }}>{error}</div> : null}
      </section>

      {filteredItems.length ? (
        filteredItems.map((item) => {
          const draftText = drafts[item.id] ?? "";
          const validation = validateDraft(draftText);
          const reasons = attentionReasons(item, draftText);
          const canApply = applyableTypes.has(item.type);
          const source = sourceRecord(item.sourceContext);
          const createdAt = new Date(item.createdAt).toLocaleString();

          return (
            <article className="card card-pad" key={item.id}>
              <div className="section-head">
                <div>
                  <h3 className="section-title">{prettyType(item.type)}</h3>
                  <p className="muted" style={{ marginBottom: 0 }}>
                    {item.patient ? `${item.patient.firstName} ${item.patient.lastName} (${item.patient.mrn})` : "Clinic-wide draft"}
                    {item.consultation ? ` | ${item.consultation.reason}` : ""}
                  </p>
                </div>
                <div style={{ display: "flex", gap: 8, flexWrap: "wrap", justifyContent: "flex-end" }}>
                  <span className={validation.valid && validation.disclaimer ? "badge good" : "badge warn"}>
                    {validation.valid && validation.disclaimer ? "reviewable" : "fix JSON"}
                  </span>
                  <span className={reasons.length ? "badge warn" : "badge good"}>{reasons.length ? "attention" : "standard"}</span>
                </div>
              </div>
              <div className="ai-banner" style={{ marginBottom: 12 }}>
                <ShieldAlert size={20} />
                <div>
                  Provider {item.provider} | Model {item.model} | Prompt {item.promptVersion} | Created {createdAt}
                  {item.requestId ? ` | Request ${item.requestId}` : ""}
                </div>
              </div>
              <div className="grid dashboard-metrics">
                <ReviewMetric title="Latency" value={item.latencyMs ? `${Math.round(item.latencyMs / 1000)}s` : "n/a"} detail={item.cacheHit ? "cache hit" : "fresh generation"} tone={item.latencyMs && item.latencyMs > 60000 ? "orange" : "blue"} />
                <ReviewMetric title="Tokens" value={item.tokenEstimate ?? "n/a"} detail="rough estimate" tone="blue" />
                <ReviewMetric title="Apply" value={canApply ? "Yes" : "No"} detail={canApply ? "record update supported" : "review only"} tone={canApply ? "green" : "orange"} />
              </div>
              {reasons.length ? (
                <div className="risk-list" style={{ marginTop: 12 }}>
                  <div className="risk-item">
                    <ShieldAlert size={18} />
                    <div>
                      <strong>Review attention</strong>
                      <div>{reasons.join(", ")}</div>
                    </div>
                  </div>
                </div>
              ) : null}
              <AiOutputRenderer
                output={item.output}
                metadata={{
                  provider: item.provider,
                  model: item.model,
                  usedFallback: item.provider === "fallback",
                  reviewStatus: item.reviewStatus
                }}
              />
              <label className="field">
                <span className="label">Editable reviewed output JSON</span>
                <textarea
                  className="textarea"
                  value={draftText}
                  onChange={(event) => setDrafts((current) => ({ ...current, [item.id]: event.target.value }))}
                />
              </label>
              <label className="field">
                <span className="label">Reviewer note for this draft</span>
                <input
                  className="input"
                  value={notes[item.id] ?? ""}
                  onChange={(event) => setNotes((current) => ({ ...current, [item.id]: event.target.value }))}
                  placeholder="What changed, why approved, or why rejected"
                />
              </label>
              <div className="timeline-item">
                <div>
                  <strong>Source preview</strong>
                  <p className="muted">{String(source.sourceTextPreview ?? "No preview stored.")}</p>
                </div>
                <span className="badge">{item.reviewStatus}</span>
              </div>
              <div style={{ display: "flex", gap: 10, flexWrap: "wrap", marginTop: 12 }}>
                <button
                  className="button"
                  disabled={busyId === item.id || !validation.valid || !validation.disclaimer}
                  onClick={() => review(item.id, "REVIEWED")}
                  type="button"
                >
                  {busyId === item.id ? <Loader2 size={18} /> : <CheckCircle2 size={18} />}
                  Approve only
                </button>
                <button
                  className="button"
                  disabled={busyId === item.id || !canApply || !validation.valid || !validation.disclaimer}
                  onClick={() => review(item.id, "REVIEWED", true)}
                  type="button"
                >
                  {busyId === item.id ? <Loader2 size={18} /> : <CheckCircle2 size={18} />}
                  Approve + apply
                </button>
                <button className="button secondary" disabled={busyId === item.id} onClick={() => review(item.id, "REJECTED")} type="button">
                  <XCircle size={18} />
                  Reject draft
                </button>
              </div>
            </article>
          );
        })
      ) : (
        <div className="empty">No AI drafts match this review filter.</div>
      )}
    </div>
  );
}

function ReviewMetric({
  title,
  value,
  detail,
  tone
}: {
  title: string;
  value: number | string;
  detail: string;
  tone: "blue" | "green" | "orange";
}) {
  return (
    <section className={`metric-panel ${tone}`} style={{ minHeight: 104 }}>
      <p>{title}</p>
      <div>
        <strong>{value}</strong>
      </div>
      <small>{detail}</small>
    </section>
  );
}
