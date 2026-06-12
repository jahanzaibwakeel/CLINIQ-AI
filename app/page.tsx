import { AlertTriangle, Bot, ClipboardList, FileText, Stethoscope, Users } from "lucide-react";
import { AppShell } from "@/components/app-shell";
import { ClinicalAiComposer } from "@/components/clinical-ai-composer";
import { SafetyBanner } from "@/components/safety-banner";
import { prisma } from "@/lib/db";
import { getSession } from "@/lib/security/session";

export default async function DashboardPage() {
  const user = await getSession();
  const clinicId = user?.clinicId ?? "";
  const [patientCount, consultCount, docCount, tasks, aiGenerations, highRiskPatients] = await Promise.all([
    prisma.patient.count({ where: { clinicId } }),
    prisma.consultation.count({ where: { clinicId } }),
    prisma.document.count({ where: { clinicId } }),
    prisma.task.findMany({ where: { clinicId, status: { in: ["OPEN", "IN_PROGRESS"] } }, include: { patient: true }, take: 6, orderBy: { dueAt: "asc" } }),
    prisma.aiGeneration.findMany({ where: { clinicId }, orderBy: { createdAt: "desc" }, take: 5 }),
    prisma.patient.findMany({ where: { clinicId, riskScore: { gte: 50 } }, orderBy: { riskScore: "desc" }, take: 5 })
  ]);

  return (
    <AppShell active="/">
      <div className="grid" style={{ gap: 18 }}>
        <SafetyBanner />
        <div className="grid stats-grid">
          <Stat title="Active patients" value={patientCount} icon={<Users size={19} />} />
          <Stat title="Consultations" value={consultCount} icon={<Stethoscope size={19} />} />
          <Stat title="Documents parsed" value={docCount} icon={<FileText size={19} />} />
          <Stat title="AI drafts" value={aiGenerations.length} icon={<Bot size={19} />} />
        </div>
        <ClinicalAiComposer
          compact
          title="Daily AI note assistant"
          description="Paste quick doctor bullets and generate a summary, follow-up plan, or clinic task bundle without leaving the dashboard."
          defaultText={"- patient reports fatigue for 3 weeks\n- glucose readings 160-190\n- missed eye exam\n- mild tingling feet\n- ordered HbA1c, urine ACR, B12"}
          presets={["CONSULTATION_SUMMARY", "TASK_EXTRACTION", "FOLLOW_UP_INSTRUCTIONS", "VISIT_SUMMARY"]}
        />
        <div className="grid two-column">
          <section className="card card-pad">
            <div className="section-head">
              <h2 className="section-title">Open clinical tasks</h2>
              <span className="badge">{tasks.length} active</span>
            </div>
            {tasks.length ? (
              <div className="table-wrap">
                <table>
                  <thead>
                    <tr>
                      <th>Task</th>
                      <th>Patient</th>
                      <th>Due</th>
                      <th>Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {tasks.map((task) => (
                      <tr key={task.id}>
                        <td><strong>{task.title}</strong><br /><span className="muted">{task.description}</span></td>
                        <td>{task.patient ? `${task.patient.firstName} ${task.patient.lastName}` : "Clinic"}</td>
                        <td>{task.dueAt ? task.dueAt.toLocaleDateString() : "No due date"}</td>
                        <td><span className="badge">{task.status.replace("_", " ")}</span></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="empty">No active tasks. AI-extracted tasks will appear here for review.</div>
            )}
          </section>
          <section className="card card-pad">
            <div className="section-head">
              <h2 className="section-title">AI risk flags</h2>
              <AlertTriangle size={19} color="#b45309" />
            </div>
            <div className="risk-list">
              {highRiskPatients.map((patient) => (
                <div className="risk-item" key={patient.id}>
                  <AlertTriangle size={18} />
                  <div>
                    <strong>{patient.firstName} {patient.lastName}</strong>
                    <div>Risk score {patient.riskScore}. Review conditions, recent labs, and follow-ups.</div>
                  </div>
                </div>
              ))}
            </div>
          </section>
        </div>
        <section className="card card-pad">
          <div className="section-head">
            <h2 className="section-title">AI workload mix</h2>
            <span className="badge good">Doctor review required</span>
          </div>
          <div className="chart-bars">
            {["Summaries", "SOAP notes", "Document parsing", "Follow-ups", "Search"].map((label, index) => {
              const values = [78, 64, 52, 46, 38];
              return (
                <div className="bar-row" key={label}>
                  <span>{label}</span>
                  <span className="bar-track"><span className="bar-fill" style={{ width: `${values[index]}%` }} /></span>
                  <strong>{values[index]}</strong>
                </div>
              );
            })}
          </div>
        </section>
      </div>
    </AppShell>
  );
}

function Stat({ title, value, icon }: { title: string; value: number; icon: React.ReactNode }) {
  return (
    <section className="card card-pad stat">
      <div className="stat-icon">{icon}</div>
      <div>
        <div className="stat-number">{value}</div>
        <div className="muted">{title}</div>
      </div>
    </section>
  );
}
