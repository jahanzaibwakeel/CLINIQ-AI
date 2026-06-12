import { AppShell } from "@/components/app-shell";
import { ClinicalAiComposer } from "@/components/clinical-ai-composer";
import { DocumentUploadPanel } from "@/components/document-upload-panel";
import { prisma } from "@/lib/db";
import { getSession } from "@/lib/security/session";

export default async function DocumentsPage() {
  const user = await getSession();
  const documents = await prisma.document.findMany({
    where: { clinicId: user?.clinicId ?? "" },
    include: { patient: true, uploadedBy: true, chunks: true },
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
          <section className="card card-pad">
            <div className="section-head">
              <h2 className="section-title">Clinical documents</h2>
              <span className="badge">{documents.length} uploaded</span>
            </div>
            <div className="table-wrap">
              <table>
                <thead><tr><th>Document</th><th>Patient</th><th>Status</th><th>Chunks</th></tr></thead>
                <tbody>
                  {documents.map((document) => (
                    <tr key={document.id}>
                      <td><strong>{document.fileName}</strong><br /><span className="muted">{document.extractedText?.slice(0, 160)}</span></td>
                      <td>{document.patient.firstName} {document.patient.lastName}</td>
                      <td><span className={document.status === "PROCESSED" ? "badge good" : "badge warn"}>{document.status}</span></td>
                      <td>{document.chunks.length}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        </div>
        <ClinicalAiComposer
          title="Document AI intelligence"
          description="Parse uploaded reports, explain abnormal values, draft follow-up instructions, and summarize findings in patient-friendly language."
          defaultText={documents[0]?.extractedText ?? ""}
          patientId={documents[0]?.patientId}
          documentId={documents[0]?.id}
          presets={["DOCUMENT_PARSE", "RISK_FLAG_EXPLAINER", "FOLLOW_UP_INSTRUCTIONS", "VISIT_SUMMARY"]}
        />
      </div>
    </AppShell>
  );
}
