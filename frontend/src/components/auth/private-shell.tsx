"use client";

import { useEffect, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { PageContainer } from "@/components/ui/page-container";
import { LoadingState, Skeleton } from "@/components/ui/skeleton";
import { Alert } from "@/components/ui/alert";
import { useAuth } from "./auth-provider";

/** Gate for authenticated pages. Identity and logout live in the app shell (UserMenu). */
export function PrivateShell({ children }: { children: ReactNode }) {
  const auth = useAuth();
  const router = useRouter();
  useEffect(() => {
    if (!auth.isPending && !auth.isError && !auth.user) router.replace("/login");
  }, [auth.isPending, auth.isError, auth.user, router]);
  if (auth.isPending) {
    return (
      <PageContainer>
        <LoadingState label="Loading your session…" className="space-y-4">
          <Skeleton className="h-8 w-56" />
          <Skeleton className="h-24 w-full" />
          <Skeleton className="h-24 w-full" />
        </LoadingState>
      </PageContainer>
    );
  }
  if (auth.isError) {
    return (
      <PageContainer size="narrow">
        <Alert tone="error" role="alert" action={<Button size="sm" onClick={auth.retry}>Retry</Button>}>Unable to load your session.</Alert>
      </PageContainer>
    );
  }
  if (!auth.user) {
    return <PageContainer><LoadingState label="Redirecting to login…" className="space-y-4"><Skeleton className="h-8 w-48" /></LoadingState></PageContainer>;
  }
  return <>{children}</>;
}
