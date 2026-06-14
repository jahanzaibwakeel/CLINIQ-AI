"use client";

import { useState } from "react";
import { Bot, FileSearch, Sparkles } from "lucide-react";
import { AiOutputRenderer } from "@/components/ai-output-renderer";
import { AiRuntimeBadge } from "@/components/ai-runtime-badge";
import { csrfHeaders } from "@/lib/client/csrf";
import { aiTaskOrder, getAiTaskCopy, type AiTaskType } from "@/lib/ai/catalog";

type AiType = Exclude<AiTaskType, "SEMANTIC_SEARCH">;

const aiOptions = aiTaskOrder
  .filter((type): type is AiType => type !== "SEMANTIC_SEARCH")
  .map((type) => ({ value: type, label: getAiTaskCopy(type).shortLabel }));

type AiWorkbenchResult = {
  type: AiType;
  output: Record<string, unknown>;
  metadata: {
    provider: string;
    model: string;
    usedFallback: boolean;
    reviewStatus: string;
  };
};

export function AiWorkbench({ patientId, defaultText = "" }: { patientId?: string; defaultText?: string }) {
  const [type, setType] = useState<AiType>("SOAP_NOTE");
  const [input, setInput] = useState(defaultText);
  const [question, setQuestion] = useState("What should I review before finalizing this note?");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<AiWorkbenchResult | null>(null);
  const [error, setError] = useState("");
  const selectedCopy = getAiTaskCopy(type);

  async function generate() {
    setLoading(true);
    setError("");
    setResult(null);
    const response = await fetch("/api/ai/generate", {
      method: "POST",
      headers: csrfHeaders({ "Content-Type": "application/json" }),
      body: JSON.stringify({
        type,
        patientId,
        input,
        question: type === "ASSISTANT_RESPONSE" ? question : undefined
      })
    });
    setLoading(false);
    if (!response.ok) {
      setError("AI generation failed. The app will use safe fallbacks when configured providers are unavailable.");
      return;
    }
    const data = (await response.json()) as { output: Record<string, unknown>; provider: string; model: string; usedFallback: boolean };
    setResult({
      type,
      output: data.output,
      metadata: {
        provider: data.provider,
        model: data.model,
        usedFallback: data.usedFallback,
        reviewStatus: "DRAFT"
      }
    });
  }

  return (
    <section className="card card-pad">
      <div className="section-head">
        <h2 className="section-title">AI drafting workbench</h2>
        <AiRuntimeBadge />
      </div>
      <div className="form-grid">
        <label className="field">
          <span className="label">AI module</span>
          <select className="select" value={type} onChange={(event) => setType(event.target.value as AiType)}>
            {aiOptions.map((option) => (
              <option value={option.value} key={option.value}>{option.label}</option>
            ))}
          </select>
        </label>
        {type === "ASSISTANT_RESPONSE" ? (
          <label className="field">
            <span className="label">Doctor question</span>
            <input className="input" value={question} onChange={(event) => setQuestion(event.target.value)} />
          </label>
        ) : null}
        <label className="field">
          <span className="label">Selected note, document, or context</span>
          <textarea className="textarea" value={input} onChange={(event) => setInput(event.target.value)} placeholder="Paste or write clinical context for AI drafting..." />
        </label>
        <button className="button" disabled={loading || input.length < 5} onClick={generate} type="button">
          <Sparkles size={18} />
          {loading ? "Drafting..." : `Generate ${selectedCopy.actionLabel}`}
        </button>
        {error ? <div className="badge warn">{error}</div> : null}
        <div>
          {result ? (
            <div className="ai-output-shell">
              <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 10 }}>
                <Sparkles size={17} />
                <strong>{getAiTaskCopy(result.type).draftTitle}</strong>
                <span className="badge warn">doctor review required</span>
              </div>
              <AiOutputRenderer output={result.output} metadata={{ ...result.metadata, type: result.type }} />
            </div>
          ) : (
            <span className="muted">
              AI output will appear here with provider/model metadata and review status.
            </span>
          )}
        </div>
      </div>
    </section>
  );
}

export function SemanticSearchBox({ patientId }: { patientId?: string }) {
  const [query, setQuery] = useState("microalbuminuria diabetes follow up");
  const [results, setResults] = useState<Array<{ contentPreview: string; score: number }>>([]);
  const [loading, setLoading] = useState(false);

  async function search() {
    setLoading(true);
    const response = await fetch("/api/search", {
      method: "POST",
      headers: csrfHeaders({ "Content-Type": "application/json" }),
      body: JSON.stringify({ query, patientId })
    });
    setLoading(false);
    if (response.ok) {
      const data = (await response.json()) as { results: Array<{ contentPreview: string; score: number }> };
      setResults(data.results);
    }
  }

  return (
    <section className="card card-pad">
      <div className="section-head">
        <h2 className="section-title">Semantic patient search</h2>
        <FileSearch size={19} />
      </div>
      <div className="form-grid">
        <label className="field">
          <span className="label">Search notes and document chunks</span>
          <input className="input" value={query} onChange={(event) => setQuery(event.target.value)} />
        </label>
        <button className="button secondary" disabled={loading || query.length < 2} onClick={search} type="button">
          <Bot size={18} />
          {loading ? "Searching..." : "Search context"}
        </button>
        {results.length ? (
          <div className="risk-list">
            {results.map((result, index) => (
              <div className="card-pad" style={{ border: "1px solid var(--border)", borderRadius: 8 }} key={`${result.contentPreview}-${index}`}>
                <strong>Match {(result.score * 100).toFixed(1)}%</strong>
                <p className="muted">{result.contentPreview}</p>
              </div>
            ))}
          </div>
        ) : (
          <div className="empty">No search results yet.</div>
        )}
      </div>
    </section>
  );
}
