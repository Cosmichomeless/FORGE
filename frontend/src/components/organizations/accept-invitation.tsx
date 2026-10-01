"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { PrivateShell } from "@/components/auth/private-shell";
import { ApiError } from "@/lib/http";
import { organizationsApi } from "@/lib/organizations-api";
import { organizationsKey, useOrganizations } from "./organization-provider";

// The token travels in the URL fragment, which browsers never send to servers or logs.
function tokenFromLocation(): string {
  const fragment = new URLSearchParams(window.location.hash.replace(/^#/, "")).get("token");
  return fragment ?? new URLSearchParams(window.location.search).get("token") ?? "";
}

export function AcceptInvitation() {
  const router = useRouter();
  const client = useQueryClient();
  const { setActiveId } = useOrganizations();
  const [token, setToken] = useState(() => (typeof window === "undefined" ? "" : tokenFromLocation()));
  const accept = useMutation({
    mutationFn: () => organizationsApi.acceptInvitation(token.trim()),
    onSuccess: async organization => {
      await client.invalidateQueries({ queryKey: organizationsKey });
      setActiveId(organization.id);
      router.replace(`/organizations/${organization.id}`);
    },
  });
  const error = accept.error;
  return (
    <PrivateShell>
      <div className="max-w-md space-y-4">
        <h1 className="text-3xl font-semibold">Accept invitation</h1>
        <p className="text-sm">Sign in with the email address that was invited, then confirm below.</p>
        <form noValidate className="space-y-4" onSubmit={event => { event.preventDefault(); if (token.trim() && !accept.isPending) accept.mutate(); }}>
          <div className="space-y-1">
            <label htmlFor="invitation-token" className="block text-sm font-medium">Invitation token</label>
            <input id="invitation-token" value={token} onChange={event => setToken(event.target.value)} autoComplete="off"
              className="w-full rounded-md border border-neutral-300 px-3 py-2 font-mono text-sm" />
          </div>
          {error && <p role="alert" className="text-sm text-red-600">{error instanceof ApiError ? error.message : "Unable to connect. Please try again."}</p>}
          <Button type="submit" disabled={!token.trim() || accept.isPending}>{accept.isPending ? "Accepting…" : "Accept invitation"}</Button>
        </form>
      </div>
    </PrivateShell>
  );
}
