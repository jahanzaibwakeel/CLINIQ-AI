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

type ClinicianOption = {
  id: string;
  name: string;
  role: string;
};

export function AppointmentCreateForm({
  patients,
  clinicians
}: {
  patients: PatientOption[];
  clinicians: ClinicianOption[];
}) {
  const router = useRouter();
  const [patientId, setPatientId] = useState(patients[0]?.id ?? "");
  const [clinicianId, setClinicianId] = useState(clinicians[0]?.id ?? "");
  const [title, setTitle] = useState("Clinic visit");
  const [reason, setReason] = useState("");
  const [startsAt, setStartsAt] = useState("");
  const [endsAt, setEndsAt] = useState("");
  const [location, setLocation] = useState("Exam room 1");
  const [notes, setNotes] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    setLoading(true);
    setMessage("");
    setError("");

    const response = await fetch("/api/appointments", {
      method: "POST",
      headers: csrfHeaders({ "Content-Type": "application/json" }),
      body: JSON.stringify({
        patientId,
        clinicianId,
        title,
        reason,
        startsAt: new Date(startsAt).toISOString(),
        endsAt: new Date(endsAt).toISOString(),
        location,
        notes
      })
    });

    setLoading(false);

    if (!response.ok) {
      setError("Could not schedule appointment. Check patient, clinician, and times.");
      return;
    }

    setReason("");
    setStartsAt("");
    setEndsAt("");
    setNotes("");
    setMessage("Appointment scheduled and audit logged.");
    router.refresh();
  }

  return (
    <section className="card card-pad">
      <div className="section-head">
        <h2 className="section-title">Schedule appointment</h2>
        <span className="badge good">Audit logged</span>
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
          <span className="label">Clinician</span>
          <select className="select" required value={clinicianId} onChange={(event) => setClinicianId(event.target.value)}>
            {clinicians.map((clinician) => (
              <option key={clinician.id} value={clinician.id}>
                {clinician.name} - {clinician.role.replace("_", " ")}
              </option>
            ))}
          </select>
        </label>
        <div className="inline-grid">
          <label className="field">
            <span className="label">Starts</span>
            <input className="input" required type="datetime-local" value={startsAt} onChange={(event) => setStartsAt(event.target.value)} />
          </label>
          <label className="field">
            <span className="label">Ends</span>
            <input className="input" required type="datetime-local" value={endsAt} onChange={(event) => setEndsAt(event.target.value)} />
          </label>
        </div>
        <label className="field">
          <span className="label">Title</span>
          <input className="input" required value={title} onChange={(event) => setTitle(event.target.value)} />
        </label>
        <label className="field">
          <span className="label">Reason</span>
          <input className="input" value={reason} onChange={(event) => setReason(event.target.value)} placeholder="Diabetes follow-up, lab review, medication check..." />
        </label>
        <label className="field">
          <span className="label">Location</span>
          <input className="input" value={location} onChange={(event) => setLocation(event.target.value)} />
        </label>
        <label className="field">
          <span className="label">Scheduling notes</span>
          <textarea className="textarea" value={notes} onChange={(event) => setNotes(event.target.value)} placeholder="Prep instructions, interpreter need, documents to bring..." />
        </label>
        <button className="button" disabled={loading || !patientId || !clinicianId} type="submit">
          <CalendarPlus size={18} />
          {loading ? "Scheduling..." : "Schedule appointment"}
        </button>
        {message ? <div className="badge good">{message}</div> : null}
        {error ? <div className="badge warn">{error}</div> : null}
      </form>
    </section>
  );
}
