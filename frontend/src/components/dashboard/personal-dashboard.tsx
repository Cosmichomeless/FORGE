"use client";

import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { dashboardApi, dashboardKey } from "@/lib/dashboard-api";
import { issueStatuses, priorityLabel, statusLabel } from "@/lib/issues-api";

export function PersonalDashboard() {
  const dashboard = useQuery({ queryKey: dashboardKey, queryFn: ({ signal }) => dashboardApi.get(signal), retry: false });
  if (dashboard.isPending) return <p role="status">Loading your work…</p>;
  if (dashboard.isError) return <div className="space-y-2"><p role="alert">Unable to load your dashboard.</p><Button onClick={() => { void dashboard.refetch(); }}>Retry</Button></div>;
  const { assigned, counts, recentProjects } = dashboard.data;
  return (
    <div className="mt-8 space-y-8">
      <section aria-labelledby="counts-heading" className="space-y-3">
        <h2 id="counts-heading" className="text-xl font-semibold">Assigned to you</h2>
        <ul className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          {issueStatuses.map(status => (
            <li key={status} className="rounded-md border p-3"><span className="block text-2xl font-semibold">{counts[status] ?? 0}</span><span className="text-sm text-neutral-600">{statusLabel[status]}</span></li>
          ))}
        </ul>
        {assigned.length === 0
          ? <p className="text-sm">Nothing is assigned to you right now.</p>
          : <ul className="divide-y rounded-md border">
              {assigned.map(({ organizationId, organizationName, projectName, issue }) => (
                <li key={`${organizationId}-${issue.id}`} className="flex flex-wrap items-center justify-between gap-3 p-3">
                  <div className="flex items-center gap-3">
                    <code className="rounded bg-neutral-100 px-1.5 py-0.5 text-sm">{issue.identifier}</code>
                    <Link href={`/organizations/${organizationId}/projects/${issue.projectId}/issues/${issue.number}`} className="font-medium underline">{issue.title}</Link>
                  </div>
                  <span className="text-sm text-neutral-600">{organizationName} · {projectName} · {statusLabel[issue.status]} · {priorityLabel[issue.priority]}</span>
                </li>
              ))}
            </ul>}
      </section>
      <section aria-labelledby="recent-heading" className="space-y-3">
        <h2 id="recent-heading" className="text-xl font-semibold">Recent projects</h2>
        {recentProjects.length === 0
          ? <p className="text-sm">No recent project activity yet.</p>
          : <ul className="divide-y rounded-md border">
              {recentProjects.map(project => (
                <li key={project.projectId} className="flex flex-wrap items-center justify-between gap-3 p-3">
                  <Link href={`/organizations/${project.organizationId}/projects/${project.projectId}`} className="font-medium underline">{project.key} · {project.name}</Link>
                  <span className="text-sm text-neutral-600">{project.organizationName}{project.lastActivityAt && ` · ${new Date(project.lastActivityAt).toLocaleDateString()}`}</span>
                </li>
              ))}
            </ul>}
      </section>
    </div>
  );
}
