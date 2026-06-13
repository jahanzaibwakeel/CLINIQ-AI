import { FileSearch, ShieldCheck } from "lucide-react";
import { AiOutputRenderer } from "@/components/ai-output-renderer";
import { buildDocumentIntelligence } from "@/lib/documents/intelligence";

type DocumentForIntelligence = {
  id: string;
  fileName: string;
  parsedJson: unknown;
  extractedText?: string | null;
  status: string;
  virusScanStatus: string;
  patient: { firstName: string; lastName: string; mrn: string };
  aiGenerations: Array<{
    id: string;
    type: string;
    provider: string;
    model: string;
    reviewStatus: string;
    output: unknown;
  }>;
};

function confidenceCopy(confidence: string) {
  if (confidence === "reviewed") return { label: "Reviewed parse", className: "badge good" };
  if (confidence === "ai_draft") return { label: "AI draft parse", className: "badge warn" };
  if (confidence === "text_scan") return { label: "Text scan", className: "badge" };
  return { label: "Needs review", className: "badge warn" };
}

function statusClass(status: string) {
  if (status === "abnormal" || status === "follow_up") return "badge warn";
  if (status === "medication" || status === "date") return "badge";
  return "badge good";
}

export function DocumentIntelligenceBoard({ documents }: { documents: DocumentForIntelligence[] }) {
  const reviewedCount = documents.filter((document) => buildDocumentIntelligence(document).confidence === "reviewed").length;
  const needsReviewCount = documents.filter((document) => buildDocumentIntelligence(document).confidence !== "reviewed").length;
  const abnormalCount = documents.reduce((count, document) => count + buildDocumentIntelligence(document).abnormalCount, 0);

  return (
    <section className="card card-pad">
      <div className="section-head">
        <div>
          <h2 className="section-title">Parsed value review</h2>
          <p className="muted" style={{ marginBottom: 0 }}>
            Review extracted labs, dates, medications, abnormal values, and follow-up needs before clinical use.
          </p>
        </div>
        <span className="badge warn">Doctor review required</span>
      </div>
      <div className="grid dashboard-metrics">
        <DocMetric title="Reviewed" value={reviewedCount} detail="approved parsed records" tone={reviewedCount ? "green" : "orange"} />
        <DocMetric title="Needs review" value={needsReviewCount} detail="AI/text draft state" tone={needsReviewCount ? "orange" : "green"} />
        <DocMetric title="Abnormal signals" value={abnormalCount} detail="from parsed findings" tone={abnormalCount ? "orange" : "green"} />
      </div>
      <div className="grid" style={{ marginTop: 14 }}>
        {documents.length ? (
          documents.map((document) => {
            const intelligence = buildDocumentIntelligence(document);
            const confidence = confidenceCopy(intelligence.confidence);
            const parseDraft = document.aiGenerations.find((generation) => generation.type === "DOCUMENT_PARSE");

            return (
              <article className="document-intel-card" key={document.id}>
                <div className="section-head">
                  <div>
                    <h3 className="section-title">{document.fileName}</h3>
                    <p className="muted" style={{ marginBottom: 0 }}>
                      {document.patient.firstName} {document.patient.lastName} | {document.patient.mrn}
                    </p>
                  </div>
                  <div style={{ display: "flex", gap: 8, flexWrap: "wrap", justifyContent: "flex-end" }}>
                    <span className={confidence.className}>{confidence.label}</span>
                    <span className={document.status === "PROCESSED" ? "badge good" : "badge warn"}>{document.status}</span>
                  </div>
                </div>
                <div className="ai-banner">
                  <ShieldCheck size={20} />
                  <div>{intelligence.summary}</div>
                </div>
                {intelligence.findings.length ? (
                  <div className="table-wrap" style={{ marginTop: 12 }}>
                    <table>
                      <thead>
                        <tr>
                          <th>Finding</th>
                          <th>Value</th>
                          <th>Status</th>
                          <th>Source</th>
                        </tr>
                      </thead>
                      <tbody>
                        {intelligence.findings.slice(0, 8).map((finding, index) => (
                          <tr key={`${document.id}-${finding.label}-${index}`}>
                            <td><strong>{finding.label}</strong></td>
                            <td>{finding.value}{finding.unit ? ` ${finding.unit}` : ""}</td>
                            <td><span className={statusClass(finding.status)}>{finding.status.replace("_", " ")}</span></td>
                            <td><span className="muted">{finding.source.replace("_", " ")}</span></td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <div className="empty" style={{ marginTop: 12 }}>No parsed values yet. Use Document AI intelligence, then approve the document parse in AI Review.</div>
                )}
                {parseDraft ? (
                  <details className="document-ai-details">
                    <summary><FileSearch size={16} /> View AI parse draft</summary>
                    <AiOutputRenderer
                      output={parseDraft.output}
                      metadata={{
                        provider: parseDraft.provider,
                        model: parseDraft.model,
                        usedFallback: parseDraft.provider === "fallback",
                        reviewStatus: parseDraft.reviewStatus
                      }}
                    />
                  </details>
                ) : null}
              </article>
            );
          })
        ) : (
          <div className="empty">Upload a report to start document intelligence review.</div>
        )}
      </div>
    </section>
  );
}

function DocMetric({
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
