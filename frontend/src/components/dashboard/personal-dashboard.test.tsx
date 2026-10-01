import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { dashboardApi, type Dashboard } from "@/lib/dashboard-api";
import { ApiError } from "@/lib/http";
import { PersonalDashboard } from "./personal-dashboard";

vi.mock("next/link", () => ({ default: ({ href, children, ...rest }: { href: string; children: React.ReactNode }) => <a href={href} {...rest}>{children}</a> }));
vi.mock("@/lib/dashboard-api", async original => ({ ...await original<typeof import("@/lib/dashboard-api")>(), dashboardApi: { get: vi.fn() } }));

const counts = { TODO: 2, IN_PROGRESS: 1, IN_REVIEW: 0, DONE: 3 } as Dashboard["counts"];
const data: Dashboard = {
  counts,
  assigned: [{ organizationId: "o1", organizationName: "Acme", projectName: "Website", issue: {
    id: "i1", projectId: "p1", number: 7, identifier: "WEB-7", title: "Fix login", description: null, status: "TODO", priority: "HIGH",
    assignee: { id: "u1", name: "Ada" }, createdBy: { id: "u1", name: "Ada" }, createdAt: "", updatedAt: "" } }],
  recentProjects: [{ organizationId: "o1", organizationName: "Acme", projectId: "p1", key: "WEB", name: "Website", lastActivityAt: "2026-01-01T00:00:00Z" }],
};
const wrap = () => render(<QueryClientProvider client={new QueryClient()}><PersonalDashboard /></QueryClientProvider>);

describe("PersonalDashboard", () => {
  beforeEach(() => vi.resetAllMocks());
  afterEach(cleanup);

  it("shows loading and then links to issues and projects", async () => {
    vi.mocked(dashboardApi.get).mockResolvedValue(data);
    wrap();
    expect(screen.getByRole("status").textContent).toContain("Loading");
    expect((await screen.findByRole("link", { name: "Fix login" })).getAttribute("href")).toBe("/organizations/o1/projects/p1/issues/7");
    expect(screen.getByRole("link", { name: /WEB · Website/ }).getAttribute("href")).toBe("/organizations/o1/projects/p1");
    expect(screen.getByText("3")).toBeTruthy();
  });

  it("shows empty states", async () => {
    vi.mocked(dashboardApi.get).mockResolvedValue({ counts, assigned: [], recentProjects: [] });
    wrap();
    expect(await screen.findByText("Nothing is assigned to you right now.")).toBeTruthy();
    expect(screen.getByText("No recent project activity yet.")).toBeTruthy();
  });

  it("shows an error with retry", async () => {
    vi.mocked(dashboardApi.get).mockRejectedValueOnce(new ApiError("boom", 500)).mockResolvedValue(data);
    wrap();
    await userEvent.click(await screen.findByRole("button", { name: "Retry" }));
    expect(await screen.findByText("Fix login")).toBeTruthy();
  });
});
