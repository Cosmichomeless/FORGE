"use client";

import Link from "next/link";
import { useOrganizations } from "./organization-provider";

export function ActiveOrganizationSummary() {
  const { active, isPending, isError } = useOrganizations();
  if (isPending) return <p role="status" className="mt-6">Loading organizations…</p>;
  if (isError) return <p role="alert" className="mt-6">Unable to load your organizations.</p>;
  if (!active) return <p className="mt-6">You are not in an organization yet. <Link href="/organizations" className="underline">Create one</Link>.</p>;
  return (
    <section aria-labelledby="active-org" className="mt-6 rounded-md border p-4">
      <h2 id="active-org" className="text-sm font-medium text-neutral-600">Active organization</h2>
      <p className="text-xl font-semibold">{active.name}</p>
      <p className="text-sm text-neutral-600">{active.slug} · your role: {active.role}</p>
      <Link href={`/organizations/${active.id}`} className="mt-2 inline-block text-sm underline">Open organization</Link>
    </section>
  );
}
