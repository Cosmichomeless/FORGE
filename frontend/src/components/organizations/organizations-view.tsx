"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { Building2, ChevronRight, MailOpen } from "lucide-react";
import { Alert } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardBody, CardDescription, CardHeader, CardTitle, Row, RowList } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { PageContainer } from "@/components/ui/page-container";
import { PageHeader } from "@/components/ui/page-header";
import { ListSkeleton, LoadingState } from "@/components/ui/skeleton";
import { CreateOrganizationForm } from "./create-organization-form";
import { useOrganizations } from "./organization-provider";

export function OrganizationsView() {
  const { organizations, active, isPending, isError, retry, setActiveId } = useOrganizations();
  const router = useRouter();
  return (
    <PageContainer className="space-y-8">
      <PageHeader title="Organizations" titleId="my-organizations" description="Workspaces you belong to."
        actions={<Button asChild variant="outline" size="sm"><Link href="/invitations/accept"><MailOpen aria-hidden="true" />Have an invitation token?</Link></Button>} />
      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_20rem] lg:items-start">
        <section aria-labelledby="my-organizations">
          <Card>
            {isPending && <LoadingState label="Loading organizations…"><ListSkeleton rows={3} /></LoadingState>}
            {isError && <div className="p-4 sm:p-5"><Alert tone="error" role="alert" action={<Button size="sm" onClick={retry}>Retry</Button>}>Unable to load your organizations.</Alert></div>}
            {!isPending && !isError && organizations.length === 0 &&
              <EmptyState icon={<Building2 />} title="You do not belong to any organization yet." description="Create one with the form, or accept an invitation." />}
            {organizations.length > 0 && <RowList>
              {organizations.map(org => (
                <Row key={org.id} className="justify-between p-0 sm:p-0">
                  <Link href={`/organizations/${org.id}`} onClick={() => setActiveId(org.id)} className="group flex w-full flex-wrap items-center justify-between gap-3 px-4 py-3 sm:px-5">
                    <span className="flex min-w-0 items-center gap-3">
                      <span aria-hidden="true" className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-accent-soft text-accent-soft-foreground"><Building2 className="size-4" /></span>
                      <span className="min-w-0">
                        <span className="block truncate text-sm font-medium text-foreground group-hover:text-link">{org.name}</span>
                        <span className="block truncate text-xs text-muted-foreground">{org.slug} · {org.role}{active?.id === org.id ? " · active" : ""}</span>
                      </span>
                    </span>
                    <span className="flex items-center gap-2">
                      {active?.id === org.id && <Badge tone="accent" aria-hidden="true">Active</Badge>}
                      <ChevronRight aria-hidden="true" className="size-4 text-muted-foreground" />
                    </span>
                  </Link>
                </Row>
              ))}
            </RowList>}
          </Card>
        </section>
        <section aria-labelledby="new-organization">
          <Card>
            <CardHeader>
              <CardTitle id="new-organization">Create an organization</CardTitle>
              <CardDescription>A shared space for your projects and people.</CardDescription>
            </CardHeader>
            <CardBody>
              <CreateOrganizationForm onCreated={organization => { setActiveId(organization.id); router.push(`/organizations/${organization.id}`); }} />
            </CardBody>
          </Card>
        </section>
      </div>
    </PageContainer>
  );
}
