import { CalendarDays } from "lucide-react";
import { Role } from "@prisma/client";
import { AppShell } from "@/components/app-shell";
import { AppointmentCreateForm } from "@/components/appointment-create-form";
import { ClinicalAiComposer } from "@/components/clinical-ai-composer";
import { prisma } from "@/lib/db";
import { getSession } from "@/lib/security/session";

export default async function SchedulePage() {
  const user = await getSession();
  const clinicId = user?.clinicId ?? "";
  const now = new Date();
  const [appointments, patients, clinicians] = await Promise.all([
    prisma.appointment.findMany({
      where: { clinicId },
      include: { patient: true, clinician: true },
      orderBy: { startsAt: "asc" },
      take: 80
    }),
    prisma.patient.findMany({
      where: { clinicId },
      select: { id: true, firstName: true, lastName: true, mrn: true },
      orderBy: [{ lastName: "asc" }, { firstName: "asc" }]
    }),
    prisma.user.findMany({
      where: { clinicId, role: { in: [Role.DOCTOR, Role.CLINIC_ADMIN] }, isActive: true },
      select: { id: true, name: true, role: true },
      orderBy: { name: "asc" }
    })
  ]);

  const upcoming = appointments.filter((appointment) => appointment.status === "SCHEDULED" && appointment.startsAt >= now).length;
  const today = appointments.filter((appointment) => appointment.startsAt.toDateString() === now.toDateString()).length;
  const needsAttention = appointments.filter((appointment) => appointment.status === "NO_SHOW" || appointment.status === "CANCELLED").length;
  const scheduleContext = appointments
    .slice(0, 12)
    .map((appointment) => `${appointment.startsAt.toLocaleString()} ${appointment.patient.firstName} ${appointment.patient.lastName}: ${appointment.title} (${appointment.status})`)
    .join("\n");

  return (
    <AppShell active="/schedule">
      <div className="grid" style={{ gap: 16 }}>
        <section className="command-band">
          <div>
            <p className="eyebrow">Clinic schedule</p>
            <h2>Appointments, clinician load, and scheduling notes.</h2>
            <p>Coordinate patient visits while keeping appointment creation audited and connected to the patient chart.</p>
          </div>
          <div className="command-actions">
            <span className="button secondary"><CalendarDays size={18} /> {today} today</span>
          </div>
        </section>

        <div className="grid dashboard-metrics">
          <Metric title="Upcoming" value={upcoming} detail="Scheduled future appointments" />
          <Metric title="Today" value={today} detail="Visits on the clinic calendar" tone="green" />
          <Metric title="Attention" value={needsAttention} detail="Cancelled or no-show appointments" tone={needsAttention ? "orange" : "green"} />
        </div>

        <div className="grid two-column">
          <section className="card card-pad">
            <div className="section-head">
              <h2 className="section-title">Appointment board</h2>
              <span className="badge">{appointments.length} visits</span>
            </div>
            {appointments.length ? (
              <div className="table-wrap">
                <table>
                  <thead><tr><th>When</th><th>Patient</th><th>Clinician</th><th>Visit</th><th>Status</th></tr></thead>
                  <tbody>
                    {appointments.map((appointment) => (
                      <tr key={appointment.id}>
                        <td><strong>{appointment.startsAt.toLocaleString()}</strong><br /><span className="muted">Ends {appointment.endsAt.toLocaleTimeString()}</span></td>
                        <td>{appointment.patient.firstName} {appointment.patient.lastName}<br /><span className="muted">{appointment.patient.mrn}</span></td>
                        <td>{appointment.clinician.name}</td>
                        <td><strong>{appointment.title}</strong><br /><span className="muted">{appointment.reason || appointment.location || "No reason recorded"}</span></td>
                        <td><span className={appointment.status === "SCHEDULED" ? "badge good" : appointment.status === "CANCELLED" || appointment.status === "NO_SHOW" ? "badge warn" : "badge"}>{appointment.status.replace("_", " ")}</span></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="empty">No appointments yet. Schedule the first visit from the form.</div>
            )}
          </section>
          <AppointmentCreateForm patients={patients} clinicians={clinicians} />
        </div>

        <ClinicalAiComposer
          compact
          title="Schedule AI helper"
          description="Summarize scheduling notes into follow-up instructions, task lists, or patient-friendly visit prep."
          defaultText={scheduleContext || "- patient needs diabetes lab review\n- bring home glucose log\n- schedule follow-up after report upload"}
          presets={["TASK_EXTRACTION", "FOLLOW_UP_INSTRUCTIONS", "VISIT_SUMMARY"]}
        />
      </div>
    </AppShell>
  );
}

function Metric({ title, value, detail, tone = "blue" }: { title: string; value: number; detail: string; tone?: "blue" | "green" | "orange" }) {
  return (
    <section className={`metric-panel ${tone}`}>
      <p>{title}</p>
      <div><strong>{value}</strong><span>visits</span></div>
      <small>{detail}</small>
    </section>
  );
}
