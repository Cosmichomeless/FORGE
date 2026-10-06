"use client";

import { useQuery } from "@tanstack/react-query";
import { Alert } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardBody, CardHeader, CardTitle } from "@/components/ui/card";
import { ListSkeleton, LoadingState } from "@/components/ui/skeleton";
import { activityApi, activityKey, type Activity } from "@/lib/activity-api";
import { priorityLabel, statusLabel, type IssuePriority, type IssueStatus } from "@/lib/issues-api";

const describe = (a: Activity) => {
  switch (a.type) {
    case "CREATED": return "created this issue";
    case "COMMENTED": return "commented";
    case "STATUS_CHANGED": return `changed status from ${statusLabel[a.from as IssueStatus] ?? a.from} to ${statusLabel[a.to as IssueStatus] ?? a.to}`;
    case "PRIORITY_CHANGED": return `changed priority from ${priorityLabel[a.from as IssuePriority] ?? a.from} to ${priorityLabel[a.to as IssuePriority] ?? a.to}`;
    case "ASSIGNED": return a.toPerson ? `assigned this issue to ${a.toPerson.name}${a.fromPerson ? ` (was ${a.fromPerson.name})` : ""}` : `unassigned ${a.fromPerson?.name ?? "this issue"}`;
  }
};
const badge: Record<Activity["type"], string> = { CREATED: "Created", COMMENTED: "Comment", STATUS_CHANGED: "Status", PRIORITY_CHANGED: "Priority", ASSIGNED: "Assignment" };
const tone: Record<Activity["type"], "accent" | "neutral" | "warning" | "info" | "success"> = { CREATED: "success", COMMENTED: "neutral", STATUS_CHANGED: "warning", PRIORITY_CHANGED: "info", ASSIGNED: "accent" };

export function ActivityTimeline({ organizationId, projectId, number }: { organizationId: string; projectId: string; number: string }) {
  const activity = useQuery({ queryKey: activityKey(organizationId, projectId, number), queryFn: ({ signal }) => activityApi.list(organizationId, projectId, number, signal), retry: false });
  return (
    <section aria-labelledby="activity-heading">
      <Card>
        <CardHeader><CardTitle id="activity-heading">Activity</CardTitle></CardHeader>
        {activity.isPending && <LoadingState label="Loading activity…"><ListSkeleton rows={3} /></LoadingState>}
        {activity.isError && <div className="p-4 sm:p-5"><Alert tone="error" role="alert" action={<Button size="sm" onClick={() => { void activity.refetch(); }}>Retry</Button>}>Unable to load activity.</Alert></div>}
        {activity.data?.length === 0 && <CardBody><p className="text-sm text-muted-foreground">No activity yet.</p></CardBody>}
        {!!activity.data?.length && <CardBody>
          <ol className="relative ml-1.5 space-y-4 border-l border-border pl-5">
            {activity.data.map(entry => (
              <li key={entry.id} className="relative text-[0.8125rem] leading-6 text-muted-foreground">
                <span aria-hidden="true" className="absolute -left-[1.6875rem] top-2 size-2.5 rounded-full border-2 border-surface bg-border-strong" />
                <Badge tone={tone[entry.type]} className="mr-2 align-middle">{badge[entry.type]}</Badge>
                <strong className="font-semibold text-foreground">{entry.actor?.name ?? "Unknown user"}</strong> {describe(entry)}
                <time dateTime={entry.createdAt} className="ml-2 whitespace-nowrap text-xs">{new Date(entry.createdAt).toLocaleString()}</time>
              </li>
            ))}
          </ol>
        </CardBody>}
      </Card>
    </section>
  );
}
