"use client";

import { useState } from "react";
import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { FolderKanban, Plus } from "lucide-react";
import { Alert } from "@/components/ui/alert";
import { Badge, Code } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardDescription, CardHeader, CardTitle, Row, RowList } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { ListSkeleton, LoadingState } from "@/components/ui/skeleton";
import { type Organization } from "@/lib/organizations-api";
import { canManageOrganization } from "@/lib/permissions";
import { projectsApi, projectsKey, type ProjectFilter } from "@/lib/projects-api";
import { CreateProjectForm } from "./create-project-form";

export function ProjectsPanel({ organization }: { organization: Organization }) {
  const [creating, setCreating] = useState(false);
  const [showArchived, setShowArchived] = useState(false);
  const filter: ProjectFilter = showArchived ? "ALL" : "ACTIVE";
  const canCreate = canManageOrganization(organization.role);
  const projects = useQuery({
    queryKey: [...projectsKey(organization.id), "list", filter],
    queryFn: ({ signal }) => projectsApi.list(organization.id, filter, signal),
    retry: false,
  });
  return (
    <section aria-labelledby="projects-heading">
      <Card>
        <CardHeader actions={<>
          <label className="flex items-center gap-2 text-[0.8125rem] text-muted-foreground">
            <input type="checkbox" className="size-4 accent-accent" checked={showArchived} onChange={event => setShowArchived(event.target.checked)} />
            Show archived
          </label>
          {canCreate && !creating && <Button size="sm" onClick={() => setCreating(true)}><Plus aria-hidden="true" />New project</Button>}
        </>}>
          <CardTitle id="projects-heading">Projects</CardTitle>
          <CardDescription>Group issues by product, team or initiative.</CardDescription>
        </CardHeader>
        {creating && <div className="border-b border-border bg-muted/40 p-4 sm:p-5"><CreateProjectForm organizationId={organization.id} onCancel={() => setCreating(false)} onCreated={() => setCreating(false)} /></div>}
        {projects.isPending && <LoadingState label="Loading projects…"><ListSkeleton rows={3} /></LoadingState>}
        {projects.isError && <div className="p-4 sm:p-5"><Alert tone="error" role="alert" action={<Button size="sm" onClick={() => { void projects.refetch(); }}>Retry</Button>}>Unable to load projects.</Alert></div>}
        {projects.data?.length === 0 && <EmptyState icon={<FolderKanban />}
          title={showArchived ? "This organization has no projects." : "No active projects yet."}
          description={canCreate ? "Create the first one with “New project”." : "Ask an owner or admin to create one."} />}
        {projects.data && projects.data.length > 0 && <RowList>
          {projects.data.map(project => (
            <Row key={project.id} className="justify-between">
              <div className="flex min-w-0 items-center gap-3">
                <span aria-hidden="true" className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-accent-soft text-accent-soft-foreground"><FolderKanban className="size-4" /></span>
                <div className="min-w-0">
                  <Link href={`/organizations/${organization.id}/projects/${project.id}`} className="block truncate text-sm font-medium text-foreground hover:text-link hover:underline">{project.name}</Link>
                  {project.description && <p className="truncate text-xs text-muted-foreground">{project.description}</p>}
                </div>
              </div>
              <div className="flex items-center gap-2">
                {project.status === "ARCHIVED" && <Badge tone="neutral">Archived</Badge>}
                <Code>{project.key}</Code>
              </div>
            </Row>
          ))}
        </RowList>}
      </Card>
    </section>
  );
}
