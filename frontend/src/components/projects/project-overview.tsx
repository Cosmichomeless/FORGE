"use client";

import { useState } from "react";
import Link from "next/link";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { organizationsKey } from "@/components/organizations/organization-provider";
import { ApiError } from "@/lib/http";
import { organizationsApi } from "@/lib/organizations-api";
import { canManageOrganization } from "@/lib/permissions";
import { projectKey, projectsApi, projectsKey, type Project } from "@/lib/projects-api";
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

  if (organization.isPending || project.isPending) return <p role="status">Loading project…</p>;
  if (organization.isError || project.isError) {
    const missing = notFound(organization.error) || notFound(project.error);
    return <div className="space-y-4">
      <p role="alert">{missing ? "Project not found, or you are not a member of its organization." : "Unable to load this project."}</p>
      {!missing && <Button onClick={() => { void organization.refetch(); void project.refetch(); }}>Retry</Button>}
      <p className="text-sm"><Link href={`/organizations/${organizationId}`} className="underline">Back to organization</Link></p>
    </div>;
  }
  const data = project.data;
  const canManage = canManageOrganization(organization.data.role);
  const archived = data.status === "ARCHIVED";
  return (
    <div className="space-y-8">
      <p className="text-sm"><Link href={`/organizations/${organizationId}`} className="underline">← {organization.data.name}</Link></p>
      <header className="space-y-2">
        <h1 className="text-3xl font-semibold">{data.name}</h1>
        <dl className="flex flex-wrap gap-x-6 gap-y-1 text-sm text-neutral-600">
          <div className="flex gap-1"><dt>Key:</dt><dd><code className="rounded bg-neutral-100 px-1.5 py-0.5">{data.key}</code></dd></div>
          <div className="flex gap-1"><dt>Status:</dt><dd>{archived ? "Archived" : "Active"}</dd></div>
          <div className="flex gap-1"><dt>Created:</dt><dd>{new Date(data.createdAt).toLocaleDateString()}</dd></div>
        </dl>
        {data.description && <p>{data.description}</p>}
      </header>
      {archived && <p role="status" className="rounded-md border p-3 text-sm">This project is archived. Its data is kept, but it is hidden from the active list and cannot be edited.</p>}
      {message && <p role="alert" className="text-sm text-red-600">{message}</p>}
      {canManage
        ? <section aria-labelledby="project-settings" className="space-y-4">
            <h2 id="project-settings" className="text-xl font-semibold">Settings</h2>
            {!archived && <EditProjectForm key={data.updatedAt} project={data} />}
            <Button variant="outline" disabled={changeStatus.isPending} onClick={() => changeStatus.mutate(archived ? "restore" : "archive")}>
              {changeStatus.isPending ? "Working…" : archived ? "Restore project" : "Archive project"}
            </Button>
          </section>
        : <p className="text-sm">Only owners and admins can edit or archive projects.</p>}
    </div>
  );
}
