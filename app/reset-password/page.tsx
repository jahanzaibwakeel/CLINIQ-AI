import { SetPasswordForm } from "@/components/set-password-form";

export default function ResetPasswordPage({ searchParams }: { searchParams: { token?: string } }) {
  return (
    <div className="login-screen">
      <section className="login-panel">
        <div className="brand" style={{ marginBottom: 34 }}>
          <div className="brand-mark">MP</div>
          <div>
            <p className="brand-title">MediPilot AI</p>
            <p className="brand-subtitle" style={{ color: "rgba(255,255,255,.8)" }}>Secure account recovery</p>
          </div>
        </div>
        <h1 style={{ maxWidth: 660, fontSize: 46, margin: "0 0 14px", letterSpacing: 0 }}>Return to the clinic dashboard with a fresh password.</h1>
        <p style={{ maxWidth: 620, fontSize: 18, lineHeight: 1.6 }}>
          Password reset links are time-limited, single-use, and audited for clinic security.
        </p>
      </section>
      <section className="login-card">
        <SetPasswordForm mode="reset" token={searchParams.token ?? ""} />
      </section>
    </div>
  );
}
