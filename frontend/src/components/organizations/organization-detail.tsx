"use client";

import { useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card, CardBody, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { PageContainer } from "@/components/ui/page-container";
import { Breadcrumbs, PageHeader } from "@/components/ui/page-header";
import { LoadingState, Skeleton } from "@/components/ui/skeleton";
import { ApiError } from "@/lib/http";
import { organizationsApi } from "@/lib/organizations-api";
import { canManageOrganization } from "@/lib/permissions";
import { ProjectsPanel } from "@/components/projects/projects-panel";
import { EditOrganizationForm } from "./edit-organization-form";
import { InvitationsPanel } from "./invitations-panel";
import { MembersPanel } from "./members-panel";
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
  if (query.isPending) {
    return (
      <PageContainer>
        <LoadingState label="Loading organization…" className="space-y-6">
          <Skeleton className="h-8 w-64" />
          <Skeleton className="h-48 w-full rounded-xl" />
          <Skeleton className="h-48 w-full rounded-xl" />
        </LoadingState>
      </PageContainer>
    );
  }
  if (query.isError) {
    const missing = query.error instanceof ApiError && (query.error.status === 404 || query.error.status === 400);
    return (
      <PageContainer size="narrow">
        <Alert tone="error" role="alert" action={!missing ? <Button size="sm" onClick={() => { void query.refetch(); }}>Retry</Button> : undefined}>
          {missing ? "Organization not found, or you are not a member of it." : "Unable to load this organization."}
        </Alert>
      </PageContainer>
    );
  }
  const organization = query.data;
  const canEdit = canManageOrganization(organization.role);
  return (
    <PageContainer className="space-y-8">
      <PageHeader title={organization.name}
        breadcrumbs={<Breadcrumbs items={[{ label: "Organizations", href: "/organizations" }, { label: organization.name }]} />}
        description={`${organization.slug} · your role: ${organization.role}`} />
      <ProjectsPanel organization={organization} />
      <MembersPanel organization={organization} />
      <div className="grid gap-6 lg:grid-cols-2 lg:items-start">
        {canEdit && <InvitationsPanel organization={organization} />}
        {canEdit
          ? <section aria-labelledby="org-settings">
              <Card>
                <CardHeader><CardTitle id="org-settings">Settings</CardTitle><CardDescription>Rename the organization or change its slug.</CardDescription></CardHeader>
                <CardBody><EditOrganizationForm key={organization.id + organization.name + organization.slug} organization={organization} /></CardBody>
              </Card>
            </section>
          : <Alert tone="info">Only owners and admins can edit this organization.</Alert>}
      </div>
    </PageContainer>
  );
}
