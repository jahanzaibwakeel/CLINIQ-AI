import Link from "next/link";
import { Bell, Bot, CalendarClock, CheckSquare, FileWarning } from "lucide-react";
import { AppShell } from "@/components/app-shell";
import { prisma } from "@/lib/db";
import { getSession } from "@/lib/security/session";

type InboxItem = {
  id: string;
  title: string;
  detail: string;
  href: string;
  severity: "high" | "medium" | "low";
  icon: "task" | "followup" | "ai" | "document" | "schedule";
  createdAt: Date;
};

export default async function InboxPage() {
  const user = await getSession();
  const clinicId = user?.clinicId ?? "";
  const now = new Date();
  const tomorrow = new Date(now.getTime() + 24 * 60 * 60 * 1000);

  const [overdueTasks, missedFollowUps, pendingAi, failedDocuments, todayAppointments] = await Promise.all([
    prisma.task.findMany({
      where: { clinicId, status: { in: ["OPEN", "IN_PROGRESS"] }, dueAt: { lt: now } },
      include: { patient: true },
      orderBy: { dueAt: "asc" },
      take: 10
    }),
    prisma.followUp.findMany({
      where: { clinicId, status: { in: ["MISSED", "SCHEDULED"] }, scheduledFor: { lt: now } },
      include: { patient: true },
      orderBy: { scheduledFor: "asc" },
      take: 10
    }),
    prisma.aiGeneration.findMany({
      where: { clinicId, reviewStatus: "DRAFT" },
      include: { patient: true },
      orderBy: { createdAt: "desc" },
      take: 10
    }),
    prisma.document.findMany({
      where: { clinicId, status: "FAILED" },
      include: { patient: true },
      orderBy: { updatedAt: "desc" },
      take: 10
    }),
    prisma.appointment.findMany({
      where: { clinicId, status: "SCHEDULED", startsAt: { gte: now, lt: tomorrow } },
      include: { patient: true, clinician: true },
      orderBy: { startsAt: "asc" },
      take: 10
    })
  ]);

  const items: InboxItem[] = [
    ...overdueTasks.map((task) => ({
      id: `task-${task.id}`,
      title: `Overdue task: ${task.title}`,
      detail: `${task.patient ? `${task.patient.firstName} ${task.patient.lastName}` : "Clinic task"} | due ${task.dueAt?.toLocaleString() ?? "no due date"}`,
      href: "/tasks",
      severity: "high" as const,
      icon: "task" as const,
      createdAt: task.dueAt ?? task.createdAt
    })),
    ...missedFollowUps.map((followUp) => ({
      id: `followup-${followUp.id}`,
      title: `Follow-up needs attention: ${followUp.title}`,
      detail: `${followUp.patient.firstName} ${followUp.patient.lastName} | scheduled ${followUp.scheduledFor.toLocaleString()}`,
      href: "/follow-ups",
      severity: followUp.status === "MISSED" ? "high" as const : "medium" as const,
      icon: "followup" as const,
      createdAt: followUp.scheduledFor
    })),
    ...pendingAi.map((generation) => ({
      id: `ai-${generation.id}`,
      title: `AI draft pending review: ${generation.type.replaceAll("_", " ")}`,
      detail: `${generation.patient ? `${generation.patient.firstName} ${generation.patient.lastName}` : "Clinic draft"} | ${generation.provider}/${generation.model}`,
      href: "/ai-review",
      severity: "medium" as const,
      icon: "ai" as const,
      createdAt: generation.createdAt
    })),
    ...failedDocuments.map((document) => ({
      id: `document-${document.id}`,
      title: `Document processing failed: ${document.fileName}`,
      detail: `${document.patient.firstName} ${document.patient.lastName} | re-upload or inspect source text`,
      href: "/documents",
      severity: "high" as const,
      icon: "document" as const,
      createdAt: document.updatedAt
    })),
    ...todayAppointments.map((appointment) => ({
      id: `appointment-${appointment.id}`,
      title: `Appointment today: ${appointment.title}`,
      detail: `${appointment.startsAt.toLocaleTimeString()} | ${appointment.patient.firstName} ${appointment.patient.lastName} with ${appointment.clinician.name}`,
      href: "/schedule",
      severity: "low" as const,
      icon: "schedule" as const,
      createdAt: appointment.startsAt
    }))
  ].sort((a, b) => severityRank(b.severity) - severityRank(a.severity) || b.createdAt.getTime() - a.createdAt.getTime());

  return (
    <AppShell active="/inbox">
      <div className="grid" style={{ gap: 16 }}>
        <section className="command-band">
          <div>
            <p className="eyebrow">Clinic notification center</p>
            <h2>Work that needs attention before it slips.</h2>
            <p>Inbox signals are generated from the real workflow state: missed follow-ups, overdue tasks, failed documents, pending AI review, and today&apos;s appointments.</p>
          </div>
          <div className="command-actions">
            <span className="button secondary"><Bell size={18} /> {items.length} signals</span>
          </div>
        </section>

        <div className="grid dashboard-metrics">
          <Metric title="High priority" value={items.filter((item) => item.severity === "high").length} detail="Needs same-day review" tone="orange" />
          <Metric title="AI review" value={pendingAi.length} detail="Doctor approval required" />
          <Metric title="Today" value={todayAppointments.length} detail="Scheduled visits" tone="green" />
        </div>

        <section className="card card-pad">
          <div className="section-head">
            <h2 className="section-title">Inbox signals</h2>
            <span className="badge">{items.length} generated</span>
          </div>
          <div className="timeline-list">
            {items.length ? items.map((item) => {
              const Icon = iconFor(item.icon);
              return (
                <Link className="timeline-item inbox-item" href={item.href} key={item.id}>
                  <div>
                    <strong><Icon size={16} /> {item.title}</strong>
                    <p className="muted">{item.detail}</p>
                  </div>
                  <span className={item.severity === "high" ? "badge warn" : item.severity === "low" ? "badge good" : "badge"}>{item.severity}</span>
                </Link>
              );
            }) : <div className="empty">No urgent signals right now. The clinic queue is quiet.</div>}
          </div>
        </section>
      </div>
    </AppShell>
  );
}

function severityRank(severity: InboxItem["severity"]) {
  return severity === "high" ? 3 : severity === "medium" ? 2 : 1;
}

function iconFor(icon: InboxItem["icon"]) {
  if (icon === "task") return CheckSquare;
  if (icon === "followup") return CalendarClock;
  if (icon === "ai") return Bot;
  if (icon === "document") return FileWarning;
  return Bell;
}

function Metric({ title, value, detail, tone = "blue" }: { title: string; value: number; detail: string; tone?: "blue" | "green" | "orange" }) {
  return (
    <section className={`metric-panel ${tone}`}>
      <p>{title}</p>
      <div><strong>{value}</strong><span>signals</span></div>
      <small>{detail}</small>
    </section>
  );
}
