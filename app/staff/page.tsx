import { Role } from "@prisma/client";
import { redirect } from "next/navigation";
import { LockKeyhole, ShieldCheck, UserCog, Users } from "lucide-react";
import { AppShell } from "@/components/app-shell";
import { prisma } from "@/lib/db";
import { getSession } from "@/lib/security/session";
import { isAccountLocked } from "@/lib/security/login-policy";

export default async function StaffPage() {
  const user = await getSession();
  if (!user) redirect("/login");
  if (user.role !== Role.CLINIC_ADMIN) redirect("/");

  const staff = await prisma.user.findMany({
    where: { clinicId: user.clinicId },
    orderBy: [{ role: "asc" }, { name: "asc" }]
  });

  const lockedAccounts = staff.filter((member) => isAccountLocked(member.lockedUntil)).length;
  const inactiveAccounts = staff.filter((member) => !member.isActive).length;
  const roleCounts = staff.reduce<Record<string, number>>((counts, member) => {
    counts[member.role] = (counts[member.role] ?? 0) + 1;
    return counts;
  }, {});

  return (
    <AppShell active="/staff">
      <div className="grid" style={{ gap: 16 }}>
        <section className="command-band">
          <div>
            <p className="eyebrow">Clinic access control</p>
            <h2>Staff roles, account health, and login security.</h2>
            <p>Clinic admins can review role coverage, disabled users, temporary lockouts, and recent access state before production rollout.</p>
          </div>
          <div className="command-actions">
            <span className="button secondary">
              <ShieldCheck size={18} />
              Admin managed
            </span>
          </div>
        </section>

        <div className="grid dashboard-metrics">
          <StaffMetric title="Staff accounts" value={staff.length} label="users" detail="All users scoped to this clinic" tone="blue" />
          <StaffMetric title="Locked accounts" value={lockedAccounts} label="users" detail="Temporary lockouts after failed login attempts" tone={lockedAccounts ? "orange" : "green"} />
          <StaffMetric title="Inactive accounts" value={inactiveAccounts} label="users" detail="Disabled users cannot sign in" tone={inactiveAccounts ? "orange" : "green"} />
        </div>

        <div className="grid two-column">
          <section className="card card-pad">
            <div className="section-head">
              <h2 className="section-title">Role coverage</h2>
              <Users size={19} />
            </div>
            <div className="chart-bars">
              {[Role.DOCTOR, Role.CLINIC_ADMIN, Role.ASSISTANT].map((role) => {
                const count = roleCounts[role] ?? 0;
                return (
                  <div className="bar-row" key={role}>
                    <span>{role.replace("_", " ")}</span>
                    <span className="bar-track"><span className="bar-fill" style={{ width: `${Math.max(10, count * 24)}%` }} /></span>
                    <strong>{count}</strong>
                  </div>
                );
              })}
            </div>
          </section>

          <section className="card card-pad">
            <div className="section-head">
              <h2 className="section-title">Security posture</h2>
              <LockKeyhole size={19} />
            </div>
            <div className="timeline-list">
              <SecurityPosture title="Least privilege" detail="Navigation and server routes are role scoped." good />
              <SecurityPosture title="Login lockout" detail="Five failed attempts temporarily lock a known account." good />
              <SecurityPosture title="Session expiry" detail="Signed HTTP-only sessions expire after eight hours." good />
            </div>
          </section>
        </div>

        <section className="card card-pad">
          <div className="section-head">
            <h2 className="section-title">Staff directory</h2>
            <span className="badge">{staff.length} accounts</span>
          </div>
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>User</th>
                  <th>Role</th>
                  <th>Status</th>
                  <th>Failed logins</th>
                  <th>Last login</th>
                  <th>Lock state</th>
                </tr>
              </thead>
              <tbody>
                {staff.map((member) => {
                  const locked = isAccountLocked(member.lockedUntil);
                  return (
                    <tr key={member.id}>
                      <td><strong>{member.name}</strong><br /><span className="muted">{member.email}</span></td>
                      <td><span className="badge">{member.role.replace("_", " ")}</span><br /><span className="muted">{member.title ?? "No title"}</span></td>
                      <td><span className={member.isActive ? "badge good" : "badge warn"}>{member.isActive ? "Active" : "Inactive"}</span></td>
                      <td>{member.failedLoginCount}</td>
                      <td>{member.lastLoginAt ? member.lastLoginAt.toLocaleString() : "No login recorded"}</td>
                      <td><span className={locked ? "badge warn" : "badge good"}>{locked ? `Locked until ${member.lockedUntil?.toLocaleTimeString()}` : "Clear"}</span></td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </section>

        <section className="ai-banner">
          <UserCog size={18} />
          <span>Staff management is intentionally audit-first in this portfolio build. Production deployments should add invite flows, password reset, and MFA before real clinic use.</span>
        </section>
      </div>
    </AppShell>
  );
}

function StaffMetric({
  title,
  value,
  label,
  detail,
  tone
}: {
  title: string;
  value: number;
  label: string;
  detail: string;
  tone: "blue" | "green" | "orange";
}) {
  return (
    <section className={`metric-panel ${tone}`}>
      <p>{title}</p>
      <div>
        <strong>{value}</strong>
        <span>{label}</span>
      </div>
      <small>{detail}</small>
    </section>
  );
}

function SecurityPosture({ title, detail, good }: { title: string; detail: string; good: boolean }) {
  return (
    <div className="timeline-item">
      <div>
        <strong>{title}</strong>
        <p className="muted">{detail}</p>
      </div>
      <span className={good ? "badge good" : "badge warn"}>{good ? "Enabled" : "Review"}</span>
    </div>
  );
}
