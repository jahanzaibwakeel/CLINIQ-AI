import { Role } from "@prisma/client";
import { redirect } from "next/navigation";
import { AppShell } from "@/components/app-shell";
import { ClinicalAiComposer } from "@/components/clinical-ai-composer";
import { ConsultationCreateForm } from "@/components/consultation-create-form";
import { prisma } from "@/lib/db";
import { getSession } from "@/lib/security/session";

export default async function ConsultationsPage() {
  const user = await getSession();
  if (user?.role === Role.ASSISTANT) redirect("/");
  const consultations = await prisma.consultation.findMany({
    where: { clinicId: user?.clinicId ?? "" },
    include: { patient: true, doctor: true },
    orderBy: { startedAt: "desc" }
  });
  const patients = await prisma.patient.findMany({
    where: { clinicId: user?.clinicId ?? "" },
    select: { id: true, firstName: true, lastName: true, mrn: true },
    orderBy: [{ lastName: "asc" }, { firstName: "asc" }]
  });
  const latest = consultations[0]?.rawNotes ?? "";

  return (
    <AppShell active="/consultations">
      <div className="grid" style={{ gap: 16 }}>
        <div className="grid two-column">
          <section className="card card-pad">
            <div className="section-head">
              <h2 className="section-title">Consultations</h2>
              <span className="badge">{consultations.length} records</span>
            </div>
            <div className="table-wrap">
              <table>
                <thead><tr><th>Date</th><th>Patient</th><th>Reason</th><th>Status</th></tr></thead>
                <tbody>
                  {consultations.map((consultation) => (
                    <tr key={consultation.id}>
                      <td>{consultation.startedAt.toLocaleDateString()}</td>
                      <td>{consultation.patient.firstName} {consultation.patient.lastName}</td>
                      <td><strong>{consultation.reason}</strong><br /><span className="muted">{consultation.rawNotes.slice(0, 150)}</span></td>
                      <td><span className="badge">{consultation.status}</span></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
          <ConsultationCreateForm patients={patients} />
        </div>
        <ClinicalAiComposer
          title="Consultation AI composer"
          description="Turn rough encounter bullets into a summary, SOAP note, tasks, follow-up instructions, and patient-friendly visit summary."
          defaultText={latest}
          consultationId={consultations[0]?.id}
          patientId={consultations[0]?.patientId}
          presets={["CONSULTATION_SUMMARY", "SOAP_NOTE", "TASK_EXTRACTION", "FOLLOW_UP_INSTRUCTIONS", "VISIT_SUMMARY"]}
        />
      </div>
    </AppShell>
  );
}
