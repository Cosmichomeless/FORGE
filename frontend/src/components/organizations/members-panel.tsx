"use client";

import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/components/auth/auth-provider";
import { Alert } from "@/components/ui/alert";
import { Avatar } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardDescription, CardHeader, CardTitle, Row, RowList } from "@/components/ui/card";
import { Select } from "@/components/ui/input";
import { ListSkeleton, LoadingState } from "@/components/ui/skeleton";
import { ApiError } from "@/lib/http";
import { organizationsApi, type Member, type Organization, type Role } from "@/lib/organizations-api";
import { assignableRoles, canRemoveMember } from "@/lib/permissions";
import { organizationsKey } from "./organization-provider";

const describe = (error: unknown) => error instanceof ApiError ? error.message : "Unable to connect. Please try again.";

export function MembersPanel({ organization }: { organization: Organization }) {
  const { user } = useAuth();
  const client = useQueryClient();
  const [message, setMessage] = useState("");
  const key = [...organizationsKey, organization.id, "members"];
  const members = useQuery({ queryKey: key, queryFn: ({ signal }) => organizationsApi.members(organization.id, signal), retry: false });
  const refreshAll = () => Promise.all([
    client.invalidateQueries({ queryKey: key }),
    client.invalidateQueries({ queryKey: [...organizationsKey, organization.id], exact: true }),
  ]);
  const changeRole = useMutation({
    mutationFn: (input: { member: Member; role: Role }) => organizationsApi.changeRole(organization.id, input.member.userId, input.role),
    onMutate: () => setMessage(""),
    onSuccess: refreshAll,
    onError: error => { setMessage(describe(error)); void client.invalidateQueries({ queryKey: key }); },
  });
  const remove = useMutation({
    mutationFn: (member: Member) => organizationsApi.removeMember(organization.id, member.userId),
    onMutate: () => setMessage(""),
    onSuccess: async (_data, member) => {
      if (member.userId === user?.id) {
        client.removeQueries({ queryKey: [...organizationsKey, organization.id] });
        await client.invalidateQueries({ queryKey: organizationsKey });
      } else await refreshAll();
    },
    onError: error => { setMessage(describe(error)); void client.invalidateQueries({ queryKey: key }); },
  });
  const busy = changeRole.isPending || remove.isPending;
  return (
    <section aria-labelledby="members-heading">
      <Card>
        <CardHeader actions={members.data && <Badge tone="neutral">{members.data.length} {members.data.length === 1 ? "member" : "members"}</Badge>}>
          <CardTitle id="members-heading">Members</CardTitle>
          <CardDescription>People with access to {organization.name}.</CardDescription>
        </CardHeader>
        {members.isPending && <LoadingState label="Loading members…"><ListSkeleton rows={3} /></LoadingState>}
        {members.isError && <div className="p-4 sm:p-5"><Alert tone="error" role="alert" action={<Button size="sm" onClick={() => { void members.refetch(); }}>Retry</Button>}>Unable to load members.</Alert></div>}
        {message && <div className="p-4 pb-0 sm:p-5 sm:pb-0"><Alert tone="error" role="alert">{message}</Alert></div>}
        {members.data && <RowList>
          {members.data.map(member => {
            const roles = assignableRoles(organization.role, member);
            const self = member.userId === user?.id;
            return (
              <Row key={member.userId} className="justify-between">
                <div className="flex min-w-0 items-center gap-3">
                  <Avatar name={member.name} />
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium">{member.name}{self ? " (you)" : ""}</p>
                    <p className="truncate text-xs text-muted-foreground">{member.email}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {roles.length > 0
                    ? <><label htmlFor={`role-${member.userId}`} className="sr-only">Role of {member.name}</label>
                      <Select id={`role-${member.userId}`} wrapperClassName="w-32" value={member.role} disabled={busy}
                        onChange={event => changeRole.mutate({ member, role: event.target.value as Role })}>
                        {roles.map(role => <option key={role} value={role}>{role}</option>)}
                      </Select></>
                    : <Badge tone={member.role === "OWNER" ? "accent" : "neutral"}>{member.role}</Badge>}
                  {user && canRemoveMember(organization.role, user.id, member) && (
                    <Button variant="outline" size="sm" disabled={busy} onClick={() => remove.mutate(member)}
                      aria-label={self ? "Leave organization" : `Remove ${member.name}`}>
                      {self ? "Leave" : "Remove"}
                    </Button>
                  )}
                </div>
              </Row>
            );
          })}
        </RowList>}
      </Card>
    </section>
  );
}
