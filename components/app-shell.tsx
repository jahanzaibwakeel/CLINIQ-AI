import Link from "next/link";
import { redirect } from "next/navigation";
import {
  Activity,
  Bell,
  Bot,
  CalendarClock,
  ClipboardList,
  FileText,
  LayoutDashboard,
  CheckSquare,
  MessageSquareText,
  UserCog,
  ShieldCheck,
  Settings,
  Stethoscope,
  Users,
  CalendarCheck
} from "lucide-react";
import { Role } from "@prisma/client";
import { getSession } from "@/lib/security/session";
import { LogoutButton } from "@/components/logout-button";

const nav = [
  { href: "/", label: "Dashboard", icon: LayoutDashboard, roles: [Role.DOCTOR, Role.CLINIC_ADMIN, Role.ASSISTANT] },
  { href: "/inbox", label: "Inbox", icon: Bell, roles: [Role.DOCTOR, Role.CLINIC_ADMIN, Role.ASSISTANT] },
  { href: "/patients", label: "Patients", icon: Users, roles: [Role.DOCTOR, Role.CLINIC_ADMIN, Role.ASSISTANT] },
  { href: "/schedule", label: "Schedule", icon: CalendarCheck, roles: [Role.DOCTOR, Role.CLINIC_ADMIN, Role.ASSISTANT] },
  { href: "/consultations", label: "Consultations", icon: Stethoscope, roles: [Role.DOCTOR, Role.CLINIC_ADMIN] },
  { href: "/documents", label: "Documents", icon: FileText, roles: [Role.DOCTOR, Role.CLINIC_ADMIN, Role.ASSISTANT] },
  { href: "/staff", label: "Staff", icon: UserCog, roles: [Role.CLINIC_ADMIN] },
  { href: "/assistant", label: "AI Assistant", icon: Bot, roles: [Role.DOCTOR, Role.CLINIC_ADMIN] },
  { href: "/ai-review", label: "AI Review", icon: CheckSquare, roles: [Role.DOCTOR, Role.CLINIC_ADMIN] },
  { href: "/tasks", label: "Tasks", icon: ClipboardList, roles: [Role.DOCTOR, Role.CLINIC_ADMIN, Role.ASSISTANT] },
  { href: "/follow-ups", label: "Follow-ups", icon: CalendarClock, roles: [Role.DOCTOR, Role.CLINIC_ADMIN, Role.ASSISTANT] },
  { href: "/portal-requests", label: "Portal", icon: MessageSquareText, roles: [Role.DOCTOR, Role.CLINIC_ADMIN, Role.ASSISTANT] },
  { href: "/ops", label: "Ops", icon: Activity, roles: [Role.CLINIC_ADMIN] },
  { href: "/audit", label: "Audit", icon: ShieldCheck, roles: [Role.CLINIC_ADMIN] },
  { href: "/settings", label: "Settings", icon: Settings, roles: [Role.DOCTOR, Role.CLINIC_ADMIN] }
];

export async function AppShell({ children, active = "/" }: { children: React.ReactNode; active?: string }) {
  const user = await getSession();
  if (!user) redirect("/login");
  const visibleNav = nav.filter((item) => item.roles.includes(user.role));
  const activeLabel = active === "/" ? `${user.role === Role.ASSISTANT ? "Assistant" : user.role === Role.CLINIC_ADMIN ? "Admin" : "Doctor"} Dashboard` : visibleNav.find((n) => n.href === active)?.label;

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <div className="brand">
          <div className="brand-mark">
            <CalendarCheck size={23} />
          </div>
          <div>
            <p className="brand-title">CLINIK AI</p>
            <p className="brand-subtitle">Clinical workflow copilot</p>
          </div>
        </div>
        <nav className="nav-list" aria-label="Main navigation">
          {visibleNav.map((item) => {
            const Icon = item.icon;
            const isActive = active === item.href;
            return (
              <Link className={`nav-item ${isActive ? "active" : ""}`} href={item.href} key={item.href}>
                <Icon size={18} />
                <span>{item.label}</span>
              </Link>
            );
          })}
        </nav>
        <div className="sidebar-footer">
          <strong>Safety:</strong> AI output is not a diagnostic replacement. Every result is an AI draft and requires doctor review.
        </div>
      </aside>
      <main className="main">
        <div className="topbar">
          <div>
            <p className="eyebrow">Riverside Family Clinic</p>
            <h1 className="page-title">{activeLabel}</h1>
          </div>
          <div className="user-pill">
            <div className="avatar">{user.name.slice(0, 1)}</div>
            <div>
              <strong>{user.name}</strong>
              <div className="muted" style={{ fontSize: 12 }}>{user.role.replace("_", " ").toLowerCase()}</div>
            </div>
            <LogoutButton />
          </div>
        </div>
        {children}
      </main>
    </div>
  );
}
