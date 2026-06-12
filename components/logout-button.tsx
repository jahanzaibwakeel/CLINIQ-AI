"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { LogOut } from "lucide-react";
import { csrfHeaders } from "@/lib/client/csrf";

export function LogoutButton() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  async function logout() {
    setLoading(true);
    await fetch("/api/auth/logout", { method: "POST", headers: csrfHeaders() });
    router.push("/login");
    router.refresh();
  }

  return (
    <button className="button secondary" disabled={loading} onClick={logout} title="Sign out" type="button">
      <LogOut size={16} />
      {loading ? "Signing out" : "Sign out"}
    </button>
  );
}
