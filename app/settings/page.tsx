import { Bot, Cpu, Database, GlobeLock, LockKeyhole, Server, ShieldCheck } from "lucide-react";
import { AppShell } from "@/components/app-shell";
import { env, ollamaBaseUrl } from "@/lib/env";
import { getAiRuntimeStatus } from "@/lib/ai/status";
import { cacheHealth } from "@/lib/cache";
import { prisma } from "@/lib/db";
import { getSession } from "@/lib/security/session";

export default async function SettingsPage() {
  const user = await getSession();
  const clinicId = user?.clinicId ?? "";
  const [cache, aiRuntime, aiDrafts, auditEvents] = await Promise.all([
    cacheHealth(),
    getAiRuntimeStatus(),
    prisma.aiGeneration.count({ where: { clinicId, reviewStatus: "DRAFT" } }),
    prisma.auditLog.count({ where: { clinicId } })
  ]);
  const externalAiEnabled = env.ALLOW_EXTERNAL_AI === "true";
  const productionOriginConfigured = Boolean(process.env.NEXT_PUBLIC_APP_URL || process.env.TRUSTED_ORIGINS);

  return (
    <AppShell active="/settings">
      <div className="grid" style={{ gap: 16 }}>
        <div className="grid stats-grid">
          <Setting icon={<Cpu size={20} />} title="AI provider" value={env.AI_PROVIDER} note="Default mode is local Ollama. No paid API is required." />
          <Setting icon={<Bot size={20} />} title="AI runtime" value={runtimeLabel(aiRuntime.status)} note={aiRuntime.message} />
          <Setting icon={<Bot size={20} />} title="Free model" value={env.OLLAMA_MODEL} note={`Configured endpoint: ${ollamaBaseUrl}`} />
          <Setting icon={<ShieldCheck size={20} />} title="Safety mode" value="Doctor review" note="Every generation is stored as a draft until reviewed." />
          <Setting icon={<LockKeyhole size={20} />} title="PHI policy" value={externalAiEnabled ? "External AI enabled" : "Local-first"} note="Private patient data is not sent externally by default." />
        </div>
        <section className="command-band">
          <div>
            <p className="eyebrow">Deployment readiness</p>
            <h2>Configuration, AI safety, and hosting posture in one place.</h2>
            <p>Use this screen before domain hosting to confirm local-first AI, security headers, cache state, audit coverage, and review backlog.</p>
          </div>
          <div className="command-actions">
            <span className="button secondary">
              <Server size={18} />
              {cache === "ok" ? "Valkey ready" : cache === "memory" ? "Memory cache" : "Cache degraded"}
            </span>
          </div>
        </section>
        <div className="grid dashboard-metrics">
          <ReadinessMetric title="Pending AI review" value={aiDrafts} label="drafts" detail="Doctor review required before record use" tone={aiDrafts > 10 ? "orange" : "green"} />
          <ReadinessMetric title="Audit events" value={auditEvents} label="records" detail="Clinical, AI, login, and document actions" tone="blue" />
          <ReadinessMetric title="External AI" value={externalAiEnabled ? "On" : "Off"} label="policy" detail="External PHI transfer is opt-in only" tone={externalAiEnabled ? "orange" : "green"} />
        </div>
        <section className="card card-pad">
          <div className="section-head">
            <h2 className="section-title">Free AI operating mode</h2>
            <span className="badge good">No paid API required</span>
          </div>
          <p className="muted">
            MediPilot is designed to run day-to-day AI workflows through Ollama and open-weight models. Use `qwen2.5:7b` for stronger local summarization and structured note drafting, or switch to a smaller local model on low-memory machines.
          </p>
          <div className="chart-bars">
            <div className="bar-row">
              <span>Runtime</span>
              <span className="bar-track"><span className="bar-fill" style={{ width: aiRuntime.status === "ready" ? "100%" : aiRuntime.status === "model_missing" ? "45%" : "20%" }} /></span>
              <strong>{runtimeLabel(aiRuntime.status)}</strong>
            </div>
            <div className="bar-row">
              <span>Model</span>
              <span className="bar-track"><span className="bar-fill" style={{ width: aiRuntime.modelAvailable ? "100%" : "35%" }} /></span>
              <strong>{aiRuntime.model}</strong>
            </div>
            <div className="bar-row">
              <span>Output cap</span>
              <span className="bar-track"><span className="bar-fill" style={{ width: `${Math.min(100, Math.max(20, aiRuntime.numPredict / 4))}%` }} /></span>
              <strong>{aiRuntime.numPredict}</strong>
            </div>
            <div className="bar-row">
              <span>Summaries</span>
              <span className="bar-track"><span className="bar-fill" style={{ width: "86%" }} /></span>
              <strong>Local</strong>
            </div>
            <div className="bar-row">
              <span>SOAP</span>
              <span className="bar-track"><span className="bar-fill" style={{ width: "80%" }} /></span>
              <strong>Local</strong>
            </div>
            <div className="bar-row">
              <span>Tasks</span>
              <span className="bar-track"><span className="bar-fill" style={{ width: "78%" }} /></span>
              <strong>Local</strong>
            </div>
          </div>
        </section>
        <div className="grid two-column">
          <section className="card card-pad">
            <div className="section-head">
              <h2 className="section-title">Data store</h2>
              <Database size={20} />
            </div>
            <div className="timeline-list">
              <ReadinessCheck title="PostgreSQL" detail="Stores clinical records, AI metadata, audit logs, chunks, and embeddings." state="Configured" good />
              <ReadinessCheck title="Valkey/Redis" detail={cache === "ok" ? "Network cache is reachable." : cache === "memory" ? "Using safe in-memory fallback for local demos." : "Cache check failed; inspect VALKEY_URL."} state={cache} good={cache !== "degraded"} />
              <ReadinessCheck title="Migrations" detail="Prisma migrations are committed for deploy-time database setup." state="Versioned" good />
              <ReadinessCheck title="AI model" detail={aiRuntime.message} state={runtimeLabel(aiRuntime.status)} good={aiRuntime.status === "ready" || aiRuntime.status === "configured"} />
            </div>
          </section>
          <section className="card card-pad">
            <div className="section-head">
              <h2 className="section-title">Hosting checklist</h2>
              <GlobeLock size={20} />
            </div>
            <div className="timeline-list">
              <ReadinessCheck title="Trusted origin" detail="Set NEXT_PUBLIC_APP_URL or TRUSTED_ORIGINS before production domain hosting." state={productionOriginConfigured ? "Set" : "Needed"} good={productionOriginConfigured} />
              <ReadinessCheck title="Security headers" detail="Middleware applies CSP, HSTS in production, frame denial, and content sniffing protection." state="Enabled" good />
              <ReadinessCheck title="Account lockout" detail="Known users lock temporarily after repeated failed password attempts." state="Enabled" good />
            </div>
          </section>
        </div>
      </div>
    </AppShell>
  );
}

function runtimeLabel(status: string) {
  return status.replaceAll("_", " ");
}

function Setting({ icon, title, value, note }: { icon: React.ReactNode; title: string; value: string; note: string }) {
  return (
    <section className="card card-pad stat">
      <div className="stat-icon">{icon}</div>
      <div>
        <div className="section-title">{title}</div>
        <strong>{value}</strong>
        <p className="muted">{note}</p>
      </div>
    </section>
  );
}

function ReadinessMetric({
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

function ReadinessCheck({ title, detail, state, good }: { title: string; detail: string; state: string; good: boolean }) {
  return (
    <div className="timeline-item">
      <div>
        <strong>{title}</strong>
        <p className="muted">{detail}</p>
      </div>
      <span className={good ? "badge good" : "badge warn"}>{state}</span>
    </div>
  );
}
