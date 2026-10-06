"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { keepPreviousData, useQuery } from "@tanstack/react-query";
import { Inbox, Plus, Search } from "lucide-react";
import { Alert } from "@/components/ui/alert";
import { Avatar } from "@/components/ui/avatar";
import { Code } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardDescription, CardHeader, CardTitle, Row, RowList } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { Select } from "@/components/ui/input";
import { ListSkeleton, LoadingState } from "@/components/ui/skeleton";
import { PriorityBadge, StatusBadge } from "./issue-badges";
import {
  issuePriorities, issueStatuses, issuesApi, issuesKey, priorityLabel, statusLabel,
  type IssuePriority, type IssueStatus,
} from "@/lib/issues-api";
import { organizationsApi } from "@/lib/organizations-api";
import { organizationsKey } from "@/components/organizations/organization-provider";
import { cn } from "@/lib/utils";
import { controlClass } from "@/components/ui/input";
import { CreateIssueForm } from "./create-issue-form";

const PAGE_SIZE = 20;

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
    <form role="search" aria-label="Search issues" className="col-span-2 flex gap-2 sm:col-auto" onSubmit={event => { event.preventDefault(); onSearch(draft.trim()); }}>
      <span className="relative inline-flex min-w-0 flex-1 items-center sm:flex-none">
        <Search aria-hidden="true" className="pointer-events-none absolute left-2.5 size-4 text-muted-foreground" />
        <input type="search" aria-label="Search" placeholder="Key or title" value={draft} onChange={event => setDraft(event.target.value)}
          className={cn(controlClass, "h-9 w-full pl-8 sm:w-60")} />
      </span>
      <Button type="submit" size="sm" variant="outline" className="h-9">Search</Button>
    </form>
  );
}

function Filter({ id, label, value, onChange, className, children }: { id: string; label: string; value: string; onChange: (value: string) => void; className?: string; children: React.ReactNode }) {
  return (
    <div className={cn("flex flex-col gap-1 sm:flex-row sm:items-center sm:gap-2", className)}>
      <label htmlFor={id} className="text-[0.8125rem] font-medium text-muted-foreground">{label}</label>
      <Select id={id} wrapperClassName="w-full sm:w-auto" className="w-full sm:w-36" value={value} onChange={event => onChange(event.target.value)}>{children}</Select>
    </div>
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
    <section aria-labelledby="issues-heading">
      <Card>
        <CardHeader actions={!archived && !creating ? <Button size="sm" onClick={() => setCreating(true)}><Plus aria-hidden="true" />New issue</Button> : undefined}>
          <CardTitle id="issues-heading">Issues</CardTitle>
          <CardDescription>{data ? `${data.totalItems} ${data.totalItems === 1 ? "issue" : "issues"}${hasFilters ? " match your filters" : ""}` : "Track and triage the work in this project."}</CardDescription>
        </CardHeader>
        {creating && <div className="border-b border-border bg-muted/40 p-4 sm:p-5"><CreateIssueForm organizationId={organizationId} projectId={projectId} onCancel={() => setCreating(false)}
          onCreated={() => { setCreating(false); update({ page: null }); }} /></div>}
        <div className="grid grid-cols-2 gap-3 border-b border-border px-4 py-3 sm:flex sm:flex-wrap sm:items-center sm:gap-x-4 sm:gap-y-2 sm:px-5">
          <SearchBox key={filters.q} initial={filters.q} onSearch={q => setFilter("q", q)} />
          <Filter id="filter-status" label="Status" value={filters.status} onChange={value => setFilter("status", value)}>
            <option value="">All</option>
            {issueStatuses.map(value => <option key={value} value={value}>{statusLabel[value]}</option>)}
          </Filter>
          <Filter id="filter-priority" label="Priority" value={filters.priority} onChange={value => setFilter("priority", value)}>
            <option value="">All</option>
            {issuePriorities.map(value => <option key={value} value={value}>{priorityLabel[value]}</option>)}
          </Filter>
          <Filter id="filter-assignee" label="Assignee" className="col-span-2 sm:col-auto" value={filters.assignee} onChange={value => setFilter("assignee", value)}>
            <option value="">Anyone</option>
            <option value="none">Unassigned</option>
            {members.data?.map(member => <option key={member.userId} value={member.userId}>{member.name}</option>)}
          </Filter>
          {hasFilters && <Button size="sm" variant="ghost" onClick={() => router.replace(pathname, { scroll: false })}>Clear filters</Button>}
        </div>
        {issues.isPending && <LoadingState label="Loading issues…"><ListSkeleton rows={5} /></LoadingState>}
        {issues.isError && <div className="p-4 sm:p-5"><Alert tone="error" role="alert" action={<Button size="sm" onClick={() => { void issues.refetch(); }}>Retry</Button>}>Unable to load issues.</Alert></div>}
        {data?.items.length === 0 && (hasFilters
          ? <EmptyState icon={<Search />} title="No issues match these filters." description="Try a different search or clear the filters." />
          : archived
            ? <EmptyState icon={<Inbox />} title="This archived project has no issues." />
            : <EmptyState icon={<Inbox />} title="No issues yet" description="Create the first one with “New issue”." />)}
        {data && data.items.length > 0 && <>
          <RowList className={cn("transition-opacity", issues.isFetching && issues.isPlaceholderData && "opacity-60")}>
            {data.items.map(issue => (
              <Row key={issue.id} className="gap-y-1.5">
                <div className="flex min-w-0 flex-1 basis-72 items-center gap-3">
                  <Code className="shrink-0">{issue.identifier}</Code>
                  <Link href={`/organizations/${organizationId}/projects/${projectId}/issues/${issue.number}`}
                    className="truncate text-sm font-medium text-foreground hover:text-link hover:underline">{issue.title}</Link>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <StatusBadge status={issue.status} />
                  <PriorityBadge priority={issue.priority} />
                  <span className="flex min-w-28 items-center gap-2 text-[0.8125rem] text-muted-foreground">
                    {issue.assignee ? <><Avatar name={issue.assignee.name} size="sm" /><span className="text-foreground">{issue.assignee.name}</span></> : "Unassigned"}
                  </span>
                </div>
              </Row>
            ))}
          </RowList>
          <nav aria-label="Issues pagination" className="flex flex-wrap items-center justify-between gap-2 border-t border-border px-4 py-3 text-[0.8125rem] text-muted-foreground sm:px-5">
            <span>Page {data.page + 1} of {Math.max(data.totalPages, 1)} · {data.totalItems} {data.totalItems === 1 ? "issue" : "issues"}</span>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" disabled={data.page === 0} onClick={() => setPage(data.page - 1)}>Previous</Button>
              <Button variant="outline" size="sm" disabled={data.page + 1 >= data.totalPages} onClick={() => setPage(data.page + 1)}>Next</Button>
            </div>
          </nav>
        </>}
      </Card>
    </section>
  );
}
