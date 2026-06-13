import { Role } from "@prisma/client";
import { redirect } from "next/navigation";
import { Activity, Bot, Database, ShieldCheck } from "lucide-react";
import { AppShell } from "@/components/app-shell";
import { prisma } from "@/lib/db";
import { getSession } from "@/lib/security/session";
import { average } from "@/lib/observability";

export default async function OpsPage() {
  const user = await getSession();
  if (!user) redirect("/login");
  if (user.role !== Role.CLINIC_ADMIN) redirect("/");

  const since = new Date(Date.now() - 24 * 60 * 60 * 1000);
  const now = new Date();
  const [aiGenerations, recentAudit, pendingReviews, documentTriageCount, failedDocuments, expiredAccountTokens, usedAccountTokens] = await Promise.all([
    prisma.aiGeneration.findMany({
      where: { clinicId: user.clinicId, createdAt: { gte: since } },
      orderBy: { createdAt: "desc" },
      take: 100,
      include: { patient: { select: { firstName: true, lastName: true, mrn: true } } }
    }),
    prisma.auditLog.findMany({
      where: { clinicId: user.clinicId },
      orderBy: { createdAt: "desc" },
      take: 8,
      include: { actor: { select: { name: true, role: true } } }
    }),
    prisma.aiGeneration.count({ where: { clinicId: user.clinicId, reviewStatus: "DRAFT" } }),
    prisma.aiGeneration.count({
      where: {
        clinicId: user.clinicId,
        type: { in: ["DOCUMENT_PARSE", "RISK_FLAG_EXPLAINER", "TASK_EXTRACTION"] },
        documentId: { not: null },
        createdAt: { gte: since }
      }
    }),
    prisma.document.count({ where: { clinicId: user.clinicId, status: "FAILED" } }),
    prisma.accountToken.count({ where: { clinicId: user.clinicId, expiresAt: { lt: now } } }),
    prisma.accountToken.count({ where: { clinicId: user.clinicId, usedAt: { not: null } } })
  ]);

  const latencies = aiGenerations.map((generation) => generation.latencyMs).filter((value): value is number => typeof value === "number");
  const cacheHits = aiGenerations.filter((generation) => generation.cacheHit).length;
  const fallbackRuns = aiGenerations.filter((generation) => generation.provider === "fallback").length;
  const tokenEstimate = aiGenerations.reduce((sum, generation) => sum + (generation.tokenEstimate ?? 0), 0);
  const avgLatency = average(latencies);
  const slowestLatency = latencies.length ? Math.max(...latencies) : 0;
  const providerCounts = aiGenerations.reduce<Record<string, number>>((counts, generation) => {
    counts[generation.provider] = (counts[generation.provider] ?? 0) + 1;
    return counts;
  }, {});

  return (
    <AppShell active="/ops">
      <div className="grid" style={{ gap: 16 }}>
        <section className="command-band">
          <div>
            <p className="eyebrow">Production operations</p>
            <h2>AI reliability, request traces, and platform health.</h2>
            <p>Track provider behavior, cache effectiveness, review backlog, document triage, and audit activity before hosting on a domain.</p>
          </div>
          <div className="command-actions">
            <span className="button secondary">
              <Activity size={18} />
              Admin only
            </span>
          </div>
        </section>

        <div className="grid dashboard-metrics">
          <OpsMetric title="AI runs 24h" value={aiGenerations.length} label="drafts" tone="blue" detail={`${documentTriageCount} created by document triage`} />
          <OpsMetric title="Average latency" value={avgLatency} label="ms" tone={avgLatency > 2500 ? "orange" : "green"} detail={`Slowest observed run ${slowestLatency} ms`} />
          <OpsMetric title="Review backlog" value={pendingReviews} label="drafts" tone={pendingReviews > 10 ? "orange" : "green"} detail="Doctor approval required before record use" />
        </div>

        <div className="grid dashboard-metrics">
          <OpsMetric title="Cache hit rate" value={`${rate(cacheHits, aiGenerations.length)}%`} label="cached" tone="green" detail={`${cacheHits} reused responses in 24h`} />
          <OpsMetric title="Fallback rate" value={`${rate(fallbackRuns, aiGenerations.length)}%`} label="local fallback" tone={fallbackRuns ? "orange" : "green"} detail="Shows Ollama or external provider outages" />
          <OpsMetric title="Token estimate" value={tokenEstimate} label="tokens" tone="blue" detail="Rough prompt plus output estimate" />
          <OpsMetric title="Account token cleanup" value={expiredAccountTokens} label="expired" tone={expiredAccountTokens ? "orange" : "green"} detail={`${usedAccountTokens} used reset or invite tokens retained`} />
        </div>

        <div className="grid two-column">
          <section className="card card-pad">
            <div className="section-head">
              <h2 className="section-title">Provider mix</h2>
              <Bot size={19} />
            </div>
            <div className="chart-bars">
              {Object.entries(providerCounts).length ? Object.entries(providerCounts).map(([provider, count]) => (
                <div className="bar-row" key={provider}>
                  <span>{provider}</span>
                  <span className="bar-track"><span className="bar-fill" style={{ width: `${Math.max(8, rate(count, aiGenerations.length))}%` }} /></span>
                  <strong>{count}</strong>
                </div>
              )) : <div className="empty">No AI runs in the last 24 hours.</div>}
            </div>
          </section>

          <section className="card card-pad">
            <div className="section-head">
              <h2 className="section-title">System checks</h2>
              <Database size={19} />
            </div>
            <div className="timeline-list">
              <OpsCheck title="Database" status="Healthy" detail="Prisma query path is active for this page." good />
              <OpsCheck title="Document processing" status={failedDocuments ? "Needs review" : "Healthy"} detail={`${failedDocuments} failed documents currently recorded.`} good={!failedDocuments} />
              <OpsCheck title="Request tracing" status="Enabled" detail="Middleware attaches X-Request-Id to app and API requests." good />
              <OpsCheck title="Account-token cleanup" status={expiredAccountTokens ? "Run cleanup" : "Healthy"} detail="Use npm run security:cleanup-tokens on a schedule." good={!expiredAccountTokens} />
            </div>
          </section>
        </div>

        <section className="card card-pad">
          <div className="section-head">
            <h2 className="section-title">Recent AI request traces</h2>
            <span className="badge good">Observable</span>
          </div>
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Time</th>
                  <th>Type</th>
                  <th>Patient</th>
                  <th>Provider</th>
                  <th>Latency</th>
                  <th>Request ID</th>
                </tr>
              </thead>
              <tbody>
                {aiGenerations.slice(0, 12).map((generation) => (
                  <tr key={generation.id}>
                    <td>{generation.createdAt.toLocaleString()}</td>
                    <td><span className="badge">{generation.type.replaceAll("_", " ")}</span></td>
                    <td>{generation.patient ? `${generation.patient.firstName} ${generation.patient.lastName} (${generation.patient.mrn})` : "Clinic"}</td>
                    <td>{generation.provider}<br /><span className="muted">{generation.model}</span></td>
                    <td>{generation.latencyMs ?? 0} ms<br /><span className="muted">{generation.cacheHit ? "cache hit" : "fresh run"}</span></td>
                    <td><code>{generation.requestId ?? "untracked"}</code></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        <section className="card card-pad">
          <div className="section-head">
            <h2 className="section-title">Recent audit signals</h2>
            <ShieldCheck size={19} />
          </div>
          <div className="timeline-list">
            {recentAudit.map((log) => (
              <div className="timeline-item" key={log.id}>
                <div>
                  <strong>{log.action}</strong>
                  <p className="muted">{log.actor ? `${log.actor.name} (${log.actor.role})` : "System"} | {log.entityType}</p>
                </div>
                <span className="badge">{log.createdAt.toLocaleString()}</span>
              </div>
            ))}
          </div>
        </section>
      </div>
    </AppShell>
  );
}

function rate(part: number, total: number) {
  if (!total) return 0;
  return Math.round((part / total) * 100);
}

function OpsMetric({
  title,
  value,
  label,
  detail,
  tone
}: {
  title: string;
  value: number | string;
  label: string;
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

function OpsCheck({ title, status, detail, good }: { title: string; status: string; detail: string; good: boolean }) {
  return (
    <div className="timeline-item">
      <div>
        <strong>{title}</strong>
        <p className="muted">{detail}</p>
      </div>
      <span className={good ? "badge good" : "badge warn"}>{status}</span>
    </div>
  );
}
