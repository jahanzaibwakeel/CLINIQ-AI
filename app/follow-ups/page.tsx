import { CalendarClock } from "lucide-react";
import { AppShell } from "@/components/app-shell";
import { FollowUpActions } from "@/components/follow-up-actions";
import { FollowUpCreateForm } from "@/components/follow-up-create-form";
import { prisma } from "@/lib/db";
import { getSession } from "@/lib/security/session";

export default async function FollowUpsPage() {
  const user = await getSession();
  const [followUps, patients] = await Promise.all([
    prisma.followUp.findMany({
      where: { clinicId: user?.clinicId ?? "" },
      include: {
        patient: true,
        owner: true,
        consultation: true
      },
      orderBy: [{ status: "asc" }, { scheduledFor: "asc" }]
    }),
    prisma.patient.findMany({
      where: { clinicId: user?.clinicId ?? "" },
      select: { id: true, firstName: true, lastName: true, mrn: true },
      orderBy: [{ lastName: "asc" }, { firstName: "asc" }]
    })
  ]);

  const scheduled = followUps.filter((followUp) => followUp.status === "SCHEDULED").length;
  const missed = followUps.filter((followUp) => followUp.status === "MISSED").length;
  const completed = followUps.filter((followUp) => followUp.status === "COMPLETED").length;

  return (
    <AppShell active="/follow-ups">
      <div className="grid" style={{ gap: 16 }}>
        <section className="command-band">
          <div>
            <p className="eyebrow">Follow-up operations</p>
            <h2>Track patient callbacks, lab reviews, and missed care loops.</h2>
            <p>Schedule follow-ups, close completed items, and keep the dashboard radar accurate.</p>
          </div>
          <div className="command-actions">
            <span className="button secondary"><CalendarClock size={18} /> {scheduled} scheduled</span>
          </div>
        </section>

        <div className="grid dashboard-metrics">
          <Metric title="Scheduled" value={scheduled} detail="Upcoming patient follow-ups" />
          <Metric title="Missed" value={missed} detail="Needs clinic attention" tone="orange" />
          <Metric title="Completed" value={completed} detail="Closed follow-up loops" tone="green" />
        </div>

        <div className="grid two-column">
          <section className="card card-pad">
            <div className="section-head">
              <h2 className="section-title">Follow-up queue</h2>
              <span className="badge">{followUps.length} total</span>
            </div>
            <div className="table-wrap">
              <table>
                <thead><tr><th>Follow-up</th><th>Patient</th><th>Owner</th><th>When</th><th>Status</th><th>Actions</th></tr></thead>
                <tbody>
                  {followUps.map((followUp) => (
                    <tr key={followUp.id}>
                      <td><strong>{followUp.title}</strong><br /><span className="muted">{followUp.instructions}</span></td>
                      <td>{followUp.patient.firstName} {followUp.patient.lastName}<br /><span className="muted">{followUp.patient.mrn}</span></td>
                      <td>{followUp.owner.name}</td>
                      <td>{followUp.scheduledFor.toLocaleString()}</td>
                      <td><span className={followUp.status === "MISSED" ? "badge warn" : "badge"}>{followUp.status}</span></td>
                      <td><FollowUpActions followUpId={followUp.id} status={followUp.status} /></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
          <FollowUpCreateForm patients={patients} />
        </div>
      </div>
    </AppShell>
  );
}

function Metric({ title, value, detail, tone = "blue" }: { title: string; value: number; detail: string; tone?: "blue" | "green" | "orange" }) {
  return (
    <section className={`metric-panel ${tone}`}>
      <p>{title}</p>
      <div><strong>{value}</strong><span>items</span></div>
      <small>{detail}</small>
    </section>
  );
}
