"use client";

import { useMemo, useState } from "react";
import { Bot, ClipboardCheck, FileText, Loader2, Sparkles } from "lucide-react";
import { csrfHeaders } from "@/lib/client/csrf";

type AiType =
  | "CONSULTATION_SUMMARY"
  | "SOAP_NOTE"
  | "HISTORY_TIMELINE"
  | "DOCUMENT_PARSE"
  | "FOLLOW_UP_INSTRUCTIONS"
  | "TASK_EXTRACTION"
  | "RISK_FLAG_EXPLAINER"
  | "VISIT_SUMMARY"
  | "REFERRAL_LETTER"
  | "ASSISTANT_RESPONSE";

type Preset = {
  type: AiType;
  label: string;
  help: string;
};

const allPresets: Preset[] = [
  { type: "CONSULTATION_SUMMARY", label: "Summary", help: "Turn bullets into a clean clinical summary." },
  { type: "SOAP_NOTE", label: "SOAP", help: "Draft Subjective, Objective, Assessment, and Plan." },
  { type: "TASK_EXTRACTION", label: "Tasks", help: "Find clinic work for assistants or doctors." },
  { type: "FOLLOW_UP_INSTRUCTIONS", label: "Follow-up", help: "Draft next-step instructions." },
  { type: "VISIT_SUMMARY", label: "Patient summary", help: "Convert notes into patient-friendly wording." },
  { type: "RISK_FLAG_EXPLAINER", label: "Risk flags", help: "Explain missed follow-up, abnormal values, or key terms." },
  { type: "DOCUMENT_PARSE", label: "Parse report", help: "Extract labs, values, dates, and abnormal findings." },
  { type: "HISTORY_TIMELINE", label: "Timeline", help: "Summarize patient history chronologically." },
  { type: "REFERRAL_LETTER", label: "Referral", help: "Draft a specialist referral letter." },
  { type: "ASSISTANT_RESPONSE", label: "Ask context", help: "Ask a question about selected patient context." }
];

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
  const [results, setResults] = useState<Array<{ type: AiType; label: string; payload: unknown }>>([]);
  const [error, setError] = useState("");

  async function generate(type: AiType) {
    const preset = allPresets.find((item) => item.type === type);
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
      label: preset?.label ?? type,
      payload: {
        metadata: {
          provider: data.provider,
          model: data.model,
          usedFallback: data.usedFallback,
          reviewStatus: "DRAFT"
        },
        output: data.output
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

  const selectedPreset = allPresets.find((preset) => preset.type === selected);

  return (
    <section className="card card-pad">
      <div className="section-head">
        <div>
          <h2 className="section-title">{title}</h2>
          <p className="muted" style={{ marginBottom: 0 }}>{description}</p>
        </div>
        <span className="badge good">Free local AI first</span>
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
              {preset.label}
            </button>
          ))}
        </div>
        <p className="muted" style={{ margin: 0 }}>{selectedPreset?.help}</p>
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
            Generate {selectedPreset?.label}
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
              <article className="result-box" key={result.type}>
                <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 10 }}>
                  <FileText size={17} />
                  <strong>{result.label}</strong>
                  <span className="badge warn">AI draft</span>
                </div>
                {JSON.stringify(result.payload, null, 2)}
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
