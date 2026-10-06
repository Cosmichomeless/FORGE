import * as React from "react";
import Link from "next/link";
import { ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";

export type Crumb = { label: string; href?: string };

/** Breadcrumb trail. The last crumb is the current page and is not a link. */
export function Breadcrumbs({ items, className }: { items: Crumb[]; className?: string }) {
  return (
    <nav aria-label="Breadcrumb" className={cn("text-[0.8125rem] text-muted-foreground", className)}>
      <ol className="flex flex-wrap items-center gap-1">
        {items.map((item, index) => (
          <li key={`${item.label}-${index}`} className="flex items-center gap-1">
            {index > 0 && <ChevronRight aria-hidden className="size-3.5" />}
            {item.href
              ? <Link href={item.href} className="rounded px-0.5 hover:text-foreground hover:underline">{item.label}</Link>
              : <span aria-current="page" className="text-foreground">{item.label}</span>}
          </li>
        ))}
      </ol>
    </nav>
  );
}

export function PageHeader({ title, titleId, description, actions, breadcrumbs, meta, className }: {
  title: React.ReactNode; titleId?: string; description?: React.ReactNode; actions?: React.ReactNode;
  breadcrumbs?: React.ReactNode; meta?: React.ReactNode; className?: string;
}) {
  return (
    <header className={cn("space-y-3", className)}>
      {breadcrumbs}
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0 space-y-1">
          <h1 id={titleId} className="text-2xl font-semibold tracking-tight text-foreground sm:text-[1.625rem]">{title}</h1>
          {description && <p className="text-sm text-muted-foreground">{description}</p>}
        </div>
        {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
      </div>
      {meta}
    </header>
  );
}
