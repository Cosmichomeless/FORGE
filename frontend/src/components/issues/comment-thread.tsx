"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { commentsApi, commentsKey, type Comment } from "@/lib/comments-api";
import { ApiError } from "@/lib/http";

const schema = z.object({ body: z.string().trim().min(1, "Comment cannot be empty").max(5000, "Comment must be at most 5000 characters") });
type Values = z.infer<typeof schema>;
const describe = (error: unknown) => error instanceof ApiError ? error.message : "Unable to connect. Please try again.";

function CommentForm({ label, initial = "", submitLabel, pendingLabel, onSubmit, onCancel }: {
  label: string; initial?: string; submitLabel: string; pendingLabel: string; onSubmit: (body: string) => Promise<void>; onCancel?: () => void;
}) {
  const { register, handleSubmit, reset, setError, formState: { errors, isSubmitting } } = useForm<Values>({ resolver: zodResolver(schema), defaultValues: { body: initial } });
  return (
    <form noValidate aria-label={`${label} form`} aria-busy={isSubmitting} className="space-y-2"
      onSubmit={event => { void handleSubmit(async values => {
        try { await onSubmit(values.body); reset({ body: "" }); } catch (error) { setError("root", { message: describe(error) }); }
      })(event); }}>
      <label className="block text-sm font-medium" htmlFor={`${label}-body`}>{label}</label>
      <textarea id={`${label}-body`} rows={3} aria-invalid={!!errors.body} className="w-full rounded-md border border-neutral-300 px-3 py-2 text-sm" {...register("body")} />
      {errors.body && <p role="alert" className="text-sm text-red-600">{errors.body.message}</p>}
      {errors.root && <p role="alert" className="text-sm text-red-600">{errors.root.message}</p>}
      <div className="flex gap-2">
        <Button type="submit" size="sm" disabled={isSubmitting}>{isSubmitting ? pendingLabel : submitLabel}</Button>
        {onCancel && <Button type="button" size="sm" variant="outline" onClick={onCancel} disabled={isSubmitting}>Cancel</Button>}
      </div>
    </form>
  );
}

export function CommentThread({ organizationId, projectId, number, locked }: { organizationId: string; projectId: string; number: string; locked: boolean }) {
  const client = useQueryClient();
  const [editing, setEditing] = useState<string | null>(null);
  const [message, setMessage] = useState("");
  const key = commentsKey(organizationId, projectId, number);
  const comments = useQuery({ queryKey: key, queryFn: ({ signal }) => commentsApi.list(organizationId, projectId, number, signal), retry: false });
  const refresh = () => client.invalidateQueries({ queryKey: key });
  const remove = useMutation({
    mutationFn: (id: string) => commentsApi.remove(organizationId, projectId, number, id),
    onSuccess: async () => { setMessage(""); await refresh(); },
    onError: error => { setMessage(describe(error)); void refresh(); },
  });
  return (
    <section aria-labelledby="comments-heading" className="space-y-4">
      <h2 id="comments-heading" className="text-xl font-semibold">Comments</h2>
      {comments.isPending && <p role="status">Loading comments…</p>}
      {comments.isError && <div className="space-y-2"><p role="alert">Unable to load comments.</p><Button onClick={() => { void comments.refetch(); }}>Retry</Button></div>}
      {comments.data?.length === 0 && <p className="text-sm">No comments yet.</p>}
      {message && <p role="alert" className="text-sm text-red-600">{message}</p>}
      {!!comments.data?.length && <ul className="space-y-3">
        {comments.data.map((comment: Comment) => (
          <li key={comment.id} className="space-y-2 rounded-md border p-3">
            <div className="flex flex-wrap items-center justify-between gap-2 text-sm text-neutral-600">
              <span><strong>{comment.author.name}</strong> · {new Date(comment.createdAt).toLocaleString()}{comment.updatedAt !== comment.createdAt && " (edited)"}</span>
              <span className="flex gap-2">
                {comment.canEdit && editing !== comment.id && <Button size="sm" variant="outline" onClick={() => setEditing(comment.id)}>Edit</Button>}
                {comment.canDelete && <Button size="sm" variant="outline" disabled={remove.isPending} onClick={() => remove.mutate(comment.id)}>Delete</Button>}
              </span>
            </div>
            {editing === comment.id
              ? <CommentForm label="Edit comment" initial={comment.body} submitLabel="Save" pendingLabel="Saving…" onCancel={() => setEditing(null)}
                  onSubmit={async body => { await commentsApi.edit(organizationId, projectId, number, comment.id, body); setEditing(null); await refresh(); }} />
              : <p className="whitespace-pre-wrap">{comment.body}</p>}
          </li>
        ))}
      </ul>}
      {locked
        ? <p className="text-sm text-neutral-600">Comments are closed because the project is archived.</p>
        : <CommentForm label="Add a comment" submitLabel="Comment" pendingLabel="Sending…" onSubmit={async body => { await commentsApi.add(organizationId, projectId, number, body); await refresh(); }} />}
    </section>
  );
}
