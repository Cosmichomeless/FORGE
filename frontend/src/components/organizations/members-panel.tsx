"use client";

import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/components/auth/auth-provider";
import { Button } from "@/components/ui/button";
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
    <section aria-labelledby="members-heading" className="space-y-4">
      <h2 id="members-heading" className="text-xl font-semibold">Members</h2>
      {members.isPending && <p role="status">Loading members…</p>}
      {members.isError && <div className="space-y-2"><p role="alert">Unable to load members.</p><Button onClick={() => { void members.refetch(); }}>Retry</Button></div>}
      {message && <p role="alert" className="text-sm text-red-600">{message}</p>}
      {members.data && <ul className="divide-y rounded-md border">
        {members.data.map(member => {
          const roles = assignableRoles(organization.role, member);
          const self = member.userId === user?.id;
          return (
            <li key={member.userId} className="flex flex-wrap items-center justify-between gap-3 p-3">
              <div>
                <p className="font-medium">{member.name}{self ? " (you)" : ""}</p>
                <p className="text-sm text-neutral-600">{member.email}</p>
              </div>
              <div className="flex items-center gap-2">
                {roles.length > 0
                  ? <><label htmlFor={`role-${member.userId}`} className="sr-only">Role of {member.name}</label>
                    <select id={`role-${member.userId}`} value={member.role} disabled={busy}
                      onChange={event => changeRole.mutate({ member, role: event.target.value as Role })}
                      className="rounded-md border border-neutral-300 px-2 py-1 text-sm">
                      {roles.map(role => <option key={role} value={role}>{role}</option>)}
                    </select></>
                  : <span className="text-sm">{member.role}</span>}
                {user && canRemoveMember(organization.role, user.id, member) && (
                  <Button variant="outline" size="sm" disabled={busy} onClick={() => remove.mutate(member)}
                    aria-label={self ? "Leave organization" : `Remove ${member.name}`}>
                    {self ? "Leave" : "Remove"}
                  </Button>
                )}
              </div>
            </li>
          );
        })}
      </ul>}
    </section>
  );
}
