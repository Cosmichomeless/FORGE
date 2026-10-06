import * as React from "react";
import { cn } from "@/lib/utils";

export function Skeleton({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div aria-hidden="true" className={cn("animate-pulse rounded-md bg-muted", className)} {...props} />
  );
}

/**
 * Loading placeholder that stays announced to screen readers: the visible skeleton is decorative and the
 * text (kept short and identical to the former plain-text message) lives in a polite status region.
 */
export function LoadingState({ label, className, children }: { label: string; className?: string; children?: React.ReactNode }) {
  return (
    <div role="status" aria-busy="true" className={className}>
      <span className="sr-only">{label}</span>
      {children ?? <Skeleton className="h-4 w-1/3" />}
    </div>
  );
}

/** Skeleton rows that mimic a list inside a card. */
export function ListSkeleton({ rows = 3 }: { rows?: number }) {
  return (
    <div aria-hidden="true" className="divide-y divide-border">
      {Array.from({ length: rows }, (_, index) => (
        <div key={index} className="flex items-center gap-3 px-4 py-3.5 sm:px-5">
          <Skeleton className="size-8 rounded-full" />
          <div className="flex-1 space-y-2"><Skeleton className="h-3.5 w-2/5" /><Skeleton className="h-3 w-1/4" /></div>
          <Skeleton className="hidden h-5 w-16 rounded-full sm:block" />
        </div>
      ))}
    </div>
  );
}
