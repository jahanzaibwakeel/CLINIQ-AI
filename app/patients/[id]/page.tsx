import { notFound } from "next/navigation";
import { AppShell } from "@/components/app-shell";
import { SemanticSearchBox } from "@/components/ai-workbench";
import { ClinicalAiComposer } from "@/components/clinical-ai-composer";
import { prisma } from "@/lib/db";
import { getSession } from "@/lib/security/session";

export default async function PatientDetailPage({ params }: { params: { id: string } }) {
  const user = await getSession();
  const patient = await prisma.patient.findFirst({
    where: { id: params.id, clinicId: user?.clinicId ?? "" },
    include: {
      notes: { orderBy: { createdAt: "desc" } },
      consultations: { orderBy: { startedAt: "desc" } },
      documents: { orderBy: { createdAt: "desc" } },
      followUps: { orderBy: { scheduledFor: "desc" } },
      aiGenerations: { orderBy: { createdAt: "desc" }, take: 5 }
    }
  });

  if (!patient) notFound();
  const defaultText = [patient.conditions.join(", "), ...patient.notes.map((note) => note.body), ...patient.consultations.map((consultation) => consultation.rawNotes)].join("\n");

  return (
    <AppShell active="/patients">
      <div className="grid two-column">
        <div className="grid">
          <section className="card card-pad">
            <div className="section-head">
              <div>
                <h2 className="section-title">{patient.firstName} {patient.lastName}</h2>
                <p className="muted">MRN {patient.mrn} | {patient.sex} | born {patient.dateOfBirth.toLocaleDateString()}</p>
              </div>
              <span className={`badge ${patient.riskScore >= 60 ? "warn" : "good"}`}>Risk {patient.riskScore}</span>
            </div>
            <p><strong>Conditions:</strong> {patient.conditions.join(", ") || "None listed"}</p>
            <p><strong>Medications:</strong> {patient.medications.join(", ") || "None listed"}</p>
            <p><strong>Allergies:</strong> {patient.allergies.join(", ") || "None listed"}</p>
          </section>
          <section className="card card-pad">
            <h2 className="section-title">Recent timeline</h2>
            <div className="table-wrap">
              <table>
                <thead><tr><th>Date</th><th>Type</th><th>Detail</th></tr></thead>
                <tbody>
                  {patient.consultations.map((consultation) => (
                    <tr key={consultation.id}><td>{consultation.startedAt.toLocaleDateString()}</td><td>Consultation</td><td>{consultation.reason}<br /><span className="muted">{consultation.summary ?? consultation.rawNotes.slice(0, 140)}</span></td></tr>
                  ))}
                  {patient.documents.map((document) => (
                    <tr key={document.id}><td>{document.createdAt.toLocaleDateString()}</td><td>Document</td><td>{document.fileName}<br /><span className="muted">{document.status}</span></td></tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
          <SemanticSearchBox patientId={patient.id} />
        </div>
        <ClinicalAiComposer
          title="Patient context AI"
          description="Use selected patient history to create a timeline, explain risks, prepare referral language, or draft patient-friendly wording."
          patientId={patient.id}
          defaultText={defaultText}
          presets={["HISTORY_TIMELINE", "RISK_FLAG_EXPLAINER", "REFERRAL_LETTER", "VISIT_SUMMARY", "ASSISTANT_RESPONSE"]}
        />
      </div>
    </AppShell>
  );
}
