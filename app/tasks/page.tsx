import { Role } from "@prisma/client";
import { AppShell } from "@/components/app-shell";
import { ClinicalAiComposer } from "@/components/clinical-ai-composer";
import { TaskStatusActions } from "@/components/task-status-actions";
import { prisma } from "@/lib/db";
import { getSession } from "@/lib/security/session";

export default async function TasksPage() {
  const user = await getSession();
  const tasks = await prisma.task.findMany({
    where: { clinicId: user?.clinicId ?? "" },
    include: { patient: true, assignee: true, createdBy: true },
    orderBy: [{ status: "asc" }, { dueAt: "asc" }]
  });
  const taskContext = tasks
    .map((task) => `${task.title}: ${task.description ?? "No description"} (${task.status})`)
    .join("\n");
  const aiPresets = user?.role === Role.ASSISTANT
    ? ["TASK_EXTRACTION", "FOLLOW_UP_INSTRUCTIONS"] as const
    : ["TASK_EXTRACTION", "FOLLOW_UP_INSTRUCTIONS", "RISK_FLAG_EXPLAINER"] as const;

  return (
    <AppShell active="/tasks">
      <div className="grid two-column">
        <section className="card card-pad">
          <div className="section-head">
            <h2 className="section-title">Clinic task queue</h2>
            <span className="badge">{tasks.length} tasks</span>
          </div>
          <div className="table-wrap">
            <table>
              <thead><tr><th>Task</th><th>Patient</th><th>Assignee</th><th>Due</th><th>Status</th><th>Source</th><th>Actions</th></tr></thead>
              <tbody>
                {tasks.map((task) => (
                  <tr key={task.id}>
                    <td><strong>{task.title}</strong><br /><span className="muted">{task.description}</span></td>
                    <td>{task.patient ? `${task.patient.firstName} ${task.patient.lastName}` : "Clinic"}</td>
                    <td>{task.assignee?.name ?? "Unassigned"}</td>
                    <td>{task.dueAt ? task.dueAt.toLocaleDateString() : "No due date"}</td>
                    <td><span className={task.status === "DONE" ? "badge good" : task.status === "CANCELLED" ? "badge warn" : "badge"}>{task.status.replace("_", " ")}</span></td>
                    <td><span className={task.source.includes("ai") ? "badge warn" : "badge"}>{task.source}</span></td>
                    <td><TaskStatusActions taskId={task.id} status={task.status} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
        <ClinicalAiComposer
          title="Task AI organizer"
          description="Paste notes or review the current queue to extract tasks, draft follow-up wording, and identify operational risk."
          defaultText={taskContext}
          presets={[...aiPresets]}
        />
      </div>
    </AppShell>
  );
}
