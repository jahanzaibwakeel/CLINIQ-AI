export type DocumentFinding = {
  label: string;
  value: string;
  unit?: string;
  status: "normal" | "abnormal" | "follow_up" | "medication" | "date" | "unknown";
  source: "reviewed_parse" | "ai_draft" | "text_scan";
};

export type DocumentIntelligence = {
  confidence: "reviewed" | "ai_draft" | "text_scan" | "needs_review";
  summary: string;
  findings: DocumentFinding[];
  abnormalCount: number;
  followUpCount: number;
};

type AiGenerationLike = {
  type: string;
  output: unknown;
  reviewStatus?: string;
};

const labPattern = /\b(HbA1c|A1c|glucose|LDL|HDL|triglycerides|creatinine|eGFR|B12|TSH|hemoglobin|WBC|platelets)\b[^0-9<>=-]*([<>]?\s?\d+(?:\.\d+)?)\s*([a-zA-Z/%]+)?/gi;

function asRecord(value: unknown): Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value) ? (value as Record<string, unknown>) : {};
}

function textValue(value: unknown) {
  if (typeof value === "string") return value.trim();
  if (typeof value === "number" || typeof value === "boolean") return String(value);
  return "";
}

function titleize(value: string) {
  return value
    .replaceAll(/[_-]+/g, " ")
    .replaceAll(/([a-z])([A-Z])/g, "$1 $2")
    .replace(/\s+/g, " ")
    .trim();
}

function classifyStatus(label: string, value: unknown): DocumentFinding["status"] {
  const combined = `${label} ${textValue(value)}`.toLowerCase();
  if (combined.includes("follow")) return "follow_up";
  if (combined.includes("medication") || combined.includes("medicine") || combined.includes("rx")) return "medication";
  if (combined.includes("date")) return "date";
  if (combined.includes("abnormal") || combined.includes("high") || combined.includes("low") || combined.includes("positive") || combined.includes(">")) return "abnormal";
  return "unknown";
}

function addFinding(
  findings: DocumentFinding[],
  label: string,
  value: unknown,
  source: DocumentFinding["source"],
  status?: DocumentFinding["status"]
) {
  const text = textValue(value);
  if (!text) return;
  findings.push({
    label: titleize(label),
    value: text,
    status: status ?? classifyStatus(label, text),
    source
  });
}

function collectFromStructured(value: unknown, source: DocumentFinding["source"]) {
  const record = asRecord(value);
  const findings: DocumentFinding[] = [];

  for (const [key, content] of Object.entries(record)) {
    if (Array.isArray(content)) {
      for (const item of content) {
        if (typeof item === "string" || typeof item === "number") {
          addFinding(findings, key, item, source);
          continue;
        }

        const itemRecord = asRecord(item);
        const label = textValue(itemRecord.name) || textValue(itemRecord.test) || textValue(itemRecord.label) || key;
        const value = textValue(itemRecord.value) || textValue(itemRecord.result) || textValue(itemRecord.date) || textValue(itemRecord.title) || textValue(itemRecord.text);
        const unit = textValue(itemRecord.unit);
        const status = classifyStatus(`${key} ${textValue(itemRecord.status)} ${textValue(itemRecord.flag)}`, value);
        if (value) {
          findings.push({
            label: titleize(label),
            value,
            unit: unit || undefined,
            status,
            source
          });
        }
      }
      continue;
    }

    if (typeof content === "object" && content !== null) {
      findings.push(...collectFromStructured(content, source));
      continue;
    }

    addFinding(findings, key, content, source);
  }

  return findings;
}

function collectFromText(text: string) {
  const findings: DocumentFinding[] = [];
  for (const match of text.matchAll(labPattern)) {
    const label = match[1] ?? "";
    const value = (match[2] ?? "").replace(/\s+/g, "");
    const unit = match[3]?.trim();
    if (!label || !value) continue;
    findings.push({
      label,
      value,
      unit,
      status: value.includes(">") ? "abnormal" : "unknown",
      source: "text_scan"
    });
  }
  return findings;
}

function latestDocumentParse(aiGenerations: AiGenerationLike[]) {
  return aiGenerations.find((generation) => generation.type === "DOCUMENT_PARSE");
}

export function buildDocumentIntelligence(input: {
  parsedJson?: unknown;
  extractedText?: string | null;
  aiGenerations?: AiGenerationLike[];
}): DocumentIntelligence {
  const reviewedFindings = collectFromStructured(input.parsedJson, "reviewed_parse");
  const aiParse = latestDocumentParse(input.aiGenerations ?? []);
  const aiOutput = asRecord(aiParse?.output);
  const aiFindings = collectFromStructured(aiOutput.extracted, "ai_draft");
  const textFindings = collectFromText(input.extractedText ?? "");
  const findings = reviewedFindings.length ? reviewedFindings : aiFindings.length ? aiFindings : textFindings;
  const confidence = reviewedFindings.length ? "reviewed" : aiFindings.length ? "ai_draft" : textFindings.length ? "text_scan" : "needs_review";
  const abnormalCount = findings.filter((finding) => finding.status === "abnormal").length;
  const followUpCount = findings.filter((finding) => finding.status === "follow_up").length;
  const summary =
    textValue(aiOutput.summary) ||
    (findings.length
      ? `${findings.length} extracted item${findings.length === 1 ? "" : "s"} ready for doctor review.`
      : "No structured findings are available yet. Run or review document parsing before clinical use.");

  return {
    confidence,
    summary,
    findings,
    abnormalCount,
    followUpCount
  };
}
