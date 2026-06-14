import {
  AlertTriangle,
  Bot,
  CalendarClock,
  ClipboardList,
  FileText,
  ShieldCheck,
  Stethoscope,
  Users
} from "lucide-react";
import { Role } from "@prisma/client";
import { AppShell } from "@/components/app-shell";
import { ClinicalAiComposer, type AiType } from "@/components/clinical-ai-composer";
import { SafetyBanner } from "@/components/safety-banner";
import { getAiTaskCopy } from "@/lib/ai/catalog";
import { prisma } from "@/lib/db";
import { getSession } from "@/lib/security/session";

export default async function DashboardPage() {
  const user = await getSession();
  const clinicId = user?.clinicId ?? "";
  const roleConfig = getRoleDashboardConfig(user?.role ?? Role.DOCTOR);
  const [
    patientCount,
    consultCount,
    docCount,
    tasks,
    aiGenerations,
    pendingAiReviews,
    highRiskPatients,
    followUps,
    recentDocuments,
    signedConsultations,
    todayAppointments
  ] = await Promise.all([
    prisma.patient.count({ where: { clinicId } }),
    prisma.consultation.count({ where: { clinicId } }),
    prisma.document.count({ where: { clinicId } }),
    prisma.task.findMany({ where: { clinicId, status: { in: ["OPEN", "IN_PROGRESS"] } }, include: { patient: true }, take: 6, orderBy: { dueAt: "asc" } }),
    prisma.aiGeneration.findMany({ where: { clinicId }, orderBy: { createdAt: "desc" }, take: 5 }),
    prisma.aiGeneration.count({ where: { clinicId, reviewStatus: "DRAFT" } }),
    prisma.patient.findMany({ where: { clinicId, riskScore: { gte: 50 } }, orderBy: { riskScore: "desc" }, take: 5 }),
    prisma.followUp.findMany({ where: { clinicId, status: "SCHEDULED" }, include: { patient: true }, take: 5, orderBy: { scheduledFor: "asc" } }),
    prisma.document.findMany({ where: { clinicId }, include: { patient: true, chunks: true }, take: 4, orderBy: { createdAt: "desc" } }),
    prisma.consultation.count({ where: { clinicId, status: "SIGNED" } }),
    prisma.appointment.count({
      where: {
        clinicId,
        status: "SCHEDULED",
        startsAt: {
          gte: new Date(new Date().setHours(0, 0, 0, 0)),
          lt: new Date(new Date().setHours(24, 0, 0, 0))
        }
      }
    })
  ]);
  const signedRate = consultCount ? Math.round((signedConsultations / consultCount) * 100) : 0;

  return (
    <AppShell active="/">
      <div className="grid" style={{ gap: 18 }}>
        <SafetyBanner />
        <section className="command-band">
          <div>
            <p className="eyebrow">Today&apos;s clinic command center</p>
            <h2>{roleConfig.headline}</h2>
            <p>{roleConfig.description}</p>
          </div>
          <div className="command-actions">
            {roleConfig.actions.map((action) => (
              <a className={action.primary ? "button" : "button secondary"} href={action.href} key={action.href}>
                {action.icon === "consult" ? <Stethoscope size={18} /> : <ShieldCheck size={18} />}
                {action.label}
              </a>
            ))}
          </div>
        </section>
        <div className="grid stats-grid">
          <Stat title="Active patients" value={patientCount} icon={<Users size={19} />} />
          <Stat title="Consultations" value={consultCount} icon={<Stethoscope size={19} />} />
          <Stat title="Documents parsed" value={docCount} icon={<FileText size={19} />} />
          <Stat title="Pending AI review" value={pendingAiReviews} icon={<Bot size={19} />} />
        </div>
        <div className="grid dashboard-metrics">
          <MetricPanel title="Clinic load" label="open tasks" value={tasks.length} tone="blue" detail={`${followUps.length} follow-ups, ${todayAppointments} appointments today`} />
          <MetricPanel title="Documentation" label="signed consults" value={`${signedRate}%`} tone="green" detail={`${signedConsultations} signed of ${consultCount} total`} />
          <MetricPanel title="AI governance" label="draft queue" value={pendingAiReviews} tone={pendingAiReviews ? "orange" : "green"} detail="Every AI output requires approval or rejection" />
        </div>
        <ClinicalAiComposer
          compact
          title={roleConfig.aiTitle}
          description={roleConfig.aiDescription}
          defaultText={roleConfig.aiDefaultText}
          presets={roleConfig.aiPresets}
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
            {["Consult summaries", "SOAP notes", "Document parsing", "Follow-up plans", "Search summaries"].map((label, index) => {
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
        <div className="grid two-column">
          <section className="card card-pad">
            <div className="section-head">
              <h2 className="section-title">Follow-up radar</h2>
              <CalendarClock size={19} />
            </div>
            <div className="timeline-list">
              {followUps.length ? (
                followUps.map((followUp) => (
                  <div className="timeline-item" key={followUp.id}>
                    <div>
                      <strong>{followUp.title}</strong>
                      <p className="muted">{followUp.patient.firstName} {followUp.patient.lastName} | {followUp.instructions}</p>
                    </div>
                    <span className="badge">{followUp.scheduledFor.toLocaleDateString()}</span>
                  </div>
                ))
              ) : (
                <div className="empty">No scheduled follow-ups.</div>
              )}
            </div>
          </section>
          <section className="card card-pad">
            <div className="section-head">
              <h2 className="section-title">Document pipeline</h2>
              <FileText size={19} />
            </div>
            <div className="timeline-list">
              {recentDocuments.length ? (
                recentDocuments.map((document) => (
                  <div className="timeline-item" key={document.id}>
                    <div>
                      <strong>{document.fileName}</strong>
                      <p className="muted">{document.patient.firstName} {document.patient.lastName} | {document.chunks.length} searchable chunks</p>
                    </div>
                    <span className={document.status === "PROCESSED" ? "badge good" : "badge warn"}>{document.status}</span>
                  </div>
                ))
              ) : (
                <div className="empty">Uploaded reports will appear here after processing.</div>
              )}
            </div>
          </section>
        </div>
        <section className="card card-pad">
          <div className="section-head">
            <h2 className="section-title">Recent AI drafts</h2>
            <span className="badge good">Review queue linked</span>
          </div>
          <div className="timeline-list">
            {aiGenerations.length ? (
              aiGenerations.map((generation) => (
                <div className="timeline-item" key={generation.id}>
                  <div>
                    <strong>{getAiTaskCopy(generation.type).draftTitle}</strong>
                    <p className="muted">{generation.provider} | {generation.model}</p>
                  </div>
                  <span className={generation.reviewStatus === "DRAFT" ? "badge warn" : "badge good"}>{generation.reviewStatus}</span>
                </div>
              ))
            ) : (
              <div className="empty">AI drafts will appear here after generation.</div>
            )}
          </div>
        </section>
      </div>
    </AppShell>
  );
}

function getRoleDashboardConfig(role: Role): {
  headline: string;
  description: string;
  actions: Array<{ href: string; label: string; primary: boolean; icon: "consult" | "review" }>;
  aiTitle: string;
  aiDescription: string;
  aiDefaultText: string;
  aiPresets: AiType[];
} {
  if (role === Role.CLINIC_ADMIN) {
    return {
      headline: "Clinic operations, compliance, and AI governance in one view.",
      description: "Monitor audit readiness, pending reviews, follow-up load, documents, and staff work queues before production hosting.",
      actions: [
        { href: "/ops", label: "Open ops", primary: true, icon: "review" },
        { href: "/audit", label: "Open audit log", primary: false, icon: "review" },
        { href: "/staff", label: "Staff security", primary: false, icon: "review" },
        { href: "/ai-review", label: "Review AI drafts", primary: false, icon: "review" }
      ],
      aiTitle: "Admin workflow AI",
      aiDescription: "Summarize clinic operations notes into tasks, follow-up reminders, or risk flags for staff coordination.",
      aiDefaultText: "- assistant backlog needs review\n- pending AI drafts require doctor signoff\n- several follow-ups due this week",
      aiPresets: ["TASK_EXTRACTION", "FOLLOW_UP_INSTRUCTIONS", "RISK_FLAG_EXPLAINER"]
    };
  }

  if (role === Role.ASSISTANT) {
    return {
      headline: "Assistant work queue focused on follow-ups, documents, and tasks.",
      description: "Keep clinic operations moving while doctors review AI-generated clinical drafts.",
      actions: [
        { href: "/tasks", label: "Open tasks", primary: true, icon: "review" },
        { href: "/inbox", label: "Open inbox", primary: false, icon: "review" },
        { href: "/schedule", label: "Schedule", primary: false, icon: "review" }
      ],
      aiTitle: "Assistant task helper",
      aiDescription: "Paste operational notes and extract call tasks, scheduling reminders, and follow-up wording.",
      aiDefaultText: "- call patient for BP log\n- upload lab report\n- schedule follow-up after HbA1c result",
      aiPresets: ["TASK_EXTRACTION", "FOLLOW_UP_INSTRUCTIONS"]
    };
  }

  return {
    headline: "AI-assisted workflow, still doctor-led.",
    description: "Track operational load, pending AI review, follow-ups, documents, and risk signals from one working surface.",
    actions: [
      { href: "/consultations", label: "New consult", primary: true, icon: "consult" },
      { href: "/inbox", label: "Open inbox", primary: false, icon: "review" },
      { href: "/ai-review", label: "Review AI drafts", primary: false, icon: "review" }
    ],
    aiTitle: "Daily AI note assistant",
    aiDescription: "Paste quick doctor bullets and generate a summary, follow-up plan, or clinic task bundle without leaving the dashboard.",
    aiDefaultText: "- patient reports fatigue for 3 weeks\n- glucose readings 160-190\n- missed eye exam\n- mild tingling feet\n- ordered HbA1c, urine ACR, B12",
    aiPresets: ["CONSULTATION_SUMMARY", "TASK_EXTRACTION", "FOLLOW_UP_INSTRUCTIONS", "VISIT_SUMMARY"]
  };
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

function MetricPanel({
  title,
  label,
  value,
  detail,
  tone
}: {
  title: string;
  label: string;
  value: number | string;
  detail: string;
  tone: "blue" | "green" | "orange";
}) {
  return (
    <section className={`metric-panel ${tone}`}>
      <p>{title}</p>
      <div>
        <strong>{value}</strong>
        <span>{label}</span>
      </div>
      <small>{detail}</small>
    </section>
  );
}
