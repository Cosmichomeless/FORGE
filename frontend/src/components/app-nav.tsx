"use client";

import Link from "next/link";
import { useAuth } from "@/components/auth/auth-provider";
import { OrganizationSwitcher } from "@/components/organizations/organization-switcher";

export function AppNav() {
  const { user } = useAuth();
  return (
    <nav aria-label="Main navigation" className="flex flex-wrap items-center gap-6 border-b p-4">
      <Link href="/">FORGE</Link>
      {user ? <>
        <Link href="/dashboard">Dashboard</Link>
        <Link href="/organizations">Organizations</Link>
        <span className="ml-auto"><OrganizationSwitcher /></span>
      </> : <>
        <Link href="/login">Log in</Link>
        <Link href="/register">Register</Link>
      </>}
    </nav>
  );
}
