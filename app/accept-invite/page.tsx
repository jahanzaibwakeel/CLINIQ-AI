import { SetPasswordForm } from "@/components/set-password-form";

export default async function AcceptInvitePage({ searchParams }: { searchParams: Promise<{ token?: string }> }) {
  const params = await searchParams;

  return (
    <div className="login-screen">
      <section className="login-panel">
        <div className="brand" style={{ marginBottom: 34 }}>
          <div className="brand-mark">MP</div>
          <div>
            <p className="brand-title">MediPilot AI</p>
            <p className="brand-subtitle" style={{ color: "rgba(255,255,255,.8)" }}>Clinic staff invitation</p>
          </div>
        </div>
        <h1 style={{ maxWidth: 660, fontSize: 46, margin: "0 0 14px", letterSpacing: 0 }}>Set up your clinical workflow account.</h1>
        <p style={{ maxWidth: 620, fontSize: 18, lineHeight: 1.6 }}>
          Your clinic admin invited you to collaborate on patients, tasks, documents, and reviewed AI drafts.
        </p>
      </section>
      <section className="login-card">
        <SetPasswordForm mode="invite" token={params.token ?? ""} />
      </section>
    </div>
  );
}
