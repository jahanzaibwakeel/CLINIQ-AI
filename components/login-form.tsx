"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { LogIn } from "lucide-react";
import { csrfHeaders } from "@/lib/client/csrf";

export function LoginForm() {
  const router = useRouter();
  const [email, setEmail] = useState("doctor@medipilot.local");
  const [password, setPassword] = useState("DemoPassword123!");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

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
      setError("Unable to sign in. Check the demo credentials or seeded users.");
      return;
    }
    router.push("/");
    router.refresh();
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
        <input className="input" value={password} onChange={(event) => setPassword(event.target.value)} type="password" required />
      </label>
      {error ? <div className="badge warn">{error}</div> : null}
      <button className="button" disabled={loading} type="submit">
        <LogIn size={18} />
        {loading ? "Signing in..." : "Sign in"}
      </button>
      <p className="muted" style={{ fontSize: 13 }}>
        Demo password: DemoPassword123!
      </p>
    </form>
  );
}
