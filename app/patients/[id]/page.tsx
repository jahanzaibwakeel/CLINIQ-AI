import { notFound } from "next/navigation";
import { AppShell } from "@/components/app-shell";
import { PatientExportButton } from "@/components/patient-export-button";
import { PatientChartTabs } from "@/components/patient-chart-tabs";
import { prisma } from "@/lib/db";
import { getSession } from "@/lib/security/session";

export default async function PatientDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const user = await getSession();
  const routeParams = await params;
  const patient = await prisma.patient.findFirst({
    where: { id: routeParams.id, clinicId: user?.clinicId ?? "" },
    include: {
      notes: { orderBy: { createdAt: "desc" } },
      consultations: { orderBy: { startedAt: "desc" } },
      documents: { orderBy: { createdAt: "desc" } },
      followUps: { orderBy: { scheduledFor: "desc" } },
      appointments: { orderBy: { startsAt: "desc" } },
      aiGenerations: { orderBy: { createdAt: "desc" }, take: 5 }
    }
  });

  if (!patient) notFound();
  const defaultText = [patient.conditions.join(", "), ...patient.notes.map((note) => note.body), ...patient.consultations.map((consultation) => consultation.rawNotes)].join("\n");
  const timeline = [
    ...patient.consultations.map((consultation) => ({
      id: consultation.id,
      date: consultation.startedAt.toLocaleDateString(),
      type: "Consultation",
      title: consultation.reason,
      detail: consultation.summary ?? consultation.rawNotes.slice(0, 160)
    })),
    ...patient.documents.map((document) => ({
      id: document.id,
      date: document.createdAt.toLocaleDateString(),
      type: "Document",
      title: document.fileName,
      detail: document.extractedText?.slice(0, 160) ?? document.status
    }))
  ].sort((a, b) => Date.parse(b.date) - Date.parse(a.date));

  return (
    <AppShell active="/patients">
      <div className="grid">
          <section className="card card-pad">
            <div className="section-head">
              <div>
                <h2 className="section-title">{patient.firstName} {patient.lastName}</h2>
                <p className="muted">MRN {patient.mrn} | {patient.sex} | born {patient.dateOfBirth.toLocaleDateString()}</p>
              </div>
              <div className="command-actions">
                <PatientExportButton patientId={patient.id} />
                <span className={`badge ${patient.riskScore >= 60 ? "warn" : "good"}`}>Risk {patient.riskScore}</span>
              </div>
            </div>
            <p><strong>Conditions:</strong> {patient.conditions.join(", ") || "None listed"}</p>
            <p><strong>Medications:</strong> {patient.medications.join(", ") || "None listed"}</p>
            <p><strong>Allergies:</strong> {patient.allergies.join(", ") || "None listed"}</p>
            <p><strong>Appointments:</strong> {patient.appointments.length} scheduled or historical visits</p>
          </section>
        <PatientChartTabs
          patientId={patient.id}
          defaultText={defaultText}
          timeline={timeline}
          consultations={patient.consultations.map((consultation) => ({
            id: consultation.id,
            date: consultation.startedAt.toLocaleDateString(),
            reason: consultation.reason,
            notes: consultation.rawNotes.slice(0, 220),
            status: consultation.status
          }))}
          documents={patient.documents.map((document) => ({
            id: document.id,
            date: document.createdAt.toLocaleDateString(),
            fileName: document.fileName,
            status: document.status,
            extractedText: document.extractedText?.slice(0, 220) ?? "No extracted text"
          }))}
          followUps={patient.followUps.map((followUp) => ({
            id: followUp.id,
            title: followUp.title,
            date: followUp.scheduledFor.toLocaleDateString(),
            status: followUp.status,
            instructions: followUp.instructions
          }))}
          aiGenerations={patient.aiGenerations.map((generation) => ({
            id: generation.id,
            type: generation.type,
            provider: generation.provider,
            model: generation.model,
            reviewStatus: generation.reviewStatus,
            createdAt: generation.createdAt.toISOString()
          }))}
        />
      </div>
    </AppShell>
  );
}
