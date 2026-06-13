"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Eye, EyeOff, LogIn } from "lucide-react";
import { csrfHeaders } from "@/lib/client/csrf";

export function LoginForm() {
  const router = useRouter();
  const [email, setEmail] = useState("doctor@medipilot.local");
  const [password, setPassword] = useState("DemoPassword123!");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [resetMessage, setResetMessage] = useState("");
  const [loading, setLoading] = useState(false);
  const [resetLoading, setResetLoading] = useState(false);

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    setLoading(true);
    setError("");
    const response = await fetch("/api/auth/login", {
      method: "POST",
      headers: csrfHeaders({ "Content-Type": "application/json" }),
      body: JSON.stringify({ email, password })
    });
    setLoading(false);
    if (!response.ok) {
      const payload = await response.json().catch(() => null) as { error?: string } | null;
      setError(payload?.error ?? "Unable to sign in. Check the demo credentials or seeded users.");
      return;
    }
    router.push("/");
    router.refresh();
  }

  async function requestReset() {
    setResetLoading(true);
    setError("");
    setResetMessage("");
    const response = await fetch("/api/auth/request-password-reset", {
      method: "POST",
      headers: csrfHeaders({ "Content-Type": "application/json" }),
      body: JSON.stringify({ email })
    });
    setResetLoading(false);
    const payload = await response.json().catch(() => null) as { message?: string } | null;
    setResetMessage(payload?.message ?? "If that account exists, password reset instructions have been sent.");
  }

  return (
    <form className="form-grid" onSubmit={submit}>
      <div>
        <h1 className="login-title">Sign in</h1>
        <p className="muted">Use the seeded doctor, admin, or assistant account.</p>
      </div>
      <label className="field">
        <span className="label">Email</span>
        <input className="input" value={email} onChange={(event) => setEmail(event.target.value)} type="email" required />
      </label>
      <label className="field">
        <span className="label">Password</span>
        <div className="password-field">
          <input className="input" value={password} onChange={(event) => setPassword(event.target.value)} type={showPassword ? "text" : "password"} required />
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
      {resetMessage ? <div className="badge good">{resetMessage}</div> : null}
      <button className="button" disabled={loading} type="submit">
        <LogIn size={18} />
        {loading ? "Signing in..." : "Sign in"}
      </button>
      <button className="button secondary" disabled={resetLoading || !email} onClick={requestReset} type="button">
        {resetLoading ? "Sending..." : "Forgot password"}
      </button>
      <p className="muted" style={{ fontSize: 13 }}>
        Demo password: DemoPassword123!
      </p>
    </form>
  );
}
