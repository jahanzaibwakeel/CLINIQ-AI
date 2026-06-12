"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { UserPlus } from "lucide-react";
import { csrfHeaders } from "@/lib/client/csrf";

function splitList(value: string) {
  return value
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
}

export function PatientCreateForm() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [form, setForm] = useState({
    firstName: "",
    lastName: "",
    dateOfBirth: "",
    sex: "Female",
    phone: "",
    email: "",
    mrn: "",
    allergies: "",
    medications: "",
    conditions: ""
  });

  function update(field: keyof typeof form, value: string) {
    setForm((current) => ({ ...current, [field]: value }));
  }

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    setLoading(true);
    setMessage("");
    setError("");

    const response = await fetch("/api/patients", {
      method: "POST",
      headers: csrfHeaders({ "Content-Type": "application/json" }),
      body: JSON.stringify({
        firstName: form.firstName,
        lastName: form.lastName,
        dateOfBirth: form.dateOfBirth,
        sex: form.sex,
        phone: form.phone || undefined,
        email: form.email || undefined,
        mrn: form.mrn,
        allergies: splitList(form.allergies),
        medications: splitList(form.medications),
        conditions: splitList(form.conditions)
      })
    });

    setLoading(false);

    if (!response.ok) {
      setError("Could not create patient. Check required fields and unique MRN.");
      return;
    }

    setForm({
      firstName: "",
      lastName: "",
      dateOfBirth: "",
      sex: "Female",
      phone: "",
      email: "",
      mrn: "",
      allergies: "",
      medications: "",
      conditions: ""
    });
    setMessage("Patient created and audit logged.");
    router.refresh();
  }

  return (
    <section className="card card-pad">
      <div className="section-head">
        <h2 className="section-title">Create patient</h2>
        <span className="badge good">RBAC protected</span>
      </div>
      <form className="form-grid" onSubmit={submit}>
        <div className="inline-grid">
          <label className="field">
            <span className="label">First name</span>
            <input className="input" required value={form.firstName} onChange={(event) => update("firstName", event.target.value)} />
          </label>
          <label className="field">
            <span className="label">Last name</span>
            <input className="input" required value={form.lastName} onChange={(event) => update("lastName", event.target.value)} />
          </label>
        </div>
        <div className="inline-grid">
          <label className="field">
            <span className="label">Date of birth</span>
            <input className="input" required type="date" value={form.dateOfBirth} onChange={(event) => update("dateOfBirth", event.target.value)} />
          </label>
          <label className="field">
            <span className="label">Sex</span>
            <select className="select" value={form.sex} onChange={(event) => update("sex", event.target.value)}>
              <option>Female</option>
              <option>Male</option>
              <option>Other</option>
              <option>Not specified</option>
            </select>
          </label>
        </div>
        <div className="inline-grid">
          <label className="field">
            <span className="label">MRN</span>
            <input className="input" required value={form.mrn} onChange={(event) => update("mrn", event.target.value)} placeholder="DEMO-2001" />
          </label>
          <label className="field">
            <span className="label">Phone</span>
            <input className="input" value={form.phone} onChange={(event) => update("phone", event.target.value)} />
          </label>
        </div>
        <label className="field">
          <span className="label">Email</span>
          <input className="input" type="email" value={form.email} onChange={(event) => update("email", event.target.value)} />
        </label>
        <label className="field">
          <span className="label">Conditions</span>
          <input className="input" value={form.conditions} onChange={(event) => update("conditions", event.target.value)} placeholder="Diabetes, hypertension" />
        </label>
        <label className="field">
          <span className="label">Medications</span>
          <input className="input" value={form.medications} onChange={(event) => update("medications", event.target.value)} placeholder="Metformin 500 mg BID" />
        </label>
        <label className="field">
          <span className="label">Allergies</span>
          <input className="input" value={form.allergies} onChange={(event) => update("allergies", event.target.value)} placeholder="Penicillin" />
        </label>
        <button className="button" disabled={loading} type="submit">
          <UserPlus size={18} />
          {loading ? "Creating..." : "Create patient"}
        </button>
        {message ? <div className="badge good">{message}</div> : null}
        {error ? <div className="badge warn">{error}</div> : null}
      </form>
    </section>
  );
}
