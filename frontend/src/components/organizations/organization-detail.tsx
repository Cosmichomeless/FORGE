"use client";

import { useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { ApiError } from "@/lib/http";
import { organizationsApi } from "@/lib/organizations-api";
import { canManageOrganization } from "@/lib/permissions";
import { EditOrganizationForm } from "./edit-organization-form";
import { organizationsKey, useOrganizations } from "./organization-provider";

export function OrganizationDetail({ organizationId }: { organizationId: string }) {
  const { setActiveId } = useOrganizations();
  const query = useQuery({
    queryKey: [...organizationsKey, organizationId],
    queryFn: ({ signal }) => organizationsApi.get(organizationId, signal),
    retry: false,
  });
  const loadedId = query.data?.id;
  useEffect(() => { if (loadedId) setActiveId(loadedId); }, [loadedId, setActiveId]);
  if (query.isPending) return <p role="status">Loading organization…</p>;
  if (query.isError) {
    const missing = query.error instanceof ApiError && (query.error.status === 404 || query.error.status === 400);
    return <div className="space-y-4">
      <p role="alert">{missing ? "Organization not found, or you are not a member of it." : "Unable to load this organization."}</p>
      {!missing && <Button onClick={() => { void query.refetch(); }}>Retry</Button>}
    </div>;
  }
  const organization = query.data;
  const canEdit = canManageOrganization(organization.role);
  return (
    <div className="space-y-10">
      <header className="space-y-1">
        <h1 className="text-3xl font-semibold">{organization.name}</h1>
        <p className="text-sm text-neutral-600">{organization.slug} · your role: {organization.role}</p>
      </header>
      {canEdit
        ? <section aria-labelledby="org-settings" className="space-y-4"><h2 id="org-settings" className="text-xl font-semibold">Settings</h2><EditOrganizationForm key={organization.id + organization.name + organization.slug} organization={organization} /></section>
        : <p className="text-sm">Only owners and admins can edit this organization.</p>}
    </div>
  );
}
