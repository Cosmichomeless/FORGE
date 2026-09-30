"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { useAuth } from "./auth-provider";

export function PrivateShell({ children }: { children: ReactNode }) {
  const auth = useAuth();
  const router = useRouter();
  const [loggingOut, setLoggingOut] = useState(false);
  const [logoutError, setLogoutError] = useState("");
  const logoutPending = useRef(false);
  useEffect(() => {
    if (!auth.isPending && !auth.isError && !auth.user) router.replace("/login");
  }, [auth.isPending, auth.isError, auth.user, router]);
  async function logout() {
    if (logoutPending.current) return;
    logoutPending.current = true;
    setLoggingOut(true);
    setLogoutError("");
    try { await auth.logout(); router.replace("/login"); }
    catch { setLogoutError("Unable to log out. Please try again."); }
    finally { logoutPending.current = false; setLoggingOut(false); }
  }
  if (auth.isPending) return <p role="status">Loading your session…</p>;
  if (auth.isError) return <div className="space-y-4"><p role="alert">Unable to load your session.</p><Button onClick={auth.retry}>Retry</Button></div>;
  if (!auth.user) return <p role="status">Redirecting to login…</p>;
  return <div className="space-y-6">
    <header className="flex flex-wrap items-center justify-between gap-4">
      <p>Signed in as {auth.user.name} ({auth.user.email})</p>
      <Button onClick={logout} disabled={loggingOut}>{loggingOut ? "Logging out…" : "Log out"}</Button>
    </header>
    {logoutError && <p role="alert" className="text-red-600">{logoutError}</p>}
    {children}
  </div>;
}
