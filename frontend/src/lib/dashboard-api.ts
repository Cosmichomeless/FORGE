import { apiGet } from "./http";
import type { Issue, IssueStatus } from "./issues-api";

export type DashboardIssue = { organizationId: string; organizationName: string; projectName: string; issue: Issue };
export type RecentProject = { organizationId: string; organizationName: string; projectId: string; key: string; name: string; lastActivityAt: string | null };
export type Dashboard = { assigned: DashboardIssue[]; counts: Record<IssueStatus, number>; recentProjects: RecentProject[] };

export const dashboardKey = ["me", "dashboard"] as const;
export const dashboardApi = { get: (signal?: AbortSignal) => apiGet<Dashboard>("me/dashboard", signal) };
