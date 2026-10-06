"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { LogOut } from "lucide-react";
import { useAuth } from "@/components/auth/auth-provider";
import { Avatar } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";

/** Signed-in identity plus the log out action. The error is announced in place so a failed logout is never silent. */
export function UserMenu() {
  const auth = useAuth();
  const router = useRouter();
  const [loggingOut, setLoggingOut] = useState(false);
  const [error, setError] = useState("");
  const pending = useRef(false);
  if (!auth.user) return null;
  async function logout() {
    if (pending.current) return;
    pending.current = true;
    setLoggingOut(true);
    setError("");
    try { await auth.logout(); router.replace("/login"); }
    catch { setError("Unable to log out. Please try again."); }
    finally { pending.current = false; setLoggingOut(false); }
  }
  return (
    <div className="space-y-2">
      <div className="flex items-center gap-3 px-1">
        <Avatar name={auth.user.name} />
        <div className="min-w-0 leading-tight">
          <p className="truncate text-sm font-medium text-foreground">{auth.user.name}</p>
          <p className="truncate text-xs text-muted-foreground">{auth.user.email}</p>
        </div>
      </div>
      {error && <p role="alert" className="text-[0.8125rem] text-danger-soft-foreground">{error}</p>}
      <Button variant="outline" size="sm" className="w-full" onClick={logout} disabled={loggingOut}>
        <LogOut aria-hidden="true" />{loggingOut ? "Logging out…" : "Log out"}
      </Button>
    </div>
  );
}
