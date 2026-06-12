"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { CalendarPlus } from "lucide-react";
import { csrfHeaders } from "@/lib/client/csrf";

type PatientOption = {
  id: string;
  firstName: string;
  lastName: string;
  mrn: string;
};

export function FollowUpCreateForm({ patients }: { patients: PatientOption[] }) {
  const router = useRouter();
  const [patientId, setPatientId] = useState(patients[0]?.id ?? "");
  const [title, setTitle] = useState("");
  const [instructions, setInstructions] = useState("");
  const [scheduledFor, setScheduledFor] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    setLoading(true);
    setMessage("");
    setError("");

    const response = await fetch("/api/follow-ups", {
      method: "POST",
      headers: csrfHeaders({ "Content-Type": "application/json" }),
      body: JSON.stringify({
        patientId,
        title,
        instructions,
        scheduledFor: new Date(scheduledFor).toISOString()
      })
    });

    setLoading(false);

    if (!response.ok) {
      setError("Could not schedule follow-up. Check patient, date, and instructions.");
      return;
    }

    setTitle("");
    setInstructions("");
    setScheduledFor("");
    setMessage("Follow-up scheduled and audit logged.");
    router.refresh();
  }

  return (
    <section className="card card-pad">
      <div className="section-head">
        <h2 className="section-title">Schedule follow-up</h2>
        <span className="badge good">Workflow tracked</span>
      </div>
      <form className="form-grid" onSubmit={submit}>
        <label className="field">
          <span className="label">Patient</span>
          <select className="select" required value={patientId} onChange={(event) => setPatientId(event.target.value)}>
            {patients.map((patient) => (
              <option key={patient.id} value={patient.id}>
                {patient.firstName} {patient.lastName} - {patient.mrn}
              </option>
            ))}
          </select>
        </label>
        <label className="field">
          <span className="label">Title</span>
          <input className="input" required value={title} onChange={(event) => setTitle(event.target.value)} placeholder="Lab review" />
        </label>
        <label className="field">
          <span className="label">Scheduled for</span>
          <input className="input" required type="datetime-local" value={scheduledFor} onChange={(event) => setScheduledFor(event.target.value)} />
        </label>
        <label className="field">
          <span className="label">Instructions</span>
          <textarea className="textarea" required value={instructions} onChange={(event) => setInstructions(event.target.value)} placeholder="Review HbA1c, kidney screen, medication adherence, and symptoms." />
        </label>
        <button className="button" disabled={loading || !patientId} type="submit">
          <CalendarPlus size={18} />
          {loading ? "Scheduling..." : "Schedule follow-up"}
        </button>
        {message ? <div className="badge good">{message}</div> : null}
        {error ? <div className="badge warn">{error}</div> : null}
      </form>
    </section>
  );
}
