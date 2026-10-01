import { apiGet, apiSend } from "./http";

export type ProjectStatus = "ACTIVE" | "ARCHIVED";
export type ProjectFilter = "ACTIVE" | "ARCHIVED" | "ALL";
export type Project = {
  id: string; organizationId: string; key: string; name: string; description?: string | null;
  status: ProjectStatus; createdAt: string; updatedAt: string; archivedAt?: string | null;
};
export type ProjectInput = { key: string; name: string; description?: string };
export type ProjectUpdate = { name: string; description?: string };

export const projectsKey = (organizationId: string) => ["organizations", organizationId, "projects"] as const;
export const projectKey = (organizationId: string, projectId: string) => [...projectsKey(organizationId), projectId] as const;

const base = (organizationId: string) => `organizations/${organizationId}/projects`;

export const projectsApi = {
  list: (organizationId: string, filter: ProjectFilter, signal?: AbortSignal) => apiGet<Project[]>(`${base(organizationId)}?status=${filter}`, signal),
  get: (organizationId: string, projectId: string, signal?: AbortSignal) => apiGet<Project>(`${base(organizationId)}/${projectId}`, signal),
  create: (organizationId: string, input: ProjectInput) => apiSend<Project>("POST", base(organizationId), input),
  update: (organizationId: string, projectId: string, input: ProjectUpdate) => apiSend<Project>("PUT", `${base(organizationId)}/${projectId}`, input),
  archive: (organizationId: string, projectId: string) => apiSend<Project>("POST", `${base(organizationId)}/${projectId}/archive`),
  restore: (organizationId: string, projectId: string) => apiSend<Project>("POST", `${base(organizationId)}/${projectId}/restore`),
};
