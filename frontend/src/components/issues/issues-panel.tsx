"use client";

import { useState } from "react";
import Link from "next/link";
import { keepPreviousData, useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { issuesApi, issuesKey, priorityLabel, statusLabel } from "@/lib/issues-api";
import { CreateIssueForm } from "./create-issue-form";

const PAGE_SIZE = 20;

export function IssuesPanel({ organizationId, projectId, archived }: { organizationId: string; projectId: string; archived: boolean }) {
  const [page, setPage] = useState(0);
  const [creating, setCreating] = useState(false);
  const issues = useQuery({
    queryKey: [...issuesKey(organizationId, projectId), "list", page],
    queryFn: ({ signal }) => issuesApi.list(organizationId, projectId, { page, size: PAGE_SIZE }, signal),
    placeholderData: keepPreviousData, retry: false,
  });
  const data = issues.data;
  return (
    <section aria-labelledby="issues-heading" className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 id="issues-heading" className="text-xl font-semibold">Issues</h2>
        {!archived && !creating && <Button size="sm" onClick={() => setCreating(true)}>New issue</Button>}
      </div>
      {creating && <CreateIssueForm organizationId={organizationId} projectId={projectId} onCancel={() => setCreating(false)}
        onCreated={() => { setCreating(false); setPage(0); }} />}
      {issues.isPending && <p role="status">Loading issues…</p>}
      {issues.isError && <div className="space-y-2"><p role="alert">Unable to load issues.</p><Button onClick={() => { void issues.refetch(); }}>Retry</Button></div>}
      {data?.items.length === 0 && <p className="text-sm">{archived ? "This archived project has no issues." : "No issues yet. Create the first one with “New issue”."}</p>}
      {data && data.items.length > 0 && <>
        <ul className="divide-y rounded-md border">
          {data.items.map(issue => (
            <li key={issue.id} className="flex flex-wrap items-center justify-between gap-3 p-3">
              <div className="flex items-center gap-3">
                <code className="rounded bg-neutral-100 px-1.5 py-0.5 text-sm">{issue.identifier}</code>
                <Link href={`/organizations/${organizationId}/projects/${projectId}/issues/${issue.number}`} className="font-medium underline">{issue.title}</Link>
              </div>
              <div className="flex items-center gap-3 text-sm text-neutral-600">
                <span>{statusLabel[issue.status]}</span>
                <span>{priorityLabel[issue.priority]}</span>
                <span>{issue.assignee ? issue.assignee.name : "Unassigned"}</span>
              </div>
            </li>
          ))}
        </ul>
        <nav aria-label="Issues pagination" className="flex items-center justify-between text-sm">
          <span>Page {data.page + 1} of {Math.max(data.totalPages, 1)} · {data.totalItems} issues</span>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" disabled={data.page === 0} onClick={() => setPage(data.page - 1)}>Previous</Button>
            <Button variant="outline" size="sm" disabled={data.page + 1 >= data.totalPages} onClick={() => setPage(data.page + 1)}>Next</Button>
          </div>
        </nav>
      </>}
    </section>
  );
}
