"use client";

import { useState } from "react";
import Link from "next/link";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Archive, ArchiveRestore, ArrowLeft } from "lucide-react";
import { Alert } from "@/components/ui/alert";
import { Badge, Code } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardBody, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { PageContainer } from "@/components/ui/page-container";
import { Breadcrumbs, PageHeader } from "@/components/ui/page-header";
import { LoadingState, Skeleton } from "@/components/ui/skeleton";
import { organizationsKey } from "@/components/organizations/organization-provider";
import { ApiError } from "@/lib/http";
import { organizationsApi } from "@/lib/organizations-api";
import { canManageOrganization } from "@/lib/permissions";
import { projectKey, projectsApi, projectsKey, type Project } from "@/lib/projects-api";
import { IssuesPanel } from "@/components/issues/issues-panel";
import { EditProjectForm } from "./edit-project-form";

const describe = (error: unknown) => error instanceof ApiError ? error.message : "Unable to connect. Please try again.";
const notFound = (error: unknown) => error instanceof ApiError && (error.status === 404 || error.status === 400);

export function ProjectOverview({ organizationId, projectId }: { organizationId: string; projectId: string }) {
  const client = useQueryClient();
  const [message, setMessage] = useState("");
  const organization = useQuery({
    queryKey: [...organizationsKey, organizationId], queryFn: ({ signal }) => organizationsApi.get(organizationId, signal), retry: false,
  });
  const key = projectKey(organizationId, projectId);
  const project = useQuery({ queryKey: key, queryFn: ({ signal }) => projectsApi.get(organizationId, projectId, signal), retry: false });
  const changeStatus = useMutation({
    mutationFn: (action: "archive" | "restore") => projectsApi[action](organizationId, projectId),
    onMutate: () => setMessage(""),
    onSuccess: async (updated: Project) => {
      client.setQueryData(key, updated);
      await client.invalidateQueries({ queryKey: projectsKey(organizationId) });
    },
    onError: error => { setMessage(describe(error)); void client.invalidateQueries({ queryKey: key }); },
  });

  if (organization.isPending || project.isPending) {
    return (
      <PageContainer>
        <LoadingState label="Loading project…" className="space-y-6">
          <Skeleton className="h-4 w-48" />
          <Skeleton className="h-8 w-72" />
          <Skeleton className="h-64 w-full rounded-xl" />
        </LoadingState>
      </PageContainer>
    );
  }
  if (organization.isError || project.isError) {
    const missing = notFound(organization.error) || notFound(project.error);
    return (
      <PageContainer size="narrow" className="space-y-4">
        <Alert tone="error" role="alert" action={!missing ? <Button size="sm" onClick={() => { void organization.refetch(); void project.refetch(); }}>Retry</Button> : undefined}>
          {missing ? "Project not found, or you are not a member of its organization." : "Unable to load this project."}
        </Alert>
        <Button asChild variant="outline" size="sm"><Link href={`/organizations/${organizationId}`}><ArrowLeft aria-hidden="true" />Back to organization</Link></Button>
      </PageContainer>
    );
  }
  const data = project.data;
  const canManage = canManageOrganization(organization.data.role);
  const archived = data.status === "ARCHIVED";
  return (
    <PageContainer size="wide" className="space-y-8">
      <PageHeader title={data.name}
        breadcrumbs={<Breadcrumbs items={[{ label: "Organizations", href: "/organizations" }, { label: organization.data.name, href: `/organizations/${organizationId}` }, { label: data.name }]} />}
        description={data.description}
        meta={
          <dl className="flex flex-wrap items-center gap-x-5 gap-y-2 text-[0.8125rem] text-muted-foreground">
            <div className="flex items-center gap-1.5"><dt>Key:</dt><dd><Code>{data.key}</Code></dd></div>
            <div className="flex items-center gap-1.5"><dt>Status:</dt><dd><Badge tone={archived ? "neutral" : "success"}>{archived ? "Archived" : "Active"}</Badge></dd></div>
            <div className="flex items-center gap-1.5"><dt>Created:</dt><dd>{new Date(data.createdAt).toLocaleDateString()}</dd></div>
          </dl>
        } />
      {archived && <Alert tone="warning" role="status">This project is archived. Its data is kept, but it is hidden from the active list and cannot be edited.</Alert>}
      {message && <Alert tone="error" role="alert">{message}</Alert>}
      <IssuesPanel organizationId={organizationId} projectId={projectId} archived={archived} />
      {canManage
        ? <section aria-labelledby="project-settings">
            <Card>
              <CardHeader><CardTitle id="project-settings">Settings</CardTitle><CardDescription>Update the project details or archive it.</CardDescription></CardHeader>
              <CardBody className="space-y-5">
                {!archived && <div className="max-w-md"><EditProjectForm key={data.updatedAt} project={data} /></div>}
                <Button variant="outline" disabled={changeStatus.isPending} onClick={() => changeStatus.mutate(archived ? "restore" : "archive")}>
                  {archived ? <ArchiveRestore aria-hidden="true" /> : <Archive aria-hidden="true" />}
                  {changeStatus.isPending ? "Working…" : archived ? "Restore project" : "Archive project"}
                </Button>
              </CardBody>
            </Card>
          </section>
        : <Alert tone="info">Only owners and admins can edit or archive projects.</Alert>}
    </PageContainer>
  );
}
