"use client";

import { useEffect, useState, type ReactNode } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Building2, Hammer, LayoutDashboard, Menu, X, type LucideIcon } from "lucide-react";
import { useAuth } from "@/components/auth/auth-provider";
import { OrganizationSwitcher } from "@/components/organizations/organization-switcher";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { UserMenu } from "./user-menu";

const navItems: { href: string; label: string; icon: LucideIcon }[] = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/organizations", label: "Organizations", icon: Building2 },
];

function Brand({ className }: { className?: string }) {
  return (
    <Link href="/" className={cn("inline-flex items-center gap-2 rounded-md font-semibold tracking-tight text-foreground", className)}>
      <span aria-hidden="true" className="inline-flex size-7 items-center justify-center rounded-lg bg-accent text-accent-foreground"><Hammer className="size-4" /></span>
      FORGE
    </Link>
  );
}

function SkipLink() {
  return <a href="#main-content" className="sr-only z-50 rounded-md bg-surface px-3 py-2 text-sm font-medium text-foreground shadow-pop focus:not-sr-only focus:fixed focus:left-3 focus:top-3">Skip to main content</a>;
}

/** Single page frame: skip link, navigation (sidebar on desktop, drawer on small screens) and the one <main> landmark. */
export function AppShell({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const [lastPath, setLastPath] = useState(pathname);
  if (pathname !== lastPath) { setLastPath(pathname); setOpen(false); }
  useEffect(() => {
    if (!open) return;
    const onKey = (event: KeyboardEvent) => { if (event.key === "Escape") setOpen(false); };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open]);

  if (!user) {
    return (
      <div className="flex min-h-dvh flex-col">
        <SkipLink />
        <header className="border-b border-border bg-surface">
          <nav aria-label="Main navigation" className="mx-auto flex h-14 max-w-6xl items-center justify-between gap-4 px-4 sm:px-8">
            <Brand />
            <div className="flex items-center gap-2">
              <Button asChild variant="ghost" size="sm"><Link href="/login">Log in</Link></Button>
              <Button asChild size="sm"><Link href="/register">Register</Link></Button>
            </div>
          </nav>
        </header>
        <main id="main-content" className="flex-1">{children}</main>
      </div>
    );
  }

  return (
    <div className="min-h-dvh lg:pl-64">
      <SkipLink />
      <header className="sticky top-0 z-30 flex h-14 items-center justify-between border-b border-border bg-surface/95 px-4 backdrop-blur lg:hidden">
        <Brand />
        <Button variant="ghost" size="icon" aria-label="Open navigation" aria-expanded={open} aria-controls="app-sidebar" onClick={() => setOpen(true)}>
          <Menu aria-hidden="true" />
        </Button>
      </header>
      {open && <div aria-hidden="true" className="fixed inset-0 z-40 bg-black/50 lg:hidden" onClick={() => setOpen(false)} />}
      <aside id="app-sidebar" aria-label="Sidebar"
        className={cn(
          "fixed inset-y-0 left-0 z-50 flex w-64 flex-col gap-6 border-r border-border bg-surface px-3 py-4 transition-transform duration-200 motion-reduce:transition-none",
          open ? "translate-x-0" : "max-lg:invisible max-lg:-translate-x-full",
        )}>
        <div className="flex items-center justify-between px-1">
          <Brand />
          <Button variant="ghost" size="icon" className="lg:hidden" aria-label="Close navigation" onClick={() => setOpen(false)}>
            <X aria-hidden="true" />
          </Button>
        </div>
        <OrganizationSwitcher />
        <nav aria-label="Main navigation" className="flex-1">
          <ul className="space-y-1">
            {navItems.map(({ href, label, icon: Icon }) => {
              const current = pathname === href || pathname.startsWith(`${href}/`);
              return (
                <li key={href}>
                  <Link href={href} aria-current={current ? "page" : undefined}
                    className={cn("flex items-center gap-2.5 rounded-md px-2.5 py-2 text-sm font-medium transition-colors",
                      current ? "bg-accent-soft text-accent-soft-foreground" : "text-muted-foreground hover:bg-muted hover:text-foreground")}>
                    <Icon aria-hidden="true" className="size-4" />{label}
                  </Link>
                </li>
              );
            })}
          </ul>
        </nav>
        <div className="border-t border-border pt-4"><UserMenu /></div>
      </aside>
      <main id="main-content" className="min-w-0">{children}</main>
    </div>
  );
}
