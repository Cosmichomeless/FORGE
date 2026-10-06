import type { ReactNode } from "react";
import { Hammer } from "lucide-react";
import { Card, CardBody } from "@/components/ui/card";
import { PageContainer } from "@/components/ui/page-container";

/** Centered card used by login and register. */
export function AuthCard({ title, description, children }: { title: string; description: string; children: ReactNode }) {
  return (
    <PageContainer size="narrow" className="flex min-h-[calc(100dvh-3.5rem)] flex-col justify-center py-10">
      <div className="mb-6 space-y-3 text-center">
        <span aria-hidden="true" className="mx-auto flex size-11 items-center justify-center rounded-xl bg-accent text-accent-foreground shadow-card"><Hammer className="size-5" /></span>
        <h1 className="text-2xl font-semibold tracking-tight">{title}</h1>
        <p className="text-sm text-muted-foreground">{description}</p>
      </div>
      <Card><CardBody className="p-5 sm:p-6">{children}</CardBody></Card>
    </PageContainer>
  );
}
