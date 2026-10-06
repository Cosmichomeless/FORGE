"use client";

import { useId } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { Plus, Settings } from "lucide-react";
import { Select } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { useOrganizations } from "./organization-provider";

const labelClass = "px-1 text-xs font-medium uppercase tracking-wide text-muted-foreground";

export function OrganizationSwitcher() {
  const { organizations, active, isPending, isError, retry, setActiveId } = useOrganizations();
  const router = useRouter();
  const pathname = usePathname();
  const selectId = useId();
  if (isPending) {
    return (
      <div role="status" aria-busy="true" className="space-y-2">
        <span className="sr-only">Loading organizations…</span>
        <Skeleton className="h-3 w-20" />
        <Skeleton className="h-9 w-full" />
      </div>
    );
  }
  if (isError) {
    return <button type="button" onClick={retry} className="text-left text-sm font-medium text-link underline-offset-2 hover:underline">Retry loading organizations</button>;
  }
  if (!active) {
    return (
      <Link href="/organizations" className="inline-flex items-center gap-2 rounded-md border border-dashed border-border-strong px-3 py-2 text-sm font-medium text-foreground hover:bg-muted">
        <Plus aria-hidden="true" className="size-4" />Create an organization
      </Link>
    );
  }
  function change(id: string) {
    setActiveId(id);
    if (pathname.startsWith("/organizations/")) router.push(`/organizations/${id}`);
  }
  return (
    <div className="space-y-1.5">
      <label htmlFor={selectId} className={labelClass}>Organization</label>
      <Select id={selectId} value={active.id} onChange={event => change(event.target.value)}>
        {organizations.map(org => <option key={org.id} value={org.id}>{org.name}</option>)}
      </Select>
      <Link href={`/organizations/${active.id}`} className="flex items-center gap-2 rounded-md px-1 py-1 text-[0.8125rem] font-medium text-muted-foreground hover:text-foreground">
        <Settings aria-hidden="true" className="size-3.5" />Manage
      </Link>
    </div>
  );
}
