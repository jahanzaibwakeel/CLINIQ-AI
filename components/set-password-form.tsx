"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Eye, EyeOff, KeyRound } from "lucide-react";
import { csrfHeaders } from "@/lib/client/csrf";

export function SetPasswordForm({
  token,
  mode
}: {
  token: string;
  mode: "reset" | "invite";
}) {
  const router = useRouter();
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    setLoading(true);
    setError("");
    setMessage("");

    const response = await fetch(mode === "reset" ? "/api/auth/reset-password" : "/api/auth/accept-invite", {
      method: "POST",
      headers: csrfHeaders({ "Content-Type": "application/json" }),
      body: JSON.stringify({ token, password })
    });

    setLoading(false);
    if (!response.ok) {
      const payload = await response.json().catch(() => null) as { error?: string; issues?: { fieldErrors?: Record<string, string[]> } } | null;
      const fieldError = payload?.issues?.fieldErrors?.password?.[0];
      setError(fieldError ?? payload?.error ?? "Unable to update password.");
      return;
    }

    setMessage(mode === "reset" ? "Password updated. You can sign in now." : "Account set up. You can sign in now.");
    setTimeout(() => router.push("/login"), 900);
  }

  return (
    <form className="form-grid" onSubmit={submit}>
      <div>
        <h1 className="login-title">{mode === "reset" ? "Reset password" : "Set up account"}</h1>
        <p className="muted">Use at least 12 characters with uppercase, lowercase, and a number.</p>
      </div>
      <label className="field">
        <span className="label">New password</span>
        <div className="password-field">
          <input
            className="input"
            minLength={12}
            onChange={(event) => setPassword(event.target.value)}
            required
            type={showPassword ? "text" : "password"}
            value={password}
          />
          <button
            aria-label={showPassword ? "Hide password" : "Show password"}
            className="icon-button"
            onClick={() => setShowPassword((value) => !value)}
            type="button"
          >
            {showPassword ? <EyeOff size={17} /> : <Eye size={17} />}
          </button>
        </div>
      </label>
      {error ? <div className="badge warn">{error}</div> : null}
      {message ? <div className="badge good">{message}</div> : null}
      <button className="button" disabled={loading || !token} type="submit">
        <KeyRound size={18} />
        {loading ? "Saving..." : "Save password"}
      </button>
    </form>
  );
}
