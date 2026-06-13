"use client";

import { useEffect, useState } from "react";

type RuntimeStatus = {
  provider: string;
  status: "ready" | "model_missing" | "unreachable" | "external_disabled" | "configured" | "fallback";
  model: string;
  message: string;
};

function copyFor(status: RuntimeStatus | null) {
  if (!status) return { className: "badge", label: "AI checking" };
  if (status.status === "ready") return { className: "badge good", label: `AI ready: ${status.provider}` };
  if (status.status === "configured") return { className: "badge warn", label: `AI external: ${status.provider}` };
  if (status.status === "model_missing") return { className: "badge warn", label: "AI model missing" };
  if (status.status === "unreachable") return { className: "badge warn", label: "AI offline" };
  return { className: "badge warn", label: "AI fallback" };
}

export function AiRuntimeBadge() {
  const [status, setStatus] = useState<RuntimeStatus | null>(null);

  useEffect(() => {
    let active = true;

    fetch("/api/ai/status")
      .then((response) => (response.ok ? response.json() : null))
      .then((payload: RuntimeStatus | null) => {
        if (active && payload) setStatus(payload);
      })
      .catch(() => {
        if (active) {
          setStatus({
            provider: "fallback",
            status: "unreachable",
            model: "unknown",
            message: "AI status check failed."
          });
        }
      });

    return () => {
      active = false;
    };
  }, []);

  const badge = copyFor(status);
  return (
    <span className={badge.className} title={status ? `${status.model} - ${status.message}` : "Checking configured AI runtime"}>
      {badge.label}
    </span>
  );
}
