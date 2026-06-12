"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Stethoscope } from "lucide-react";
import { csrfHeaders } from "@/lib/client/csrf";

type PatientOption = {
  id: string;
  firstName: string;
  lastName: string;
  mrn: string;
};

export function ConsultationCreateForm({ patients }: { patients: PatientOption[] }) {
  const router = useRouter();
  const [patientId, setPatientId] = useState(patients[0]?.id ?? "");
  const [reason, setReason] = useState("");
  const [rawNotes, setRawNotes] = useState("");
  const [startedAt, setStartedAt] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    setLoading(true);
    setMessage("");
    setError("");

    const response = await fetch("/api/consultations", {
      method: "POST",
      headers: csrfHeaders({ "Content-Type": "application/json" }),
      body: JSON.stringify({
        patientId,
        reason,
        rawNotes,
        startedAt: startedAt ? new Date(startedAt).toISOString() : undefined
      })
    });

    setLoading(false);

    if (!response.ok) {
      setError("Could not create consultation. Doctors can create consultations; check note length and patient selection.");
      return;
    }

    setReason("");
    setRawNotes("");
    setStartedAt("");
    setMessage("Consultation draft created and audit logged.");
    router.refresh();
  }

  return (
    <section className="card card-pad">
      <div className="section-head">
        <h2 className="section-title">New consultation</h2>
        <span className="badge good">AI-ready notes</span>
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
          <span className="label">Reason</span>
          <input className="input" required value={reason} onChange={(event) => setReason(event.target.value)} placeholder="Diabetes follow-up" />
        </label>
        <label className="field">
          <span className="label">Started at</span>
          <input className="input" type="datetime-local" value={startedAt} onChange={(event) => setStartedAt(event.target.value)} />
        </label>
        <label className="field">
          <span className="label">Doctor notes or bullets</span>
          <textarea
            className="textarea"
            required
            value={rawNotes}
            onChange={(event) => setRawNotes(event.target.value)}
            placeholder={"- fatigue 3 weeks\n- glucose 160-190\n- ordered HbA1c and urine ACR"}
          />
        </label>
        <button className="button" disabled={loading || !patientId} type="submit">
          <Stethoscope size={18} />
          {loading ? "Creating..." : "Create consultation"}
        </button>
        {message ? <div className="badge good">{message}</div> : null}
        {error ? <div className="badge warn">{error}</div> : null}
      </form>
    </section>
  );
}
