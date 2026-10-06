"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { z } from "zod";
import { MessageSquare } from "lucide-react";
import { Alert } from "@/components/ui/alert";
import { Avatar } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardBody, CardHeader, CardTitle } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { ListSkeleton, LoadingState } from "@/components/ui/skeleton";
import { TextAreaField } from "@/components/ui/text-field";
import { activityKey } from "@/lib/activity-api";
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
    <form noValidate aria-label={`${label} form`} aria-busy={isSubmitting} className="space-y-3"
      onSubmit={event => { void handleSubmit(async values => {
        try { await onSubmit(values.body); reset({ body: "" }); } catch (error) { setError("root", { message: describe(error) }); }
      })(event); }}>
      <TextAreaField label={label} rows={3} error={errors.body?.message} {...register("body")} />
      {errors.root && <Alert tone="error" role="alert">{errors.root.message}</Alert>}
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
  const refresh = async () => { await Promise.all([client.invalidateQueries({ queryKey: key }), client.invalidateQueries({ queryKey: activityKey(organizationId, projectId, number) })]); };
  const remove = useMutation({
    mutationFn: (id: string) => commentsApi.remove(organizationId, projectId, number, id),
    onSuccess: async () => { setMessage(""); await refresh(); },
    onError: error => { setMessage(describe(error)); void refresh(); },
  });
  return (
    <section aria-labelledby="comments-heading">
      <Card>
        <CardHeader actions={!!comments.data?.length ? <Badge>{comments.data.length}</Badge> : undefined}>
          <CardTitle id="comments-heading">Comments</CardTitle>
        </CardHeader>
        {comments.isPending && <LoadingState label="Loading comments…"><ListSkeleton rows={2} /></LoadingState>}
        {comments.isError && <div className="p-4 sm:p-5"><Alert tone="error" role="alert" action={<Button size="sm" onClick={() => { void comments.refetch(); }}>Retry</Button>}>Unable to load comments.</Alert></div>}
        {comments.data?.length === 0 && <EmptyState icon={<MessageSquare />} title="No comments yet." description={locked ? undefined : "Start the conversation below."} />}
        {message && <div className="px-4 pt-4 sm:px-5"><Alert tone="error" role="alert">{message}</Alert></div>}
        {!!comments.data?.length && <ul className="divide-y divide-border">
          {comments.data.map((comment: Comment) => (
            <li key={comment.id} className="flex gap-3 px-4 py-4 sm:px-5">
              <Avatar name={comment.author.name} />
              <div className="min-w-0 flex-1 space-y-1.5">
                <div className="flex flex-wrap items-center justify-between gap-2 text-[0.8125rem] text-muted-foreground">
                  <span><strong className="font-semibold text-foreground">{comment.author.name}</strong> · {new Date(comment.createdAt).toLocaleString()}{comment.updatedAt !== comment.createdAt && " (edited)"}</span>
                  <span className="flex gap-2">
                    {comment.canEdit && editing !== comment.id && <Button size="sm" variant="ghost" onClick={() => setEditing(comment.id)}>Edit</Button>}
                    {comment.canDelete && <Button size="sm" variant="ghost" className="text-danger-soft-foreground hover:bg-danger-soft" disabled={remove.isPending} onClick={() => remove.mutate(comment.id)}>Delete</Button>}
                  </span>
                </div>
                {editing === comment.id
                  ? <CommentForm label="Edit comment" initial={comment.body} submitLabel="Save" pendingLabel="Saving…" onCancel={() => setEditing(null)}
                      onSubmit={async body => { await commentsApi.edit(organizationId, projectId, number, comment.id, body); setEditing(null); await refresh(); }} />
                  : <p className="whitespace-pre-wrap text-sm leading-6 text-foreground">{comment.body}</p>}
              </div>
            </li>
          ))}
        </ul>}
        <CardBody className="border-t border-border bg-muted/30">
          {locked
            ? <p className="text-sm text-muted-foreground">Comments are closed because the project is archived.</p>
            : <CommentForm label="Add a comment" submitLabel="Comment" pendingLabel="Sending…" onSubmit={async body => { await commentsApi.add(organizationId, projectId, number, body); await refresh(); }} />}
        </CardBody>
      </Card>
    </section>
  );
}
