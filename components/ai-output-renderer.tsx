import React from "react";
import { getAiTaskCopy } from "@/lib/ai/catalog";

type Metadata = {
  type?: string;
  provider?: string;
  model?: string;
  usedFallback?: boolean;
  reviewStatus?: string;
};

type AiOutputRendererProps = {
  output: unknown;
  metadata?: Metadata;
};

function asRecord(value: unknown): Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value) ? (value as Record<string, unknown>) : {};
}

function textValue(value: unknown) {
  if (typeof value !== "string") return "";
  return value.trim();
}

function stringArray(value: unknown) {
  return Array.isArray(value) ? value.filter((item): item is string => typeof item === "string" && item.trim().length > 0) : [];
}

function formatUnknown(value: unknown): string {
  if (typeof value === "string") return value;
  if (typeof value === "number" || typeof value === "boolean") return String(value);
  if (Array.isArray(value)) return value.map(formatUnknown).filter(Boolean).join("; ");

  const record = asRecord(value);
  const entries = Object.entries(record);
  if (entries.length) {
    return entries
      .map(([key, content]) => `${key.replaceAll(/([A-Z])/g, " $1").toLowerCase()}: ${formatUnknown(content)}`)
      .join("; ");
  }

  return "";
}

function normalizeOutput(value: unknown): Record<string, unknown> {
  if (typeof value === "string") {
    try {
      return normalizeOutput(JSON.parse(value));
    } catch {
      return { summary: value };
    }
  }

  const record = asRecord(value);
  const summary = textValue(record.summary);
  if (summary.startsWith("{")) {
    try {
      const nested = JSON.parse(summary);
      return { ...record, ...asRecord(nested) };
    } catch {
      return record;
    }
  }

  return record;
}

function sentenceBlocks(value: string) {
  return value
    .split(/\n{2,}/)
    .map((part) => part.trim())
    .filter(Boolean);
}

function renderTextSection(title: string, value: unknown) {
  const text = textValue(value);
  if (!text) return null;

  return (
    <section className="ai-output-section">
      <h4>{title}</h4>
      {sentenceBlocks(text).map((paragraph, index) => (
        <p key={`${title}-${index}`}>{paragraph}</p>
      ))}
    </section>
  );
}

function renderListSection(title: string, values: unknown) {
  const items = stringArray(values);
  if (!items.length) return null;

  return (
    <section className="ai-output-section">
      <h4>{title}</h4>
      <ul className="ai-output-list">
        {items.map((item, index) => (
          <li key={`${title}-${index}`}>{item}</li>
        ))}
      </ul>
    </section>
  );
}

function renderSoap(value: unknown) {
  const soap = asRecord(value);
  const rows = ([
    ["Subjective", soap.subjective],
    ["Objective", soap.objective],
    ["Assessment", soap.assessment],
    ["Plan", soap.plan]
  ] as Array<[string, unknown]>).filter((row): row is [string, unknown] => textValue(row[1]).length > 0);

  if (!rows.length) return null;

  return (
    <section className="ai-output-section">
      <h4>SOAP note</h4>
      <div className="ai-soap-grid">
        {rows.map(([label, content]) => (
          <div className="ai-soap-item" key={String(label)}>
            <strong>{label}</strong>
            <p>{textValue(content)}</p>
          </div>
        ))}
      </div>
    </section>
  );
}

function renderTasks(title: string, value: unknown) {
  if (!Array.isArray(value) || !value.length) return null;

  return (
    <section className="ai-output-section">
      <h4>{title}</h4>
      <div className="ai-task-list">
        {value.map((task, index) => {
          const record = asRecord(task);
          const title = textValue(record.title) || `Task ${index + 1}`;
          const priority = textValue(record.priority);
          const rationale = textValue(record.rationale);

          return (
            <div className="ai-task-item" key={`${title}-${index}`}>
              <div>
                <strong>{title}</strong>
                {rationale ? <p>{rationale}</p> : null}
              </div>
              {priority ? <span className="badge">{priority}</span> : null}
            </div>
          );
        })}
      </div>
    </section>
  );
}

function renderExtracted(value: unknown) {
  const extracted = asRecord(value);
  const rows = Object.entries(extracted).filter(([, content]) => {
    if (Array.isArray(content)) return content.length > 0;
    return content !== null && content !== undefined && String(content).trim().length > 0;
  });

  if (!rows.length) return null;

  return (
    <section className="ai-output-section">
      <h4>Extracted information</h4>
      <div className="ai-extracted-grid">
        {rows.map(([key, content]) => (
          <div className="ai-extracted-item" key={key}>
            <strong>{key.replaceAll(/([A-Z])/g, " $1").toLowerCase()}</strong>
            {Array.isArray(content) ? (
              <ul className="ai-output-list">
                {content.map((item, index) => (
                  <li key={`${key}-${index}`}>{formatUnknown(item)}</li>
                ))}
              </ul>
            ) : (
              <p>{formatUnknown(content)}</p>
            )}
          </div>
        ))}
      </div>
    </section>
  );
}

function renderFallback(record: Record<string, unknown>) {
  const known = new Set([
    "disclaimer",
    "summary",
    "soap",
    "tasks",
    "flags",
    "explanation",
    "patientInstructions",
    "patientReply",
    "referralLetter",
    "answer",
    "citations",
    "extracted"
  ]);
  const rows = Object.entries(record).filter(([key, value]) => !known.has(key) && value !== undefined && value !== null);
  if (!rows.length) return null;

  return (
    <section className="ai-output-section">
      <h4>Additional details</h4>
      <div className="ai-extracted-grid">
        {rows.map(([key, value]) => (
          <div className="ai-extracted-item" key={key}>
            <strong>{key}</strong>
            <p>{formatUnknown(value)}</p>
          </div>
        ))}
      </div>
    </section>
  );
}

export function AiOutputRenderer({ output, metadata }: AiOutputRendererProps) {
  const record = normalizeOutput(output);
  const hasContent = Object.keys(record).length > 0;
  const copy = getAiTaskCopy(metadata?.type);

  if (!hasContent) {
    return <div className="empty">No AI draft content available yet.</div>;
  }

  return (
    <article className="ai-output">
      <div className="ai-output-meta">
        <span className="badge warn">{textValue(record.disclaimer) || "AI draft, doctor review required."}</span>
        {metadata?.provider ? <span className="badge">{metadata.provider}</span> : null}
        {metadata?.model ? <span className="badge">{metadata.model}</span> : null}
        {metadata?.usedFallback ? <span className="badge warn">fallback</span> : null}
        {metadata?.reviewStatus ? <span className="badge">{metadata.reviewStatus}</span> : null}
      </div>
      {renderTextSection(copy.primarySectionTitle, record.summary)}
      {renderSoap(record.soap)}
      {renderListSection("Patient instructions", record.patientInstructions)}
      {renderTextSection("Patient reply draft", record.patientReply)}
      {renderTasks(metadata?.type === "TASK_EXTRACTION" ? "Extracted clinic tasks" : "Tasks", record.tasks)}
      {renderListSection("Flags for doctor review", record.flags)}
      {renderTextSection("Explanation", record.explanation)}
      {renderTextSection("Referral letter", record.referralLetter)}
      {renderTextSection("Answer", record.answer)}
      {renderListSection("Citations", record.citations)}
      {renderExtracted(record.extracted)}
      {renderFallback(record)}
    </article>
  );
}
