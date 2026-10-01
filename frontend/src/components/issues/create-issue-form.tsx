"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { TextField } from "@/components/ui/text-field";
import { ApiError } from "@/lib/http";
import { issuesApi, issuesKey, type Issue } from "@/lib/issues-api";

export const issueTitleSchema = z.string().trim().min(1, "Title is required").max(200, "Title must be at most 200 characters");
export const issueDescriptionSchema = z.string().trim().max(5000, "Description must be at most 5000 characters");
const schema = z.object({ title: issueTitleSchema, description: issueDescriptionSchema });
type Values = z.infer<typeof schema>;

export function CreateIssueForm({ organizationId, projectId, onCreated, onCancel }: {
  organizationId: string; projectId: string; onCreated: (issue: Issue) => void; onCancel: () => void;
}) {
  const client = useQueryClient();
  const { register, handleSubmit, setError, formState: { errors } } = useForm<Values>({ resolver: zodResolver(schema), defaultValues: { title: "", description: "" } });
  const create = useMutation({
    mutationFn: (values: Values) => issuesApi.create(organizationId, projectId, { title: values.title, description: values.description || undefined }),
    onSuccess: async issue => { await client.invalidateQueries({ queryKey: issuesKey(organizationId, projectId) }); onCreated(issue); },
    onError: error => {
      setError("root", { message: error instanceof ApiError ? error.message : "Unable to connect. Please try again." });
      if (error instanceof ApiError) for (const field of ["title", "description"] as const) if (error.fieldErrors[field]) setError(field, { message: error.fieldErrors[field] });
    },
  });
  return (
    <form noValidate aria-label="New issue" aria-busy={create.isPending} className="max-w-md space-y-4 rounded-md border p-4"
      onSubmit={event => { void handleSubmit(values => { if (!create.isPending) create.mutate(values); })(event); }}>
      <TextField label="Title" autoComplete="off" error={errors.title?.message} {...register("title")} />
      <TextField label="Description (optional)" autoComplete="off" error={errors.description?.message} {...register("description")} />
      {errors.root && <p role="alert" className="text-sm text-red-600">{errors.root.message}</p>}
      <div className="flex gap-2">
        <Button type="submit" disabled={create.isPending}>{create.isPending ? "Creating…" : "Create issue"}</Button>
        <Button type="button" variant="outline" onClick={onCancel} disabled={create.isPending}>Cancel</Button>
      </div>
    </form>
  );
}
