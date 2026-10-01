"use client";

import { useState } from "react";
import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
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
    <section aria-labelledby="projects-heading" className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 id="projects-heading" className="text-xl font-semibold">Projects</h2>
        <div className="flex items-center gap-4">
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" checked={showArchived} onChange={event => setShowArchived(event.target.checked)} />
            Show archived
          </label>
          {canCreate && !creating && <Button size="sm" onClick={() => setCreating(true)}>New project</Button>}
        </div>
      </div>
      {creating && <CreateProjectForm organizationId={organization.id} onCancel={() => setCreating(false)} onCreated={() => setCreating(false)} />}
      {projects.isPending && <p role="status">Loading projects…</p>}
      {projects.isError && <div className="space-y-2"><p role="alert">Unable to load projects.</p><Button onClick={() => { void projects.refetch(); }}>Retry</Button></div>}
      {projects.data?.length === 0 && <p className="text-sm">
        {showArchived ? "This organization has no projects." : "No active projects yet."}{" "}
        {canCreate ? "Create the first one with “New project”." : "Ask an owner or admin to create one."}
      </p>}
      {projects.data && projects.data.length > 0 && <ul className="divide-y rounded-md border">
        {projects.data.map(project => (
          <li key={project.id} className="flex flex-wrap items-center justify-between gap-3 p-3">
            <div>
              <Link href={`/organizations/${organization.id}/projects/${project.id}`} className="font-medium underline">{project.name}</Link>
              {project.description && <p className="text-sm text-neutral-600">{project.description}</p>}
            </div>
            <div className="flex items-center gap-2 text-sm">
              <code className="rounded bg-neutral-100 px-1.5 py-0.5">{project.key}</code>
              {project.status === "ARCHIVED" && <span className="rounded border px-1.5 py-0.5 text-neutral-600">Archived</span>}
            </div>
          </li>
        ))}
      </ul>}
    </section>
  );
}
