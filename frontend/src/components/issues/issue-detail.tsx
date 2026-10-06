"use client";

import { useState } from "react";
import Link from "next/link";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { z } from "zod";
import { ArrowLeft, Pencil } from "lucide-react";
import { Alert } from "@/components/ui/alert";
import { Avatar } from "@/components/ui/avatar";
import { Code } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardBody, CardHeader, CardTitle } from "@/components/ui/card";
import { Select } from "@/components/ui/input";
import { PageContainer } from "@/components/ui/page-container";
import { Breadcrumbs, PageHeader } from "@/components/ui/page-header";
import { LoadingState, Skeleton } from "@/components/ui/skeleton";
import { TextAreaField, TextField } from "@/components/ui/text-field";
import { PriorityBadge, StatusBadge } from "./issue-badges";
import { organizationsKey } from "@/components/organizations/organization-provider";
import { ApiError } from "@/lib/http";
import { issueKey, issuePriorities, issueStatuses, issuesApi, issuesKey, priorityLabel, statusLabel, type Issue, type IssuePriority, type IssueStatus } from "@/lib/issues-api";
import { organizationsApi } from "@/lib/organizations-api";
import { projectKey, projectsApi } from "@/lib/projects-api";
import { ActivityTimeline } from "./activity-timeline";
import { CommentThread } from "./comment-thread";
import { issueDescriptionSchema, issueTitleSchema } from "./create-issue-form";

const describe = (error: unknown) => error instanceof ApiError ? error.message : "Unable to connect. Please try again.";
const editSchema = z.object({ title: issueTitleSchema, description: issueDescriptionSchema });
type EditValues = z.infer<typeof editSchema>;

function EditIssueForm({ issue, organizationId, projectId, onSaved, onCancel }: { issue: Issue; organizationId: string; projectId: string; onSaved: (issue: Issue) => void; onCancel: () => void }) {
  const { register, handleSubmit, setError, formState: { errors, isDirty } } = useForm<EditValues>({
    resolver: zodResolver(editSchema), defaultValues: { title: issue.title, description: issue.description ?? "" },
  });
  const save = useMutation({
    mutationFn: (values: EditValues) => issuesApi.edit(organizationId, projectId, issue.number, { title: values.title, description: values.description || undefined }),
    onSuccess: onSaved,
    onError: error => {
      setError("root", { message: describe(error) });
      if (error instanceof ApiError) for (const field of ["title", "description"] as const) if (error.fieldErrors[field]) setError(field, { message: error.fieldErrors[field] });
    },
  });
  return (
    <form noValidate aria-label="Edit issue" aria-busy={save.isPending} className="space-y-4"
      onSubmit={event => { void handleSubmit(values => { if (!save.isPending) save.mutate(values); })(event); }}>
      <TextField label="Title" autoComplete="off" error={errors.title?.message} {...register("title")} />
      <TextAreaField label="Description (optional)" rows={5} error={errors.description?.message} {...register("description")} />
      {errors.root && <Alert tone="error" role="alert">{errors.root.message}</Alert>}
      <div className="flex gap-2">
        <Button type="submit" disabled={save.isPending || !isDirty}>{save.isPending ? "Saving…" : "Save changes"}</Button>
        <Button type="button" variant="outline" onClick={onCancel} disabled={save.isPending}>Cancel</Button>
      </div>
    </form>
  );
}

