import { Bot, Cpu, Database, LockKeyhole, ShieldCheck } from "lucide-react";
import { AppShell } from "@/components/app-shell";
import { env, ollamaBaseUrl } from "@/lib/env";

export default function SettingsPage() {
  return (
    <AppShell active="/settings">
      <div className="grid" style={{ gap: 16 }}>
        <div className="grid stats-grid">
          <Setting icon={<Cpu size={20} />} title="AI provider" value={env.AI_PROVIDER} note="Default mode is local Ollama. No paid API is required." />
          <Setting icon={<Bot size={20} />} title="Free model" value={env.OLLAMA_MODEL} note={`Configured endpoint: ${ollamaBaseUrl}`} />
          <Setting icon={<ShieldCheck size={20} />} title="Safety mode" value="Doctor review" note="Every generation is stored as a draft until reviewed." />
          <Setting icon={<LockKeyhole size={20} />} title="PHI policy" value={env.ALLOW_EXTERNAL_AI === "true" ? "External AI enabled" : "Local-first"} note="Private patient data is not sent externally by default." />
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
        <section className="card card-pad">
          <div className="section-head">
            <h2 className="section-title">Data store</h2>
            <Database size={20} />
          </div>
          <p className="muted">
            PostgreSQL stores clinical records, AI metadata, audit logs, document chunks, and embeddings. Valkey caches AI calls and rate limits.
          </p>
        </section>
      </div>
    </AppShell>
  );
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
