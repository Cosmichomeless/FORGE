"use client";

import { useState } from "react";
import Link from "next/link";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { TextField } from "@/components/ui/text-field";
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
const selectClass = "rounded-md border bg-transparent px-2 py-1.5 text-sm";

function EditIssueForm({ issue, organizationId, projectId, onSaved }: { issue: Issue; organizationId: string; projectId: string; onSaved: (issue: Issue) => void }) {
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
    <form noValidate aria-label="Edit issue" aria-busy={save.isPending} className="max-w-md space-y-4"
      onSubmit={event => { void handleSubmit(values => { if (!save.isPending) save.mutate(values); })(event); }}>
      <TextField label="Title" autoComplete="off" error={errors.title?.message} {...register("title")} />
      <TextField label="Description (optional)" autoComplete="off" error={errors.description?.message} {...register("description")} />
      {errors.root && <p role="alert" className="text-sm text-red-600">{errors.root.message}</p>}
      <Button type="submit" disabled={save.isPending || !isDirty}>{save.isPending ? "Saving…" : "Save changes"}</Button>
    </form>
  );
}

export function IssueDetail({ organizationId, projectId, number }: { organizationId: string; projectId: string; number: string }) {
  const client = useQueryClient();
  const [message, setMessage] = useState("");
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
  if (issue.isPending || project.isPending) return <p role="status">Loading issue…</p>;
  if (issue.isError || project.isError) {
    const missing = [issue.error, project.error].some(error => error instanceof ApiError && (error.status === 404 || error.status === 400));
    return <div className="space-y-4">
      <p role="alert">{missing ? "Issue not found, or you do not have access to it." : "Unable to load this issue."}</p>
      {!missing && <Button onClick={() => { void issue.refetch(); void project.refetch(); }}>Retry</Button>}
      <p className="text-sm"><Link href={back} className="underline">Back to project</Link></p>
    </div>;
  }
  const data = issue.data;
  const locked = project.data.status === "ARCHIVED";
  const busy = assign.isPending || setStatus.isPending || setPriority.isPending;
  return (
    <div className="space-y-8">
      <p className="text-sm"><Link href={back} className="underline">← {project.data.name}</Link></p>
      <header className="space-y-2">
        <p className="text-sm text-neutral-600"><code className="rounded bg-neutral-100 px-1.5 py-0.5">{data.identifier}</code></p>
        <h1 className="text-3xl font-semibold">{data.title}</h1>
        <p className="whitespace-pre-wrap">{data.description || <span className="text-neutral-600">No description.</span>}</p>
        <dl className="flex flex-wrap gap-x-6 gap-y-1 text-sm text-neutral-600">
          <div className="flex gap-1"><dt>Created by:</dt><dd>{data.createdBy.name}</dd></div>
          <div className="flex gap-1"><dt>Created:</dt><dd>{new Date(data.createdAt).toLocaleString()}</dd></div>
          <div className="flex gap-1"><dt>Updated:</dt><dd>{new Date(data.updatedAt).toLocaleString()}</dd></div>
        </dl>
      </header>
      {locked && <p role="status" className="rounded-md border p-3 text-sm">This project is archived, so its issues are read-only.</p>}
      {message && <p role="alert" className="text-sm text-red-600">{message}</p>}
      <section aria-labelledby="issue-workflow" className="space-y-3">
        <h2 id="issue-workflow" className="text-xl font-semibold">Details</h2>
        <div className="flex flex-wrap gap-6 text-sm">
          <label className="flex items-center gap-2">Status
            <select className={selectClass} value={data.status} disabled={locked || busy} onChange={event => setStatus.mutate(event.target.value as IssueStatus)}>
              {issueStatuses.map(value => <option key={value} value={value}>{statusLabel[value]}</option>)}
            </select>
          </label>
          <label className="flex items-center gap-2">Priority
            <select className={selectClass} value={data.priority} disabled={locked || busy} onChange={event => setPriority.mutate(event.target.value as IssuePriority)}>
              {issuePriorities.map(value => <option key={value} value={value}>{priorityLabel[value]}</option>)}
            </select>
          </label>
          <label className="flex items-center gap-2">Assignee
            <select className={selectClass} value={data.assignee?.id ?? ""} disabled={locked || busy || members.isPending}
              onChange={event => assign.mutate(event.target.value || null)}>
              <option value="">Unassigned</option>
              {members.data?.map(member => <option key={member.userId} value={member.userId}>{member.name}</option>)}
            </select>
          </label>
        </div>
        {members.isError && <p role="alert" className="text-sm text-red-600">Unable to load organization members.</p>}
      </section>
      {!locked && <section aria-labelledby="issue-edit" className="space-y-3">
        <h2 id="issue-edit" className="text-xl font-semibold">Edit</h2>
        <EditIssueForm key={data.updatedAt} issue={data} organizationId={organizationId} projectId={projectId} onSaved={updated => { void apply(updated); }} />
      </section>}
      <CommentThread organizationId={organizationId} projectId={projectId} number={number} locked={locked} />
      <ActivityTimeline organizationId={organizationId} projectId={projectId} number={number} />
    </div>
  );
}
