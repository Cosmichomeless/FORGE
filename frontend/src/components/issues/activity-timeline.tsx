"use client";

import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
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

export function ActivityTimeline({ organizationId, projectId, number }: { organizationId: string; projectId: string; number: string }) {
  const activity = useQuery({ queryKey: activityKey(organizationId, projectId, number), queryFn: ({ signal }) => activityApi.list(organizationId, projectId, number, signal), retry: false });
  return (
    <section aria-labelledby="activity-heading" className="space-y-3">
      <h2 id="activity-heading" className="text-xl font-semibold">Activity</h2>
      {activity.isPending && <p role="status">Loading activity…</p>}
      {activity.isError && <div className="space-y-2"><p role="alert">Unable to load activity.</p><Button onClick={() => { void activity.refetch(); }}>Retry</Button></div>}
      {activity.data?.length === 0 && <p className="text-sm">No activity yet.</p>}
      {!!activity.data?.length && <ol className="space-y-2 border-l pl-4">
        {activity.data.map(entry => (
          <li key={entry.id} className="text-sm">
            <span className="mr-2 rounded bg-neutral-100 px-1.5 py-0.5 text-xs">{badge[entry.type]}</span>
            <strong>{entry.actor?.name ?? "Unknown user"}</strong> {describe(entry)}
            <time dateTime={entry.createdAt} className="ml-2 text-neutral-600">{new Date(entry.createdAt).toLocaleString()}</time>
          </li>
        ))}
      </ol>}
    </section>
  );
}
