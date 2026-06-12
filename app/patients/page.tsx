import Link from "next/link";
import { Role } from "@prisma/client";
import { AppShell } from "@/components/app-shell";
import { PatientCreateForm } from "@/components/patient-create-form";
import { prisma } from "@/lib/db";
import { getSession } from "@/lib/security/session";

export default async function PatientsPage() {
  const user = await getSession();
  const patients = await prisma.patient.findMany({
    where: { clinicId: user?.clinicId ?? "" },
    include: { primaryDoctor: true, consultations: true, followUps: true },
    orderBy: { lastName: "asc" }
  });

  return (
    <AppShell active="/patients">
      <div className="grid two-column">
        <section className="card card-pad">
          <div className="section-head">
            <h2 className="section-title">Patient registry</h2>
            <span className="badge">{patients.length} records</span>
          </div>
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Patient</th>
                  <th>MRN</th>
                  <th>Conditions</th>
                  <th>Risk</th>
                  <th>Doctor</th>
                </tr>
              </thead>
              <tbody>
                {patients.map((patient) => (
                  <tr key={patient.id}>
                    <td><Link href={`/patients/${patient.id}`}><strong>{patient.firstName} {patient.lastName}</strong></Link><br /><span className="muted">{patient.sex}, born {patient.dateOfBirth.toLocaleDateString()}</span></td>
                    <td>{patient.mrn}</td>
                    <td>{patient.conditions.join(", ") || "None listed"}</td>
                    <td><span className={`badge ${patient.riskScore >= 60 ? "warn" : "good"}`}>{patient.riskScore}</span></td>
                    <td>{patient.primaryDoctor?.name ?? "Unassigned"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
        {user?.role === Role.DOCTOR || user?.role === Role.CLINIC_ADMIN ? (
          <PatientCreateForm />
        ) : (
          <section className="card card-pad">
            <div className="section-head">
              <h2 className="section-title">Assistant patient workspace</h2>
              <span className="badge good">Read-only</span>
            </div>
            <p className="muted">
              Assistants can review patient context for scheduling, documents, tasks, and follow-ups. Patient creation is limited to doctors and clinic admins.
            </p>
          </section>
        )}
      </div>
    </AppShell>
  );
}
