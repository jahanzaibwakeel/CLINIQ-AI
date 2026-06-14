import { Role } from "@prisma/client";
import { AppShell } from "@/components/app-shell";
import { ClinicalAiComposer } from "@/components/clinical-ai-composer";
import { DocumentIntelligenceBoard } from "@/components/document-intelligence-board";
import { DocumentUploadPanel } from "@/components/document-upload-panel";
import { prisma } from "@/lib/db";
import { getSession } from "@/lib/security/session";

export default async function DocumentsPage() {
  const user = await getSession();
  const documents = await prisma.document.findMany({
    where: { clinicId: user?.clinicId ?? "" },
    include: {
      patient: true,
      uploadedBy: true,
      chunks: true,
      aiGenerations: { orderBy: { createdAt: "desc" }, take: 3 }
    },
    orderBy: { createdAt: "desc" }
  });
  const patients = await prisma.patient.findMany({
    where: { clinicId: user?.clinicId ?? "" },
    select: { id: true, firstName: true, lastName: true, mrn: true },
    orderBy: [{ lastName: "asc" }, { firstName: "asc" }]
  });

  return (
    <AppShell active="/documents">
      <div className="grid two-column">
        <div className="grid">
          <DocumentUploadPanel patients={patients} />
          <DocumentIntelligenceBoard documents={documents} />
          <section className="card card-pad">
            <div className="section-head">
              <h2 className="section-title">Clinical documents</h2>
              <span className="badge">{documents.length} uploaded</span>
            </div>
            <div className="table-wrap">
              <table>
                <thead><tr><th>Document</th><th>Patient</th><th>Status</th><th>Storage</th><th>Chunks</th><th>AI triage</th></tr></thead>
                <tbody>
                  {documents.map((document) => (
                    <tr key={document.id}>
                      <td><strong>{document.fileName}</strong><br /><span className="muted">{document.extractedText?.slice(0, 160)}</span></td>
                      <td>{document.patient.firstName} {document.patient.lastName}</td>
                      <td><span className={document.status === "PROCESSED" ? "badge good" : "badge warn"}>{document.status}</span></td>
                      <td>
                        <span className={document.virusScanStatus === "clean" ? "badge good" : "badge warn"}>{document.virusScanStatus}</span>
                        <br />
                        <span className="muted">{document.storageProvider} | {formatBytes(document.fileSizeBytes)}</span>
                      </td>
                      <td>{document.chunks.length}</td>
                      <td>
                        <div className="triage-stack">
                          {document.aiGenerations.length ? document.aiGenerations.map((generation) => (
                            <div className="triage-pill" key={generation.id}>
                              <strong>{generation.type.replaceAll("_", " ").toLowerCase()}</strong>
                              <span>{previewAiOutput(generation.output)}</span>
                            </div>
                          )) : <span className="muted">Pending AI triage</span>}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        </div>
        {user?.role === Role.ASSISTANT ? (
          <section className="card card-pad">
            <div className="section-head">
              <h2 className="section-title">Assistant document workspace</h2>
              <span className="badge">Operational scope</span>
            </div>
            <p className="muted">
              Upload reports, confirm processing state, and route failed files. Clinical interpretation, risk explanations, and patient-facing summaries stay in the doctor/admin AI review workflow.
            </p>
          </section>
        ) : (
          <ClinicalAiComposer
            title="Document AI intelligence"
            description="Parse uploaded reports, explain abnormal values, draft follow-up instructions, and summarize findings in patient-friendly language."
            defaultText={documents[0]?.extractedText ?? ""}
            patientId={documents[0]?.patientId}
            documentId={documents[0]?.id}
            presets={["DOCUMENT_PARSE", "RISK_FLAG_EXPLAINER", "FOLLOW_UP_INSTRUCTIONS", "VISIT_SUMMARY"]}
          />
        )}
      </div>
    </AppShell>
  );
}

function formatBytes(value: number | null) {
  if (!value) return "size n/a";
  if (value < 1024) return `${value} B`;
  if (value < 1024 * 1024) return `${Math.round(value / 1024)} KB`;
  return `${(value / (1024 * 1024)).toFixed(1)} MB`;
}

function previewAiOutput(output: unknown) {
  if (!output || typeof output !== "object") return "AI draft, doctor review required.";
  const value = output as {
    summary?: string;
    explanation?: string;
    flags?: string[];
    tasks?: Array<{ title?: string }>;
    extracted?: Record<string, unknown>;
  };
  if (value.summary) return value.summary.slice(0, 96);
  if (value.explanation) return value.explanation.slice(0, 96);
  if (value.flags?.length) return value.flags.slice(0, 2).join("; ");
  if (value.tasks?.length) return value.tasks.map((task) => task.title).filter(Boolean).slice(0, 2).join("; ");
  if (value.extracted) return Object.keys(value.extracted).slice(0, 3).join(", ");
  return "AI draft, doctor review required.";
}
