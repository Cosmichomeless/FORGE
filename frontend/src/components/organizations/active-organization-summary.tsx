"use client";

import Link from "next/link";
import { ArrowRight, Building2 } from "lucide-react";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { LoadingState, Skeleton } from "@/components/ui/skeleton";
import { useOrganizations } from "./organization-provider";

export function ActiveOrganizationSummary() {
  const { active, isPending, isError } = useOrganizations();
  if (isPending) return <LoadingState label="Loading organizations…"><Skeleton className="h-[5.5rem] rounded-xl" /></LoadingState>;
  if (isError) return <Alert tone="error" role="alert">Unable to load your organizations.</Alert>;
  if (!active) {
    return (
      <Alert tone="info">
        <p>You are not in an organization yet. <Link href="/organizations" className="font-medium underline">Create one</Link>.</p>
      </Alert>
    );
  }
  return (
    <Card>
      <section aria-labelledby="active-org" className="flex flex-wrap items-center justify-between gap-4 p-4 sm:p-5">
        <div className="flex min-w-0 items-center gap-4">
          <span aria-hidden="true" className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-accent-soft text-accent-soft-foreground"><Building2 className="size-5" /></span>
          <div className="min-w-0 space-y-0.5">
            <h2 id="active-org" className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Active organization</h2>
            <p className="truncate text-lg font-semibold tracking-tight">{active.name}</p>
            <p className="text-[0.8125rem] text-muted-foreground">{active.slug} · your role: {active.role}</p>
          </div>
        </div>
        <Button asChild variant="outline" size="sm"><Link href={`/organizations/${active.id}`}>Open organization<ArrowRight aria-hidden="true" /></Link></Button>
      </section>
    </Card>
  );
}
