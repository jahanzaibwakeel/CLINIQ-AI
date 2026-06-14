"use client";

import { useMemo, useState } from "react";
import { Bot, ClipboardCheck, FileText, Loader2, Sparkles } from "lucide-react";
import { AiOutputRenderer } from "@/components/ai-output-renderer";
import { AiRuntimeBadge } from "@/components/ai-runtime-badge";
import { csrfHeaders } from "@/lib/client/csrf";
import { aiTaskCatalog, aiTaskOrder, getAiTaskCopy, type AiTaskType } from "@/lib/ai/catalog";

export type AiType = Exclude<
  AiTaskType,
  "SEMANTIC_SEARCH"
>;

type Preset = {
  type: AiType;
};

const allPresets: Preset[] = aiTaskOrder
  .filter((type): type is AiType => type !== "SEMANTIC_SEARCH")
  .map((type) => ({ type }));

type ClinicalAiComposerProps = {
  title: string;
  description: string;
  defaultText?: string;
  patientId?: string;
  consultationId?: string;
  documentId?: string;
  presets?: AiType[];
  compact?: boolean;
};

type AiResult = {
  type: AiType;
  title: string;
  output: unknown;
  metadata: {
    provider: string;
    model: string;
    usedFallback: boolean;
    reviewStatus: string;
  };
};

export function ClinicalAiComposer({
  title,
  description,
  defaultText = "",
  patientId,
  consultationId,
  documentId,
  presets,
  compact
}: ClinicalAiComposerProps) {
  const visiblePresets = useMemo(
    () => allPresets.filter((preset) => !presets || presets.includes(preset.type)),
    [presets]
  );
  const [selected, setSelected] = useState<AiType>(visiblePresets[0]?.type ?? "CONSULTATION_SUMMARY");
  const [input, setInput] = useState(defaultText);
  const [question, setQuestion] = useState("What should I review before using this draft?");
  const [loading, setLoading] = useState<"single" | "bundle" | null>(null);
  const [results, setResults] = useState<AiResult[]>([]);
  const [error, setError] = useState("");

  async function generate(type: AiType) {
    const copy = getAiTaskCopy(type);
    const response = await fetch("/api/ai/generate", {
      method: "POST",
      headers: csrfHeaders({ "Content-Type": "application/json" }),
      body: JSON.stringify({
        type,
        patientId,
        consultationId,
        documentId,
        input,
        question: type === "ASSISTANT_RESPONSE" ? question : undefined
      })
    });

    if (!response.ok) {
      throw new Error("AI generation failed");
    }

    const data = (await response.json()) as {
      output: unknown;
      provider: string;
      model: string;
      usedFallback: boolean;
    };

    return {
      type,
      title: copy.draftTitle,
      output: data.output,
      metadata: {
        provider: data.provider,
        model: data.model,
        usedFallback: data.usedFallback,
        reviewStatus: "DRAFT"
      }
    };
  }

  async function runSingle() {
    setError("");
    setLoading("single");
    try {
      const result = await generate(selected);
      setResults((current) => [result, ...current.filter((item) => item.type !== selected)]);
    } catch {
      setError("AI could not generate this draft. Check that Ollama is running, or use the safe fallback provider for demos.");
    } finally {
      setLoading(null);
    }
  }

  async function runBundle() {
    setError("");
    setLoading("bundle");
    try {
      const bundleTypes = visiblePresets.slice(0, 5).map((preset) => preset.type);
      const generated = [];
      for (const type of bundleTypes) {
        generated.push(await generate(type));
      }
      setResults(generated);
    } catch {
      setError("Care bundle generation stopped. Try a smaller note or confirm the local AI service is available.");
    } finally {
      setLoading(null);
    }
  }

  const selectedCopy = getAiTaskCopy(selected);

  return (
    <section className="card card-pad">
      <div className="section-head">
        <div>
          <h2 className="section-title">{title}</h2>
          <p className="muted" style={{ marginBottom: 0 }}>{description}</p>
        </div>
        <AiRuntimeBadge />
      </div>
      <div className="ai-banner" style={{ marginBottom: 14 }}>
        <Bot size={20} />
        <div>
          Runs through the configured free/local provider first. AI drafts are never final medical decisions and always require doctor review.
        </div>
      </div>
      <div className="form-grid">
        <div className="segmented" role="tablist" aria-label="AI drafting modules">
          {visiblePresets.map((preset) => (
            <button
              className={selected === preset.type ? "segment active" : "segment"}
              key={preset.type}
              onClick={() => setSelected(preset.type)}
              type="button"
            >
              {aiTaskCatalog[preset.type].shortLabel}
            </button>
          ))}
        </div>
        <p className="muted" style={{ margin: 0 }}>{selectedCopy.help}</p>
        {selected === "ASSISTANT_RESPONSE" ? (
          <label className="field">
            <span className="label">Question</span>
            <input className="input" value={question} onChange={(event) => setQuestion(event.target.value)} />
          </label>
        ) : null}
        <label className="field">
          <span className="label">Doctor bullets, note, or selected context</span>
          <textarea
            className="textarea"
            style={{ minHeight: compact ? 120 : 180 }}
            value={input}
            onChange={(event) => setInput(event.target.value)}
            placeholder={"Example:\n- fatigue 3 weeks\n- glucose 160-190\n- missed eye exam\n- ordered HbA1c, urine ACR, B12"}
          />
        </label>
        <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
          <button className="button" disabled={Boolean(loading) || input.trim().length < 5} onClick={runSingle} type="button">
            {loading === "single" ? <Loader2 size={18} /> : <Sparkles size={18} />}
            Generate {selectedCopy.actionLabel}
          </button>
          <button className="button secondary" disabled={Boolean(loading) || input.trim().length < 5} onClick={runBundle} type="button">
            {loading === "bundle" ? <Loader2 size={18} /> : <ClipboardCheck size={18} />}
            Generate care bundle
          </button>
        </div>
        {error ? <div className="badge warn">{error}</div> : null}
        <div className="grid">
          {results.length ? (
            results.map((result) => (
              <article className="ai-output-shell" key={result.type}>
                <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 10 }}>
                  <FileText size={17} />
                  <strong>{result.title}</strong>
                  <span className="badge warn">doctor review required</span>
                </div>
                <AiOutputRenderer output={result.output} metadata={{ ...result.metadata, type: result.type }} />
              </article>
            ))
          ) : (
            <div className="empty">Write rough bullets and generate a reviewed draft for the selected workflow.</div>
          )}
        </div>
      </div>
    </section>
  );
}
