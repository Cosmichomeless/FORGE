import { apiGet, apiSend } from "./http";
import { projectKey } from "./projects-api";

export type IssueStatus = "TODO" | "IN_PROGRESS" | "DONE";
export type IssuePriority = "LOW" | "MEDIUM" | "HIGH" | "URGENT";
export const issueStatuses: IssueStatus[] = ["TODO", "IN_PROGRESS", "DONE"];
export const issuePriorities: IssuePriority[] = ["LOW", "MEDIUM", "HIGH", "URGENT"];
export const statusLabel: Record<IssueStatus, string> = { TODO: "To do", IN_PROGRESS: "In progress", DONE: "Done" };
export const priorityLabel: Record<IssuePriority, string> = { LOW: "Low", MEDIUM: "Medium", HIGH: "High", URGENT: "Urgent" };

export type Person = { id: string; name: string };
export type Issue = {
  id: string; projectId: string; number: number; identifier: string; title: string; description?: string | null;
  status: IssueStatus; priority: IssuePriority; assignee?: Person | null; createdBy: Person; createdAt: string; updatedAt: string;
};
export type IssuePage = { items: Issue[]; page: number; size: number; totalItems: number; totalPages: number };
export type IssueInput = { title: string; description?: string; priority?: IssuePriority; assigneeId?: string };
export type IssueListParams = { page: number; size?: number; status?: IssueStatus | ""; priority?: IssuePriority | ""; assignee?: string; sort?: string; direction?: "asc" | "desc"; q?: string };

export const issuesKey = (organizationId: string, projectId: string) => [...projectKey(organizationId, projectId), "issues"] as const;
export const issueKey = (organizationId: string, projectId: string, number: number | string) => [...issuesKey(organizationId, projectId), "detail", String(number)] as const;

const base = (organizationId: string, projectId: string) => `organizations/${organizationId}/projects/${projectId}/issues`;

export const issuesApi = {
  list: (organizationId: string, projectId: string, params: IssueListParams, signal?: AbortSignal) => {
    const query = new URLSearchParams({ page: String(params.page), size: String(params.size ?? 20) });
    for (const [name, value] of Object.entries({ status: params.status, priority: params.priority, assignee: params.assignee, sort: params.sort, direction: params.direction, q: params.q })) if (value) query.set(name, value);
    return apiGet<IssuePage>(`${base(organizationId, projectId)}?${query}`, signal);
  },
  get: (organizationId: string, projectId: string, number: number | string, signal?: AbortSignal) => apiGet<Issue>(`${base(organizationId, projectId)}/${number}`, signal),
  create: (organizationId: string, projectId: string, input: IssueInput) => apiSend<Issue>("POST", base(organizationId, projectId), input),
  edit: (organizationId: string, projectId: string, number: number, input: { title: string; description?: string }) => apiSend<Issue>("PUT", `${base(organizationId, projectId)}/${number}`, input),
  assign: (organizationId: string, projectId: string, number: number, assigneeId: string | null) => apiSend<Issue>("PUT", `${base(organizationId, projectId)}/${number}/assignee`, { assigneeId }),
  setStatus: (organizationId: string, projectId: string, number: number, status: IssueStatus) => apiSend<Issue>("PUT", `${base(organizationId, projectId)}/${number}/status`, { status }),
  setPriority: (organizationId: string, projectId: string, number: number, priority: IssuePriority) => apiSend<Issue>("PUT", `${base(organizationId, projectId)}/${number}/priority`, { priority }),
};
