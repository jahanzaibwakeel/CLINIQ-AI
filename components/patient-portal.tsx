"use client";

import Link from "next/link";
import type React from "react";
import { useEffect, useState } from "react";
import { CalendarClock, FileText, LifeBuoy, Link2, LogIn, MessageSquareText, ShieldAlert } from "lucide-react";
import { csrfHeaders } from "@/lib/client/csrf";

type PortalState = {
  patient: { id: string; firstName: string; lastName: string; mrn: string; clinicName: string };
  appointments: Array<{ title: string; reason: string | null; startsAt: string; endsAt: string; location: string | null; status: string }>;
  followUps: Array<{ title: string; instructions: string; scheduledFor: string; status: string }>;
  documents: Array<{ fileName: string; status: string; createdAt: string }>;
  visitSummaries: Array<{ summary: string; reviewedAt: string }>;
};

const requestTypes = [
  ["APPOINTMENT", "Appointment"],
  ["MEDICATION_QUESTION", "Medication question"],
  ["DOCUMENT", "Document"],
  ["BILLING", "Billing"],
  ["OTHER", "Other"]
] as const;

export function PatientPortal() {
  const [mrn, setMrn] = useState("DEMO-1001");
  const [dateOfBirth, setDateOfBirth] = useState("1982-04-12");
  const [email, setEmail] = useState("sara.demo@example.com");
  const [portal, setPortal] = useState<PortalState | null>(null);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);
  const [requestLoading, setRequestLoading] = useState(false);
  const [requestType, setRequestType] = useState("APPOINTMENT");
  const [subject, setSubject] = useState("Schedule my follow-up visit");
  const [body, setBody] = useState("I would like help scheduling the follow-up appointment requested by my doctor.");
  const [preferredContact, setPreferredContact] = useState("");

  useEffect(() => {
    async function loadSession() {
      const response = await fetch("/api/portal/me");
      if (!response.ok) return;
      const payload = await response.json().catch(() => null);
      if (payload?.patient) {
        setPortal(payload as PortalState);
        setMrn(payload.patient.mrn);
        setMessage("Signed in through a secure portal link.");
      }
    }
    void loadSession();
  }, []);

  async function lookup(event: React.FormEvent) {
    event.preventDefault();
    setLoading(true);
    setError("");
    setMessage("");
    const response = await fetch("/api/portal/lookup", {
      method: "POST",
      headers: csrfHeaders({ "Content-Type": "application/json" }),
      body: JSON.stringify({ mrn, dateOfBirth })
    });
    setLoading(false);
    const payload = await response.json().catch(() => null);
    if (!response.ok) {
      setPortal(null);
      setError(payload?.error ?? "Unable to verify portal details.");
      return;
    }
    setPortal(payload as PortalState);
  }

  async function requestMagicLink() {
    setLoading(true);
    setError("");
    setMessage("");
    const response = await fetch("/api/portal/request-link", {
      method: "POST",
      headers: csrfHeaders({ "Content-Type": "application/json" }),
      body: JSON.stringify({ mrn, dateOfBirth, email })
    });
    setLoading(false);
    const payload = await response.json().catch(() => null);
    if (!response.ok) {
      setError(payload?.error ?? "Unable to request portal link.");
      return;
    }
    setMessage(payload?.message ?? "If the details match, a sign-in link has been sent.");
  }

  async function submitRequest(event: React.FormEvent) {
    event.preventDefault();
    if (!portal) return;
    setRequestLoading(true);
    setError("");
    setMessage("");
    const response = await fetch("/api/portal/requests", {
      method: "POST",
      headers: csrfHeaders({ "Content-Type": "application/json" }),
      body: JSON.stringify({
        patientId: portal.patient.id,
        mrn,
        dateOfBirth,
        type: requestType,
        subject,
        message: body,
        preferredContact
      })
    });
    setRequestLoading(false);
    const payload = await response.json().catch(() => null);
    if (!response.ok) {
      setError(payload?.error ?? "Unable to send request.");
      return;
    }
    setMessage("Request sent to the clinic team. A staff member will review it during clinic hours.");
    setSubject("");
    setBody("");
    setPreferredContact("");
  }

  return (
    <div className="portal-screen">
      <header className="portal-topbar">
        <Link className="brand" href="/login" style={{ margin: 0 }}>
          <div className="brand-mark">MP</div>
          <div>
            <p className="brand-title">MediPilot AI</p>
            <p className="brand-subtitle">Patient portal</p>
          </div>
        </Link>
        <Link className="button secondary" href="/login"><LogIn size={17} /> Staff sign in</Link>
      </header>

      <main className="portal-layout">
        <section className="card card-pad">
          <div className="section-head">
            <div>
              <p className="eyebrow">Patient access</p>
              <h1 className="page-title">View clinic updates and message the care team.</h1>
            </div>
            <span className="badge warn">Not for emergencies</span>
          </div>
          <div className="ai-banner">
            <ShieldAlert size={20} />
            <span>This portal does not provide diagnosis or emergency care. AI-supported content is shown only after clinic review. For urgent symptoms, contact emergency services or call the clinic directly.</span>
          </div>
          <form className="form-grid" onSubmit={lookup} style={{ marginTop: 16 }}>
            <div className="form-row">
              <label className="field">
                <span className="label">Medical record number</span>
                <input className="input" value={mrn} onChange={(event) => setMrn(event.target.value)} required />
              </label>
              <label className="field">
                <span className="label">Date of birth</span>
                <input className="input" value={dateOfBirth} onChange={(event) => setDateOfBirth(event.target.value)} type="date" required />
              </label>
            </div>
            <label className="field">
              <span className="label">Email for portal link</span>
              <input className="input" value={email} onChange={(event) => setEmail(event.target.value)} type="email" />
            </label>
            {error ? <div className="badge warn">{error}</div> : null}
            {message ? <div className="badge good">{message}</div> : null}
            <div className="command-actions" style={{ justifyContent: "flex-start" }}>
              <button className="button" disabled={loading} type="submit">
                <LifeBuoy size={18} />
                {loading ? "Verifying..." : "Open demo portal"}
              </button>
              <button className="button secondary" disabled={loading || !email} onClick={requestMagicLink} type="button">
                <Link2 size={18} />
                Send secure link
              </button>
            </div>
          </form>
        </section>

        {portal ? (
          <section className="grid" style={{ gap: 16 }}>
            <section className="command-band">
              <div>
                <p className="eyebrow">{portal.patient.clinicName}</p>
                <h2>{portal.patient.firstName} {portal.patient.lastName}</h2>
                <p>MRN {portal.patient.mrn}. Portal requests are reviewed by clinic staff before action.</p>
              </div>
              <span className="button secondary"><MessageSquareText size={18} /> Secure request flow</span>
            </section>

            <div className="grid dashboard-metrics">
              <PortalMetric title="Upcoming" value={portal.appointments.length} detail="Scheduled appointments" />
              <PortalMetric title="Follow-ups" value={portal.followUps.length} detail="Open clinic follow-ups" tone="green" />
              <PortalMetric title="Documents" value={portal.documents.length} detail="Recent report statuses" />
            </div>

            <div className="grid two-column">
              <PortalList
                icon={<CalendarClock size={19} />}
                title="Upcoming appointments"
                empty="No upcoming appointments are visible in the portal."
                items={portal.appointments.map((appointment) => ({
                  title: appointment.title,
                  detail: `${new Date(appointment.startsAt).toLocaleString()}${appointment.location ? ` | ${appointment.location}` : ""}`,
                  badge: appointment.status
                }))}
              />
              <PortalList
                icon={<CalendarClock size={19} />}
                title="Follow-up instructions"
                empty="No follow-up instructions are currently visible."
                items={portal.followUps.map((followUp) => ({
                  title: followUp.title,
                  detail: followUp.instructions,
                  badge: new Date(followUp.scheduledFor).toLocaleDateString()
                }))}
              />
            </div>

            <div className="grid two-column">
              <PortalList
                icon={<FileText size={19} />}
                title="Documents"
                empty="No recent documents are visible."
                items={portal.documents.map((document) => ({
                  title: document.fileName,
                  detail: `Uploaded ${new Date(document.createdAt).toLocaleDateString()}`,
                  badge: document.status
                }))}
              />
              <PortalList
                icon={<MessageSquareText size={19} />}
                title="Reviewed visit summaries"
                empty="No reviewed visit summaries are currently published."
                items={portal.visitSummaries.map((summary) => ({
                  title: "Clinic-reviewed summary",
                  detail: summary.summary,
                  badge: new Date(summary.reviewedAt).toLocaleDateString()
                }))}
              />
            </div>

            <section className="card card-pad">
              <div className="section-head">
                <h2 className="section-title">Send a clinic request</h2>
                <span className="badge">Staff triage</span>
              </div>
              <form className="form-grid" onSubmit={submitRequest}>
                <div className="form-row">
                  <label className="field">
                    <span className="label">Request type</span>
                    <select className="select" value={requestType} onChange={(event) => setRequestType(event.target.value)}>
                      {requestTypes.map(([value, label]) => <option key={value} value={value}>{label}</option>)}
                    </select>
                  </label>
                  <label className="field">
                    <span className="label">Preferred contact</span>
                    <input className="input" value={preferredContact} onChange={(event) => setPreferredContact(event.target.value)} placeholder="Phone or email" />
                  </label>
                </div>
                <label className="field">
                  <span className="label">Subject</span>
                  <input className="input" value={subject} onChange={(event) => setSubject(event.target.value)} minLength={4} maxLength={120} required />
                </label>
                <label className="field">
                  <span className="label">Message</span>
                  <textarea className="textarea" value={body} onChange={(event) => setBody(event.target.value)} minLength={10} maxLength={2000} required />
                </label>
                <button className="button" disabled={requestLoading} type="submit">
                  <MessageSquareText size={18} />
                  {requestLoading ? "Sending..." : "Send request"}
                </button>
              </form>
            </section>
          </section>
        ) : (
          <section className="empty">Enter the demo MRN and date of birth to open the patient portal workspace.</section>
        )}
      </main>
    </div>
  );
}

function PortalMetric({ title, value, detail, tone = "blue" }: { title: string; value: number; detail: string; tone?: "blue" | "green" }) {
  return (
    <section className={`metric-panel ${tone}`}>
      <p>{title}</p>
      <div><strong>{value}</strong><span>items</span></div>
      <small>{detail}</small>
    </section>
  );
}

function PortalList({
  title,
  icon,
  empty,
  items
}: {
  title: string;
  icon: React.ReactNode;
  empty: string;
  items: Array<{ title: string; detail: string; badge: string }>;
}) {
  return (
    <section className="card card-pad">
      <div className="section-head">
        <h2 className="section-title">{title}</h2>
        {icon}
      </div>
      <div className="timeline-list">
        {items.length ? items.map((item, index) => (
          <div className="timeline-item" key={`${item.title}-${index}`}>
            <div>
              <strong>{item.title}</strong>
              <p className="muted">{item.detail}</p>
            </div>
            <span className="badge">{item.badge}</span>
          </div>
        )) : <div className="empty">{empty}</div>}
      </div>
    </section>
  );
}
