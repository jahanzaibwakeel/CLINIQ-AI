"use client";

import { useMemo, useState } from "react";
import { Activity, Bot, CalendarClock, FileText, Search, Stethoscope } from "lucide-react";
import { ClinicalAiComposer } from "@/components/clinical-ai-composer";
import { SemanticSearchBox } from "@/components/ai-workbench";

type PatientChartTabsProps = {
  patientId: string;
  defaultText: string;
  timeline: Array<{
    id: string;
    date: string;
    type: string;
    title: string;
    detail: string;
  }>;
  consultations: Array<{
    id: string;
    date: string;
    reason: string;
    notes: string;
    status: string;
  }>;
  documents: Array<{
    id: string;
    date: string;
    fileName: string;
    status: string;
    extractedText: string;
  }>;
  followUps: Array<{
    id: string;
    title: string;
    date: string;
    status: string;
    instructions: string;
  }>;
  aiGenerations: Array<{
    id: string;
    type: string;
    provider: string;
    model: string;
    reviewStatus: string;
    createdAt: string;
  }>;
  canUseClinicalAi?: boolean;
};

const tabs = [
  { id: "timeline", label: "Timeline", icon: Activity },
  { id: "consults", label: "Consults", icon: Stethoscope },
  { id: "documents", label: "Documents", icon: FileText },
  { id: "followups", label: "Follow-ups", icon: CalendarClock },
  { id: "search", label: "Search", icon: Search },
  { id: "ai", label: "AI", icon: Bot }
];

export function PatientChartTabs({
  patientId,
  defaultText,
  timeline,
  consultations,
  documents,
  followUps,
  aiGenerations,
  canUseClinicalAi = true
}: PatientChartTabsProps) {
  const [active, setActive] = useState("timeline");
  const visibleTabs = useMemo(() => tabs.filter((tab) => canUseClinicalAi || (tab.id !== "ai" && tab.id !== "search")), [canUseClinicalAi]);
  const activeTab = useMemo(() => visibleTabs.find((tab) => tab.id === active) ?? visibleTabs[0], [active, visibleTabs]);
  const activeView = activeTab?.id ?? "timeline";

  return (
    <section className="card card-pad">
      <div className="section-head">
        <div>
          <h2 className="section-title">Clinical chart workspace</h2>
          <p className="muted" style={{ marginBottom: 0 }}>{activeTab?.label} view</p>
        </div>
      </div>
      <div className="chart-tabs" role="tablist" aria-label="Patient chart tabs">
        {visibleTabs.map((tab) => {
          const Icon = tab.icon;
          return (
            <button
              className={active === tab.id ? "chart-tab active" : "chart-tab"}
              key={tab.id}
              onClick={() => setActive(tab.id)}
              role="tab"
              type="button"
            >
              <Icon size={16} />
              {tab.label}
            </button>
          );
        })}
      </div>

      <div className="chart-panel">
        {activeView === "timeline" ? (
          <div className="timeline-list">
            {timeline.map((item) => (
              <div className="timeline-item" key={`${item.type}-${item.id}`}>
                <div>
                  <strong>{item.title}</strong>
                  <p className="muted">{item.type} | {item.detail}</p>
                </div>
                <span className="badge">{item.date}</span>
              </div>
            ))}
          </div>
        ) : null}

        {activeView === "consults" ? (
          <div className="table-wrap">
            <table>
              <thead><tr><th>Date</th><th>Reason</th><th>Notes</th><th>Status</th></tr></thead>
              <tbody>
                {consultations.map((consultation) => (
                  <tr key={consultation.id}>
                    <td>{consultation.date}</td>
                    <td><strong>{consultation.reason}</strong></td>
                    <td><span className="muted">{consultation.notes}</span></td>
                    <td><span className="badge">{consultation.status}</span></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : null}

        {activeView === "documents" ? (
          <div className="table-wrap">
            <table>
              <thead><tr><th>Date</th><th>File</th><th>Preview</th><th>Status</th></tr></thead>
              <tbody>
                {documents.map((document) => (
                  <tr key={document.id}>
                    <td>{document.date}</td>
                    <td><strong>{document.fileName}</strong></td>
                    <td><span className="muted">{document.extractedText}</span></td>
                    <td><span className={document.status === "PROCESSED" ? "badge good" : "badge warn"}>{document.status}</span></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : null}

        {activeView === "followups" ? (
          <div className="timeline-list">
            {followUps.length ? (
              followUps.map((followUp) => (
                <div className="timeline-item" key={followUp.id}>
                  <div>
                    <strong>{followUp.title}</strong>
                    <p className="muted">{followUp.instructions}</p>
                  </div>
                  <span className={followUp.status === "SCHEDULED" ? "badge" : "badge warn"}>{followUp.date}</span>
                </div>
              ))
            ) : (
              <div className="empty">No follow-ups are recorded for this patient.</div>
            )}
          </div>
        ) : null}

        {activeView === "search" ? <SemanticSearchBox patientId={patientId} /> : null}

        {activeView === "ai" ? (
          <div className="grid">
            <ClinicalAiComposer
              title="Patient context AI"
              description="Use selected patient history to create a timeline, explain risks, prepare referral language, or draft patient-friendly wording."
              patientId={patientId}
              defaultText={defaultText}
              presets={["HISTORY_TIMELINE", "RISK_FLAG_EXPLAINER", "REFERRAL_LETTER", "VISIT_SUMMARY", "ASSISTANT_RESPONSE"]}
            />
            <section className="card card-pad">
              <div className="section-head">
                <h3 className="section-title">AI generation history</h3>
                <span className="badge">{aiGenerations.length} recent</span>
              </div>
              <div className="timeline-list">
                {aiGenerations.map((generation) => (
                  <div className="timeline-item" key={generation.id}>
                    <div>
                      <strong>{generation.type.replaceAll("_", " ").toLowerCase()}</strong>
                      <p className="muted">{generation.provider} | {generation.model}</p>
                    </div>
                    <span className={generation.reviewStatus === "DRAFT" ? "badge warn" : "badge good"}>{generation.reviewStatus}</span>
                  </div>
                ))}
              </div>
            </section>
          </div>
        ) : null}
      </div>
    </section>
  );
}
