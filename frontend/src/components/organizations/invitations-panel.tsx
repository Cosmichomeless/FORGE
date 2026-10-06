"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { z } from "zod";
import { Mail, UserPlus } from "lucide-react";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card, CardBody, CardDescription, CardHeader, CardTitle, Row, RowList } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { Select, controlClass } from "@/components/ui/input";
import { ListSkeleton, LoadingState } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
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
    <section aria-labelledby="invitations-heading">
      <Card>
        <CardHeader>
          <CardTitle id="invitations-heading">Invitations</CardTitle>
          <CardDescription>Invite teammates with a one-time link.</CardDescription>
        </CardHeader>
        <CardBody className="space-y-4">
          <form noValidate aria-busy={invite.isPending} className="space-y-4"
            onSubmit={event => { void handleSubmit(values => { if (!invite.isPending) invite.mutate(values); })(event); }}>
            <TextField label="Email to invite" type="email" autoComplete="off" placeholder="name@company.com" error={errors.email?.message} {...register("email")} />
            <div className="space-y-1.5">
              <label htmlFor="invite-role" className="block text-[0.8125rem] font-medium">Role</label>
              <Select id="invite-role" {...register("role")}>
                <option value="MEMBER">MEMBER</option><option value="ADMIN">ADMIN</option>
              </Select>
              {errors.role && <p role="alert" className="text-[0.8125rem] text-danger-soft-foreground">{errors.role.message}</p>}
            </div>
            {errors.root && <Alert tone="error" role="alert">{errors.root.message}</Alert>}
            <Button type="submit" disabled={invite.isPending}><UserPlus aria-hidden="true" />{invite.isPending ? "Sending…" : "Create invitation"}</Button>
          </form>
          {created && <Alert tone="success" role="status">
            <p>Invitation created for {created.email}. Share this link now; it is shown only once and expires {new Date(created.expiresAt).toLocaleString()}.</p>
            <input readOnly aria-label="Invitation link" value={acceptanceLink(created.token)} onFocus={event => event.currentTarget.select()}
              className={cn(controlClass, "mt-2 h-9 font-mono text-xs")} />
          </Alert>}
          {message && <Alert tone="error" role="alert">{message}</Alert>}
        </CardBody>
        {pending.isPending && <div className="border-t border-border"><LoadingState label="Loading invitations…"><ListSkeleton rows={2} /></LoadingState></div>}
        {pending.isError && <div className="border-t border-border p-4 sm:p-5"><Alert tone="error" role="alert" action={<Button size="sm" onClick={() => { void pending.refetch(); }}>Retry</Button>}>Unable to load invitations.</Alert></div>}
        {pending.data && (pending.data.length === 0
          ? <div className="border-t border-border"><EmptyState icon={<Mail />} title="No pending invitations." className="py-8" /></div>
          : <RowList className="border-t border-border">
            {pending.data.map(invitation => (
              <Row key={invitation.id} className="justify-between">
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium">{invitation.email}</p>
                  <p className="text-xs text-muted-foreground">{invitation.role} · expires {new Date(invitation.expiresAt).toLocaleDateString()}</p>
                </div>
                <Button variant="outline" size="sm" disabled={revoke.isPending} onClick={() => revoke.mutate(invitation.id)}
                  aria-label={`Revoke invitation for ${invitation.email}`}>
                  Revoke
                </Button>
              </Row>
            ))}
          </RowList>)}
      </Card>
    </section>
  );
}
