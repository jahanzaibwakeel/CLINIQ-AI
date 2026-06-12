import Link from "next/link";
import { redirect } from "next/navigation";
import {
  Bot,
  CalendarClock,
  ClipboardList,
  FileText,
  LayoutDashboard,
  CheckSquare,
  ShieldCheck,
  Settings,
  Stethoscope,
  Users,
  CalendarCheck
} from "lucide-react";
import { getSession } from "@/lib/security/session";
import { LogoutButton } from "@/components/logout-button";

const nav = [
  { href: "/", label: "Dashboard", icon: LayoutDashboard },
  { href: "/patients", label: "Patients", icon: Users },
  { href: "/consultations", label: "Consultations", icon: Stethoscope },
  { href: "/documents", label: "Documents", icon: FileText },
  { href: "/assistant", label: "AI Assistant", icon: Bot },
  { href: "/ai-review", label: "AI Review", icon: CheckSquare },
  { href: "/tasks", label: "Tasks", icon: ClipboardList },
  { href: "/follow-ups", label: "Follow-ups", icon: CalendarClock },
  { href: "/audit", label: "Audit", icon: ShieldCheck },
  { href: "/settings", label: "Settings", icon: Settings }
];

export async function AppShell({ children, active = "/" }: { children: React.ReactNode; active?: string }) {
  const user = await getSession();
  if (!user) redirect("/login");

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <div className="brand">
          <div className="brand-mark">
            <CalendarCheck size={23} />
          </div>
          <div>
            <p className="brand-title">MediPilot AI</p>
            <p className="brand-subtitle">Clinical workflow copilot</p>
          </div>
        </div>
        <nav className="nav-list" aria-label="Main navigation">
          {nav.map((item) => {
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
            <h1 className="page-title">{active === "/" ? "Doctor Dashboard" : nav.find((n) => n.href === active)?.label}</h1>
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
