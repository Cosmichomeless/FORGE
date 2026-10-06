import * as React from "react";
import { cn } from "@/lib/utils";

/** Friendly empty state: icon, headline, optional explanation and a call to action. */
export function EmptyState({ icon, title, description, action, className }: {
  icon?: React.ReactNode; title: string; description?: React.ReactNode; action?: React.ReactNode; className?: string;
}) {
  return (
    <div className={cn("flex flex-col items-center justify-center gap-3 px-6 py-10 text-center", className)}>
      {icon && <span aria-hidden="true" className="flex size-11 items-center justify-center rounded-full bg-muted text-muted-foreground [&_svg]:size-5">{icon}</span>}
      <div className="space-y-1">
        <p className="text-sm font-medium text-foreground">{title}</p>
        {description && <p className="mx-auto max-w-sm text-[0.8125rem] text-muted-foreground">{description}</p>}
      </div>
      {action}
    </div>
  );
}
