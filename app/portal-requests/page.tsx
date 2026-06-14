import { MessageSquareText } from "lucide-react";
import { AppShell } from "@/components/app-shell";
import { PortalRequestStatusActions } from "@/components/portal-request-status-actions";
import { prisma } from "@/lib/db";
import { getSession } from "@/lib/security/session";

export default async function PortalRequestsPage() {
  const user = await getSession();
  const requests = await prisma.patientPortalRequest.findMany({
    where: { clinicId: user?.clinicId ?? "" },
    include: { patient: { select: { firstName: true, lastName: true, mrn: true, phone: true, email: true } } },
    orderBy: [{ status: "asc" }, { createdAt: "desc" }],
    take: 100
  });
  const openCount = requests.filter((request) => request.status === "NEW" || request.status === "IN_REVIEW").length;
  const resolvedCount = requests.filter((request) => request.status === "RESOLVED" || request.status === "CLOSED").length;

  return (
    <AppShell active="/portal-requests">
      <div className="grid" style={{ gap: 16 }}>
        <section className="command-band">
          <div>
            <p className="eyebrow">Patient portal inbox</p>
            <h2>Patient requests routed into clinic operations.</h2>
            <p>Patients can submit appointment, document, billing, medication, or general requests from the portal. Staff updates are audited.</p>
          </div>
          <div className="command-actions">
            <span className="button secondary"><MessageSquareText size={18} /> {openCount} open</span>
          </div>
        </section>

        <div className="grid dashboard-metrics">
          <Metric title="Open" value={openCount} detail="New or in review" tone={openCount ? "orange" : "green"} />
          <Metric title="Resolved" value={resolvedCount} detail="Completed requests" tone="green" />
          <Metric title="Total" value={requests.length} detail="Recent portal messages" />
        </div>

        <section className="card card-pad">
          <div className="section-head">
            <h2 className="section-title">Portal request queue</h2>
            <span className="badge">{requests.length} requests</span>
          </div>
          {requests.length ? (
            <div className="table-wrap">
              <table>
                <thead><tr><th>Request</th><th>Patient</th><th>Contact</th><th>Status</th><th>Actions</th></tr></thead>
                <tbody>
                  {requests.map((request) => (
                    <tr key={request.id}>
                      <td>
                        <strong>{request.subject}</strong>
                        <br />
                        <span className="badge">{formatType(request.type)}</span>
                        <p className="muted">{request.message}</p>
                        <span className="muted">{request.createdAt.toLocaleString()}</span>
                      </td>
                      <td>{request.patient.firstName} {request.patient.lastName}<br /><span className="muted">{request.patient.mrn}</span></td>
                      <td>{request.preferredContact || request.patient.phone || request.patient.email || "No contact listed"}</td>
                      <td><span className={request.status === "NEW" || request.status === "IN_REVIEW" ? "badge warn" : "badge good"}>{request.status.replace("_", " ")}</span></td>
                      <td><PortalRequestStatusActions requestId={request.id} status={request.status} /></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="empty">No patient portal requests yet. New patient messages will appear here for staff triage.</div>
          )}
        </section>
      </div>
    </AppShell>
  );
}

function formatType(type: string) {
  return type.replaceAll("_", " ").toLowerCase();
}

function Metric({ title, value, detail, tone = "blue" }: { title: string; value: number; detail: string; tone?: "blue" | "green" | "orange" }) {
  return (
    <section className={`metric-panel ${tone}`}>
      <p>{title}</p>
      <div><strong>{value}</strong><span>requests</span></div>
      <small>{detail}</small>
    </section>
  );
}