export function IssueDetail({ organizationId, projectId, number }: { organizationId: string; projectId: string; number: string }) {
  const client = useQueryClient();
  const [message, setMessage] = useState("");
  const [editing, setEditing] = useState(false);
  const key = issueKey(organizationId, projectId, number);
  const issue = useQuery({ queryKey: key, queryFn: ({ signal }) => issuesApi.get(organizationId, projectId, number, signal), retry: false });
  const project = useQuery({ queryKey: projectKey(organizationId, projectId), queryFn: ({ signal }) => projectsApi.get(organizationId, projectId, signal), retry: false });
  const members = useQuery({ queryKey: [...organizationsKey, organizationId, "members"], queryFn: ({ signal }) => organizationsApi.members(organizationId, signal), retry: false });

  const apply = async (updated: Issue) => {
    setMessage("");
    client.setQueryData(key, updated);
    await client.invalidateQueries({ queryKey: issuesKey(organizationId, projectId) });
  };
  const fail = (error: unknown) => { setMessage(describe(error)); void client.invalidateQueries({ queryKey: key }); };
  const assign = useMutation({ mutationFn: (assigneeId: string | null) => issuesApi.assign(organizationId, projectId, Number(number), assigneeId), onSuccess: apply, onError: fail });
  const setStatus = useMutation({ mutationFn: (status: IssueStatus) => issuesApi.setStatus(organizationId, projectId, Number(number), status), onSuccess: apply, onError: fail });
  const setPriority = useMutation({ mutationFn: (priority: IssuePriority) => issuesApi.setPriority(organizationId, projectId, Number(number), priority), onSuccess: apply, onError: fail });

  const back = `/organizations/${organizationId}/projects/${projectId}`;
  if (issue.isPending || project.isPending) {
    return (
      <PageContainer size="wide">
        <LoadingState label="Loading issue…" className="space-y-6">
          <Skeleton className="h-4 w-56" />
          <Skeleton className="h-8 w-96 max-w-full" />
          <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_20rem]"><Skeleton className="h-56 rounded-xl" /><Skeleton className="h-56 rounded-xl" /></div>
        </LoadingState>
      </PageContainer>
    );
  }
  if (issue.isError || project.isError) {
    const missing = [issue.error, project.error].some(error => error instanceof ApiError && (error.status === 404 || error.status === 400));
    return <PageContainer size="narrow" className="space-y-4">
      <Alert tone="error" role="alert" action={!missing ? <Button size="sm" onClick={() => { void issue.refetch(); void project.refetch(); }}>Retry</Button> : undefined}>
        {missing ? "Issue not found, or you do not have access to it." : "Unable to load this issue."}
      </Alert>
      <Button asChild variant="outline" size="sm"><Link href={back}><ArrowLeft aria-hidden="true" />Back to project</Link></Button>
    </PageContainer>;
  }
  const data = issue.data;
  const locked = project.data.status === "ARCHIVED";
  const busy = assign.isPending || setStatus.isPending || setPriority.isPending;
  return (
    <PageContainer size="wide" className="space-y-6">
      <PageHeader title={data.title}
        breadcrumbs={<Breadcrumbs items={[{ label: "Projects", href: back }, { label: project.data.name, href: back }, { label: data.identifier }]} />}
        meta={<div className="flex flex-wrap items-center gap-2"><Code>{data.identifier}</Code><StatusBadge status={data.status} /><PriorityBadge priority={data.priority} /></div>}
        actions={!locked && !editing ? <Button variant="outline" size="sm" onClick={() => setEditing(true)}><Pencil aria-hidden="true" />Edit issue</Button> : undefined} />
      {locked && <Alert tone="warning" role="status">This project is archived, so its issues are read-only.</Alert>}
      {message && <Alert tone="error" role="alert">{message}</Alert>}
      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_20rem] lg:items-start">
        <aside aria-labelledby="issue-workflow" className="lg:col-start-2 lg:row-start-1">
          <Card>
            <CardHeader><CardTitle id="issue-workflow">Details</CardTitle></CardHeader>
            <CardBody className="space-y-4">
              <div className="space-y-1.5">
                <label htmlFor="issue-status" className="block text-[0.8125rem] font-medium">Status</label>
                <Select id="issue-status" value={data.status} disabled={locked || busy} onChange={event => setStatus.mutate(event.target.value as IssueStatus)}>
                  {issueStatuses.map(value => <option key={value} value={value}>{statusLabel[value]}</option>)}
                </Select>
              </div>
              <div className="space-y-1.5">
                <label htmlFor="issue-priority" className="block text-[0.8125rem] font-medium">Priority</label>
                <Select id="issue-priority" value={data.priority} disabled={locked || busy} onChange={event => setPriority.mutate(event.target.value as IssuePriority)}>
                  {issuePriorities.map(value => <option key={value} value={value}>{priorityLabel[value]}</option>)}
                </Select>
              </div>
              <div className="space-y-1.5">
                <label htmlFor="issue-assignee" className="block text-[0.8125rem] font-medium">Assignee</label>
                <Select id="issue-assignee" value={data.assignee?.id ?? ""} disabled={locked || busy || members.isPending} onChange={event => assign.mutate(event.target.value || null)}>
                  <option value="">Unassigned</option>
                  {members.data?.map(member => <option key={member.userId} value={member.userId}>{member.name}</option>)}
                </Select>
              </div>
              {members.isError && <Alert tone="error" role="alert">Unable to load organization members.</Alert>}
              <dl className="space-y-2 border-t border-border pt-4 text-[0.8125rem]">
                <div className="flex items-center justify-between gap-3"><dt className="text-muted-foreground">Created by</dt><dd className="flex items-center gap-2"><Avatar name={data.createdBy.name} size="sm" /><span>{data.createdBy.name}</span></dd></div>
                <div className="flex items-center justify-between gap-3"><dt className="text-muted-foreground">Created</dt><dd>{new Date(data.createdAt).toLocaleString()}</dd></div>
                <div className="flex items-center justify-between gap-3"><dt className="text-muted-foreground">Updated</dt><dd>{new Date(data.updatedAt).toLocaleString()}</dd></div>
              </dl>
            </CardBody>
          </Card>
        </aside>
        <div className="min-w-0 space-y-6 lg:col-start-1 lg:row-start-1">
          <section aria-labelledby="issue-description">
            <Card>
              <CardHeader><CardTitle id="issue-description">Description</CardTitle></CardHeader>
              <CardBody>
                {editing && !locked
                  ? <EditIssueForm key={data.updatedAt} issue={data} organizationId={organizationId} projectId={projectId}
                      onCancel={() => setEditing(false)} onSaved={updated => { setEditing(false); void apply(updated); }} />
                  : <p className="whitespace-pre-wrap text-sm leading-6">{data.description || <span className="text-muted-foreground">No description.</span>}</p>}
              </CardBody>
            </Card>
          </section>
          <CommentThread organizationId={organizationId} projectId={projectId} number={number} locked={locked} />
          <ActivityTimeline organizationId={organizationId} projectId={projectId} number={number} />
        </div>
      </div>
    </PageContainer>
  );
}
