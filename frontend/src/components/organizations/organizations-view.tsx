"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { CreateOrganizationForm } from "./create-organization-form";
import { useOrganizations } from "./organization-provider";

export function OrganizationsView() {
  const { organizations, active, isPending, isError, retry, setActiveId } = useOrganizations();
  const router = useRouter();
  return (
    <div className="space-y-10">
      <section aria-labelledby="my-organizations" className="space-y-4">
        <h1 id="my-organizations" className="text-3xl font-semibold">Organizations</h1>
        {isPending && <p role="status">Loading organizations…</p>}
        {isError && <div className="space-y-2"><p role="alert">Unable to load your organizations.</p><Button onClick={retry}>Retry</Button></div>}
        {!isPending && !isError && organizations.length === 0 && <p>You do not belong to any organization yet. Create one below, or accept an invitation.</p>}
        {organizations.length > 0 && <ul className="divide-y rounded-md border">
          {organizations.map(org => (
            <li key={org.id} className="flex flex-wrap items-center justify-between gap-2 p-3">
              <Link href={`/organizations/${org.id}`} onClick={() => setActiveId(org.id)} className="font-medium underline">{org.name}</Link>
              <span className="text-sm text-neutral-600">{org.slug} · {org.role}{active?.id === org.id ? " · active" : ""}</span>
            </li>
          ))}
        </ul>}
        <p className="text-sm"><Link href="/invitations/accept" className="underline">Have an invitation token?</Link></p>
      </section>
      <section aria-labelledby="new-organization" className="max-w-sm space-y-4">
        <h2 id="new-organization" className="text-xl font-semibold">Create an organization</h2>
        <CreateOrganizationForm onCreated={organization => { setActiveId(organization.id); router.push(`/organizations/${organization.id}`); }} />
      </section>
    </div>
  );
}
