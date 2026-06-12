import { Role } from "@prisma/client";
import { redirect } from "next/navigation";
import { ShieldCheck } from "lucide-react";
import { AppShell } from "@/components/app-shell";
import { prisma } from "@/lib/db";
import { getSession } from "@/lib/security/session";

export default async function AuditPage() {
  const user = await getSession();
  if (!user) redirect("/login");
  if (user.role !== Role.CLINIC_ADMIN) redirect("/");

  const logs = await prisma.auditLog.findMany({
    where: { clinicId: user.clinicId },
    include: {
      actor: { select: { name: true, email: true, role: true } },
      patient: { select: { firstName: true, lastName: true, mrn: true } }
    },
    orderBy: { createdAt: "desc" },
    take: 100
  });

  const actionCounts = logs.reduce<Record<string, number>>((counts, log) => {
    counts[log.action] = (counts[log.action] ?? 0) + 1;
    return counts;
  }, {});

  return (
    <AppShell active="/audit">
      <div className="grid" style={{ gap: 16 }}>
        <section className="command-band">
          <div>
            <p className="eyebrow">Clinic security trail</p>
            <h2>Audit activity across AI, clinical records, and access.</h2>
            <p>Clinic admins can inspect recent actions, actors, patient links, and metadata before production hosting.</p>
          </div>
          <div className="command-actions">
            <span className="button secondary">
              <ShieldCheck size={18} />
              Admin only
            </span>
          </div>
        </section>

        <div className="grid dashboard-metrics">
          <AuditMetric title="Total events" value={logs.length} detail="Most recent 100 audit records" />
          <AuditMetric title="AI events" value={logs.filter((log) => log.action.startsWith("AI_")).length} detail="Generated, reviewed, or rejected drafts" />
          <AuditMetric title="Login events" value={logs.filter((log) => log.action.includes("LOGIN")).length} detail="Successful and failed known-user logins" />
        </div>

        <section className="card card-pad">
          <div className="section-head">
            <h2 className="section-title">Action mix</h2>
            <span className="badge">{Object.keys(actionCounts).length} action types</span>
          </div>
          <div className="chart-bars">
            {Object.entries(actionCounts).slice(0, 8).map(([action, count]) => (
              <div className="bar-row" key={action}>
                <span>{action}</span>
                <span className="bar-track"><span className="bar-fill" style={{ width: `${Math.min(100, count * 18)}%` }} /></span>
                <strong>{count}</strong>
              </div>
            ))}
          </div>
        </section>

        <section className="card card-pad">
          <div className="section-head">
            <h2 className="section-title">Recent audit log</h2>
            <span className="badge good">Traceable</span>
          </div>
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Time</th>
                  <th>Action</th>
                  <th>Actor</th>
                  <th>Patient</th>
                  <th>Entity</th>
                  <th>Metadata</th>
                </tr>
              </thead>
              <tbody>
                {logs.map((log) => (
                  <tr key={log.id}>
                    <td>{log.createdAt.toLocaleString()}</td>
                    <td><span className={log.action.startsWith("AI_") ? "badge warn" : "badge"}>{log.action}</span></td>
                    <td>{log.actor ? `${log.actor.name} (${log.actor.role})` : "System"}</td>
                    <td>{log.patient ? `${log.patient.firstName} ${log.patient.lastName} (${log.patient.mrn})` : "None"}</td>
                    <td>{log.entityType}<br /><span className="muted">{log.entityId.slice(0, 12)}</span></td>
                    <td><code>{JSON.stringify(log.metadata ?? {}).slice(0, 160)}</code></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      </div>
    </AppShell>
  );
}

function AuditMetric({ title, value, detail }: { title: string; value: number; detail: string }) {
  return (
    <section className="metric-panel blue">
      <p>{title}</p>
      <div>
        <strong>{value}</strong>
        <span>records</span>
      </div>
      <small>{detail}</small>
    </section>
  );
}
