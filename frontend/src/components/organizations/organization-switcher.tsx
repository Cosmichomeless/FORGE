"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useOrganizations } from "./organization-provider";

export function OrganizationSwitcher() {
  const { organizations, active, isPending, isError, retry, setActiveId } = useOrganizations();
  const router = useRouter();
  const pathname = usePathname();
  if (isPending) return <span role="status" className="text-sm">Loading organizations…</span>;
  if (isError) return <button type="button" onClick={retry} className="text-sm underline">Retry loading organizations</button>;
  if (!active) return <Link href="/organizations" className="text-sm underline">Create an organization</Link>;
  function change(id: string) {
    setActiveId(id);
    if (pathname.startsWith("/organizations/")) router.push(`/organizations/${id}`);
  }
  return (
    <div className="flex items-center gap-2">
      <label htmlFor="active-organization" className="text-sm">Organization</label>
      <select id="active-organization" value={active.id} onChange={event => change(event.target.value)}
        className="rounded-md border border-neutral-300 px-2 py-1 text-sm">
        {organizations.map(org => <option key={org.id} value={org.id}>{org.name}</option>)}
      </select>
      <Link href={`/organizations/${active.id}`} className="text-sm underline">Manage</Link>
    </div>
  );
}
