import { redirect } from "next/navigation";
import { LoginForm } from "@/components/login-form";
import { getSession } from "@/lib/security/session";

export default async function LoginPage() {
  const user = await getSession();
  if (user) redirect("/");

  return (
    <div className="login-screen">
      <section className="login-panel">
        <div className="brand" style={{ marginBottom: 34 }}>
          <div className="brand-mark">MP</div>
          <div>
            <p className="brand-title">MediPilot AI</p>
            <p className="brand-subtitle" style={{ color: "rgba(255,255,255,.8)" }}>Local-first AI for clinical workflow</p>
          </div>
        </div>
        <h1 style={{ maxWidth: 660, fontSize: 46, margin: "0 0 14px", letterSpacing: 0 }}>Doctor productivity without surrendering clinical judgment.</h1>
        <p style={{ maxWidth: 620, fontSize: 18, lineHeight: 1.6 }}>
          Summarize consultations, search patient context, parse reports, and draft follow-up instructions with clear safety review built in.
        </p>
      </section>
      <section className="login-card">
        <LoginForm />
      </section>
    </div>
  );
}
