import { apiGet, apiSend } from "./http";
import { issueKey } from "./issues-api";

export type Comment = {
  id: string; issueId: string; body: string; author: { id: string; name: string };
  createdAt: string; updatedAt: string; canEdit: boolean; canDelete: boolean;
};

export const commentsKey = (organizationId: string, projectId: string, number: number | string) => [...issueKey(organizationId, projectId, number), "comments"] as const;
const base = (organizationId: string, projectId: string, number: number | string) => `organizations/${organizationId}/projects/${projectId}/issues/${number}/comments`;

export const commentsApi = {
  list: (organizationId: string, projectId: string, number: number | string, signal?: AbortSignal) => apiGet<Comment[]>(base(organizationId, projectId, number), signal),
  add: (organizationId: string, projectId: string, number: number | string, body: string) => apiSend<Comment>("POST", base(organizationId, projectId, number), { body }),
  edit: (organizationId: string, projectId: string, number: number | string, id: string, body: string) => apiSend<Comment>("PUT", `${base(organizationId, projectId, number)}/${id}`, { body }),
  remove: (organizationId: string, projectId: string, number: number | string, id: string) => apiSend<void>("DELETE", `${base(organizationId, projectId, number)}/${id}`),
};
