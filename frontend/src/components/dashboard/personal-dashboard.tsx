"use client";

import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { Circle, CircleCheck, CircleDot, FolderKanban, ListChecks } from "lucide-react";
import { PriorityBadge, StatusBadge } from "@/components/issues/issue-badges";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card, Row, RowList } from "@/components/ui/card";
import { Code } from "@/components/ui/badge";
import { EmptyState } from "@/components/ui/empty-state";
import { ListSkeleton, LoadingState, Skeleton } from "@/components/ui/skeleton";
import { dashboardApi, dashboardKey } from "@/lib/dashboard-api";
import { issueStatuses, statusLabel, type IssueStatus } from "@/lib/issues-api";

const statusIcon: Record<IssueStatus, React.ReactNode> = {
  TODO: <Circle aria-hidden="true" className="size-4 text-muted-foreground" />,
  IN_PROGRESS: <CircleDot aria-hidden="true" className="size-4 text-warning-icon" />,
  DONE: <CircleCheck aria-hidden="true" className="size-4 text-success-icon" />,
};

export function PersonalDashboard() {
  const dashboard = useQuery({ queryKey: dashboardKey, queryFn: ({ signal }) => dashboardApi.get(signal), retry: false });
  if (dashboard.isPending) {
    return (
      <LoadingState label="Loading your work…" className="space-y-6">
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">{issueStatuses.map(status => <Skeleton key={status} className="h-[4.5rem] rounded-xl" />)}</div>
        <Card><ListSkeleton rows={3} /></Card>
      </LoadingState>
    );
  }
  if (dashboard.isError) {
    return (
      <Alert tone="error" role="alert" action={<Button size="sm" onClick={() => { void dashboard.refetch(); }}>Retry</Button>}>
        Unable to load your dashboard.
      </Alert>
    );
  }
  const { assigned, counts, recentProjects } = dashboard.data;
  return (
    <div className="space-y-8">
      <section aria-labelledby="counts-heading" className="space-y-4">
        <h2 id="counts-heading" className="text-base font-semibold tracking-tight">Assigned to you</h2>
        <ul className="grid grid-cols-1 gap-3 sm:grid-cols-3">
          {issueStatuses.map(status => (
            <li key={status} className="flex items-center justify-between rounded-xl border border-border bg-surface px-4 py-3.5 shadow-card">
              <span className="flex items-center gap-2 text-sm text-muted-foreground">{statusIcon[status]}<span>{statusLabel[status]}</span></span>
              <span className="text-2xl font-semibold tabular-nums tracking-tight">{counts[status] ?? 0}</span>
            </li>
          ))}
        </ul>
        <Card>
          {assigned.length === 0
            ? <EmptyState icon={<ListChecks />} title="Nothing is assigned to you right now." description="Issues assigned to you across all organizations show up here." />
            : <RowList>
                {assigned.map(({ organizationId, organizationName, projectName, issue }) => (
                  <Row key={`${organizationId}-${issue.id}`} className="justify-between">
                    <div className="flex min-w-0 items-center gap-3">
                      <Code>{issue.identifier}</Code>
                      <div className="min-w-0">
                        <Link href={`/organizations/${organizationId}/projects/${issue.projectId}/issues/${issue.number}`} className="block truncate text-sm font-medium text-foreground hover:text-link hover:underline">{issue.title}</Link>
                        <p className="truncate text-xs text-muted-foreground">{organizationName} · {projectName}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2"><StatusBadge status={issue.status} /><PriorityBadge priority={issue.priority} /></div>
                  </Row>
                ))}
              </RowList>}
        </Card>
      </section>
      <section aria-labelledby="recent-heading" className="space-y-4">
        <h2 id="recent-heading" className="text-base font-semibold tracking-tight">Recent projects</h2>
        <Card>
          {recentProjects.length === 0
            ? <EmptyState icon={<FolderKanban />} title="No recent project activity yet." description="Projects with recent changes will appear here." />
            : <RowList>
                {recentProjects.map(project => (
                  <Row key={project.projectId} className="justify-between">
                    <Link href={`/organizations/${project.organizationId}/projects/${project.projectId}`} className="flex min-w-0 items-center gap-3 text-sm font-medium text-foreground hover:text-link hover:underline">
                      <span aria-hidden="true" className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-accent-soft text-accent-soft-foreground"><FolderKanban className="size-4" /></span>
                      <span className="truncate">{project.key} · {project.name}</span>
                    </Link>
                    <span className="text-xs text-muted-foreground">{project.organizationName}{project.lastActivityAt && ` · ${new Date(project.lastActivityAt).toLocaleDateString()}`}</span>
                  </Row>
                ))}
              </RowList>}
        </Card>
      </section>
    </div>
  );
}
