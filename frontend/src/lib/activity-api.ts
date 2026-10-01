import { apiGet } from "./http";
import { issueKey, type IssuePriority, type IssueStatus } from "./issues-api";

export type ActivityType = "CREATED" | "ASSIGNED" | "STATUS_CHANGED" | "PRIORITY_CHANGED" | "COMMENTED";
export type Person = { id: string; name: string };
export type Activity = {
  id: string; type: ActivityType; actor: Person | null; from: IssueStatus | IssuePriority | null; to: IssueStatus | IssuePriority | null;
  fromPerson: Person | null; toPerson: Person | null; createdAt: string;
};

export const activityKey = (organizationId: string, projectId: string, number: number | string) => [...issueKey(organizationId, projectId, number), "activity"] as const;
export const activityApi = {
  list: (organizationId: string, projectId: string, number: number | string, signal?: AbortSignal) =>
    apiGet<Activity[]>(`organizations/${organizationId}/projects/${projectId}/issues/${number}/activity`, signal),
};
