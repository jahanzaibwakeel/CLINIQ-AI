"use client";

import { useMemo, useState } from "react";
import { Download, ShieldCheck } from "lucide-react";

export function PatientExportButton({ patientId }: { patientId: string }) {
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState("");
  const [redacted, setRedacted] = useState(true);

  const href = useMemo(() => {
    const params = new URLSearchParams({
      reason,
      redacted: String(redacted)
    });
    return `/api/patients/${patientId}/export?${params.toString()}`;
  }, [patientId, reason, redacted]);

  return (
    <div className="export-control">
      <button className="button secondary" onClick={() => setOpen((value) => !value)} type="button">
        <Download size={16} />
        Export chart
      </button>
      {open ? (
        <div className="export-panel">
          <div className="ai-banner">
            <ShieldCheck size={16} />
            <span>Exports are audited. Use redacted mode for demos and only export identifiable data when approved.</span>
          </div>
          <label className="field">
            <span className="label">Export reason</span>
            <input className="input" value={reason} onChange={(event) => setReason(event.target.value)} placeholder="Care coordination review" />
          </label>
          <label className="checkbox-row">
            <input checked={redacted} onChange={(event) => setRedacted(event.target.checked)} type="checkbox" />
            <span>Redact direct contact details</span>
          </label>
          <a className={`button ${reason.trim().length < 8 ? "disabled-link" : ""}`} href={reason.trim().length >= 8 ? href : "#"} onClick={(event) => {
            if (reason.trim().length < 8) event.preventDefault();
          }}>
            <Download size={16} />
            Download JSON
          </a>
        </div>
      ) : null}
    </div>
  );
}
