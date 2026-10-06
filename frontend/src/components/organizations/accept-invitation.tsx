"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { MailCheck } from "lucide-react";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card, CardBody } from "@/components/ui/card";
import { PageContainer } from "@/components/ui/page-container";
import { PageHeader } from "@/components/ui/page-header";
import { TextField } from "@/components/ui/text-field";
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
      <PageContainer size="narrow" className="space-y-6">
        <PageHeader title="Accept invitation" description="Sign in with the email address that was invited, then confirm below." />
        <Card>
          <CardBody>
            <form noValidate className="space-y-4" onSubmit={event => { event.preventDefault(); if (token.trim() && !accept.isPending) accept.mutate(); }}>
              <TextField id="invitation-token" label="Invitation token" value={token} onChange={event => setToken(event.target.value)} autoComplete="off" className="font-mono" />
              {error && <Alert tone="error" role="alert">{error instanceof ApiError ? error.message : "Unable to connect. Please try again."}</Alert>}
              <Button type="submit" className="w-full" disabled={!token.trim() || accept.isPending}><MailCheck aria-hidden="true" />{accept.isPending ? "Accepting…" : "Accept invitation"}</Button>
            </form>
          </CardBody>
        </Card>
      </PageContainer>
    </PrivateShell>
  );
}
