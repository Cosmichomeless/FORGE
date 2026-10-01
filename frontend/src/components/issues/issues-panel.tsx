"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { keepPreviousData, useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import {
  issuePriorities, issueStatuses, issuesApi, issuesKey, priorityLabel, statusLabel,
  type IssuePriority, type IssueStatus,
} from "@/lib/issues-api";
import { organizationsApi } from "@/lib/organizations-api";
import { organizationsKey } from "@/components/organizations/organization-provider";
import { CreateIssueForm } from "./create-issue-form";

const PAGE_SIZE = 20;
const selectClass = "rounded-md border bg-transparent px-2 py-1.5 text-sm";

/** Filters live in the URL (?q, status, priority, assignee, page) so they survive reloads and can be shared. */
export function readFilters(params: URLSearchParams): { q: string; status: IssueStatus | ""; priority: IssuePriority | ""; assignee: string; page: number } {
  const status = params.get("status");
  const priority = params.get("priority");
  const page = Number.parseInt(params.get("page") ?? "1", 10);
  return {
    q: params.get("q")?.trim() ?? "",
    status: (issueStatuses as string[]).includes(status ?? "") ? (status as IssueStatus) : "",
    priority: (issuePriorities as string[]).includes(priority ?? "") ? (priority as IssuePriority) : "",
    assignee: params.get("assignee") ?? "",
    page: Number.isFinite(page) && page > 0 ? page - 1 : 0,
  };
}

function SearchBox({ initial, onSearch }: { initial: string; onSearch: (q: string) => void }) {
  const [draft, setDraft] = useState(initial);
  return (
    <form role="search" aria-label="Search issues" className="flex gap-2" onSubmit={event => { event.preventDefault(); onSearch(draft.trim()); }}>
      <input type="search" aria-label="Search" placeholder="Key or title" value={draft} onChange={event => setDraft(event.target.value)}
        className="w-56 rounded-md border bg-transparent px-3 py-1.5 text-sm" />
      <Button type="submit" size="sm" variant="outline">Search</Button>
    </form>
  );
}

export function IssuesPanel({ organizationId, projectId, archived }: { organizationId: string; projectId: string; archived: boolean }) {
  const router = useRouter();
  const pathname = usePathname();
  const search = useSearchParams();
  const filters = readFilters(new URLSearchParams(search.toString()));
  const [creating, setCreating] = useState(false);
  const hasFilters = !!(filters.q || filters.status || filters.priority || filters.assignee);

  const update = (changes: Record<string, string | null>) => {
    const next = new URLSearchParams(search.toString());
    for (const [name, value] of Object.entries(changes)) { if (value) next.set(name, value); else next.delete(name); }
    const query = next.toString();
    router.replace(query ? `${pathname}?${query}` : pathname, { scroll: false });
  };
  // Changing any filter returns to the first page; paging alone keeps the filters.
  const setFilter = (name: string, value: string) => update({ [name]: value, page: null });
  const setPage = (page: number) => update({ page: page > 0 ? String(page + 1) : null });

  const members = useQuery({ queryKey: [...organizationsKey, organizationId, "members"], queryFn: ({ signal }) => organizationsApi.members(organizationId, signal), retry: false });
  const issues = useQuery({
    queryKey: [...issuesKey(organizationId, projectId), "list", filters],
    queryFn: ({ signal }) => issuesApi.list(organizationId, projectId, { page: filters.page, size: PAGE_SIZE, q: filters.q, status: filters.status, priority: filters.priority, assignee: filters.assignee }, signal),
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
        onCreated={() => { setCreating(false); update({ page: null }); }} />}
      <div className="flex flex-wrap items-center gap-3 text-sm">
        <SearchBox key={filters.q} initial={filters.q} onSearch={q => setFilter("q", q)} />
        <label className="flex items-center gap-2">Status
          <select className={selectClass} value={filters.status} onChange={event => setFilter("status", event.target.value)}>
            <option value="">All</option>
            {issueStatuses.map(value => <option key={value} value={value}>{statusLabel[value]}</option>)}
          </select>
        </label>
        <label className="flex items-center gap-2">Priority
          <select className={selectClass} value={filters.priority} onChange={event => setFilter("priority", event.target.value)}>
            <option value="">All</option>
            {issuePriorities.map(value => <option key={value} value={value}>{priorityLabel[value]}</option>)}
          </select>
        </label>
        <label className="flex items-center gap-2">Assignee
          <select className={selectClass} value={filters.assignee} onChange={event => setFilter("assignee", event.target.value)}>
            <option value="">Anyone</option>
            <option value="none">Unassigned</option>
            {members.data?.map(member => <option key={member.userId} value={member.userId}>{member.name}</option>)}
          </select>
        </label>
        {hasFilters && <Button size="sm" variant="outline" onClick={() => router.replace(pathname, { scroll: false })}>Clear filters</Button>}
      </div>
      {issues.isPending && <p role="status">Loading issues…</p>}
      {issues.isError && <div className="space-y-2"><p role="alert">Unable to load issues.</p><Button onClick={() => { void issues.refetch(); }}>Retry</Button></div>}
      {data?.items.length === 0 && <p className="text-sm">{hasFilters ? "No issues match these filters." : archived ? "This archived project has no issues." : "No issues yet. Create the first one with “New issue”."}</p>}
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
