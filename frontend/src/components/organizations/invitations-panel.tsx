"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { TextField } from "@/components/ui/text-field";
import { ApiError } from "@/lib/http";
import { organizationsApi, type CreatedInvitation, type Organization } from "@/lib/organizations-api";
import { organizationsKey } from "./organization-provider";

const schema = z.object({
  email: z.string().trim().toLowerCase().max(254, "Email must be at most 254 characters").pipe(z.email("Enter a valid email")),
  role: z.enum(["ADMIN", "MEMBER"]),
});
type Values = z.infer<typeof schema>;
const describe = (error: unknown) => error instanceof ApiError ? error.message : "Unable to connect. Please try again.";

export function acceptanceLink(token: string) {
  return `${window.location.origin}/invitations/accept#token=${encodeURIComponent(token)}`;
}

export function InvitationsPanel({ organization }: { organization: Organization }) {
  const client = useQueryClient();
  const key = [...organizationsKey, organization.id, "invitations"];
  const [created, setCreated] = useState<CreatedInvitation | null>(null);
  const [message, setMessage] = useState("");
  const pending = useQuery({ queryKey: key, queryFn: ({ signal }) => organizationsApi.invitations(organization.id, signal), retry: false });
  const { register, handleSubmit, setError, reset, formState: { errors } } = useForm<Values>({
    resolver: zodResolver(schema), defaultValues: { email: "", role: "MEMBER" },
  });
  const invite = useMutation({
    mutationFn: (values: Values) => organizationsApi.invite(organization.id, values),
    onSuccess: async invitation => { setCreated(invitation); reset(); await client.invalidateQueries({ queryKey: key }); },
    onError: error => {
      setCreated(null);
      setError("root", { message: describe(error) });
      if (error instanceof ApiError) for (const field of ["email", "role"] as const) if (error.fieldErrors[field]) setError(field, { message: error.fieldErrors[field] });
    },
  });
  const revoke = useMutation({
    mutationFn: (id: string) => organizationsApi.revokeInvitation(organization.id, id),
    onMutate: () => setMessage(""),
    onSuccess: () => client.invalidateQueries({ queryKey: key }),
    onError: error => { setMessage(describe(error)); void client.invalidateQueries({ queryKey: key }); },
  });
  return (
    <section aria-labelledby="invitations-heading" className="space-y-4">
      <h2 id="invitations-heading" className="text-xl font-semibold">Invitations</h2>
      <form noValidate aria-busy={invite.isPending} className="max-w-sm space-y-4"
        onSubmit={event => { void handleSubmit(values => { if (!invite.isPending) invite.mutate(values); })(event); }}>
        <TextField label="Email to invite" type="email" autoComplete="off" error={errors.email?.message} {...register("email")} />
        <div className="space-y-1">
          <label htmlFor="invite-role" className="block text-sm font-medium">Role</label>
          <select id="invite-role" {...register("role")} className="w-full rounded-md border border-neutral-300 px-3 py-2 text-sm">
            <option value="MEMBER">MEMBER</option><option value="ADMIN">ADMIN</option>
          </select>
          {errors.role && <p role="alert" className="text-sm text-red-600">{errors.role.message}</p>}
        </div>
        {errors.root && <p role="alert" className="text-sm text-red-600">{errors.root.message}</p>}
        <Button type="submit" disabled={invite.isPending}>{invite.isPending ? "Sending…" : "Create invitation"}</Button>
      </form>
      {created && <div role="status" className="space-y-2 rounded-md border p-3 text-sm">
        <p>Invitation created for {created.email}. Share this link now; it is shown only once and expires {new Date(created.expiresAt).toLocaleString()}.</p>
        <input readOnly aria-label="Invitation link" value={acceptanceLink(created.token)} onFocus={event => event.currentTarget.select()}
          className="w-full rounded-md border border-neutral-300 px-3 py-2 font-mono text-xs" />
      </div>}
      {message && <p role="alert" className="text-sm text-red-600">{message}</p>}
      {pending.isPending && <p role="status">Loading invitations…</p>}
      {pending.isError && <div className="space-y-2"><p role="alert">Unable to load invitations.</p><Button onClick={() => { void pending.refetch(); }}>Retry</Button></div>}
      {pending.data && (pending.data.length === 0
        ? <p className="text-sm text-neutral-600">No pending invitations.</p>
        : <ul className="divide-y rounded-md border">
          {pending.data.map(invitation => (
            <li key={invitation.id} className="flex flex-wrap items-center justify-between gap-3 p-3">
              <div>
                <p className="font-medium">{invitation.email}</p>
                <p className="text-sm text-neutral-600">{invitation.role} · expires {new Date(invitation.expiresAt).toLocaleDateString()}</p>
              </div>
              <Button variant="outline" size="sm" disabled={revoke.isPending} onClick={() => revoke.mutate(invitation.id)}
                aria-label={`Revoke invitation for ${invitation.email}`}>
                Revoke
              </Button>
            </li>
          ))}
        </ul>)}
    </section>
  );
}
