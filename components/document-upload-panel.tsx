"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { FileUp, Loader2, ShieldCheck } from "lucide-react";
import { csrfHeaders } from "@/lib/client/csrf";

type PatientOption = {
  id: string;
  firstName: string;
  lastName: string;
  mrn: string;
};

type UploadState = "idle" | "reading" | "uploading" | "processing" | "complete" | "error";

const readableMimeTypes = new Set([
  "text/plain",
  "text/csv",
  "text/markdown",
  "application/json",
  "application/xml",
  "text/xml"
]);

export function DocumentUploadPanel({ patients }: { patients: PatientOption[] }) {
  const router = useRouter();
  const [patientId, setPatientId] = useState(patients[0]?.id ?? "");
  const [fileName, setFileName] = useState("");
  const [mimeType, setMimeType] = useState("text/plain");
  const [extractedText, setExtractedText] = useState("");
  const [state, setState] = useState<UploadState>("idle");
  const [message, setMessage] = useState("");

  const canUpload = useMemo(
    () => patientId && fileName.trim().length > 0 && extractedText.trim().length >= 5 && state !== "uploading" && state !== "processing",
    [extractedText, fileName, patientId, state]
  );

  async function readFile(file: File) {
    setState("reading");
    setMessage("");
    setFileName(file.name);
    setMimeType(file.type || "text/plain");

    if (file.size > 1024 * 1024) {
      setState("error");
      setMessage("For this demo workflow, upload text reports under 1 MB.");
      return;
    }

    if (file.type && !readableMimeTypes.has(file.type)) {
      setState("error");
      setMessage("This local demo reads text-based reports. Paste extracted text for PDFs or images.");
      return;
    }

    const text = await file.text();
    setExtractedText(text);
    setState("idle");
  }

  async function upload() {
    setState("uploading");
    setMessage("Uploading document and creating the clinical record...");

    const response = await fetch("/api/documents", {
      method: "POST",
      headers: csrfHeaders({ "Content-Type": "application/json" }),
      body: JSON.stringify({
        patientId,
        fileName: fileName.trim(),
        mimeType,
        extractedText
      })
    });

    if (!response.ok) {
      setState("error");
      setMessage("Upload failed. Check the selected patient and extracted text.");
      return;
    }

    setState("processing");
    setMessage("Document processed, chunked, embedded, and added to semantic search.");
    setState("complete");
    router.refresh();
  }

  return (
    <section className="card card-pad">
      <div className="section-head">
        <h2 className="section-title">Upload clinical document</h2>
        <span className="badge warn">Local text extraction</span>
      </div>
      <div className="form-grid">
        <label className="field">
          <span className="label">Patient</span>
          <select className="select" value={patientId} onChange={(event) => setPatientId(event.target.value)}>
            {patients.map((patient) => (
              <option key={patient.id} value={patient.id}>
                {patient.firstName} {patient.lastName} - {patient.mrn}
              </option>
            ))}
          </select>
        </label>
        <label className="field">
          <span className="label">Report file</span>
          <input
            className="input"
            type="file"
            accept=".txt,.csv,.md,.json,.xml,text/plain,text/csv,application/json,application/xml,text/xml"
            onChange={(event) => {
              const file = event.target.files?.[0];
              if (file) void readFile(file);
            }}
          />
        </label>
        <label className="field">
          <span className="label">File name</span>
          <input className="input" value={fileName} onChange={(event) => setFileName(event.target.value)} placeholder="lab-report.txt" />
        </label>
        <label className="field">
          <span className="label">Extracted text preview</span>
          <textarea
            className="textarea"
            value={extractedText}
            onChange={(event) => setExtractedText(event.target.value)}
            placeholder="Paste extracted report text here when uploading a PDF/image outside this local demo."
          />
        </label>
        <button className="button" disabled={!canUpload} onClick={upload} type="button">
          {state === "uploading" || state === "processing" || state === "reading" ? <Loader2 size={18} /> : <FileUp size={18} />}
          {state === "reading" ? "Reading file..." : state === "uploading" ? "Uploading..." : state === "processing" ? "Processing..." : "Upload and process"}
        </button>
        {message ? (
          <div className={state === "error" ? "badge warn" : "ai-banner"}>
            {state !== "error" ? <ShieldCheck size={18} /> : null}
            <span>{message}</span>
          </div>
        ) : null}
      </div>
    </section>
  );
}
