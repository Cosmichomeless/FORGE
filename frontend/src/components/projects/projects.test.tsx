import { cleanup, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { ApiError } from "@/lib/http";
import type { Organization } from "@/lib/organizations-api";
import type { Project } from "@/lib/projects-api";
import { ProjectsPanel } from "./projects-panel";

vi.mock("@/lib/projects-api", async original => ({
  ...await original<typeof import("@/lib/projects-api")>(),
  projectsApi: { list: vi.fn(), create: vi.fn() },
}));
import { projectsApi } from "@/lib/projects-api";

const org = (role: Organization["role"]) => ({ id: "o1", name: "Acme", slug: "acme", role }) as Organization;
const project = (over: Partial<Project> = {}): Project => ({
  id: "p1", organizationId: "o1", key: "WEB", name: "Website", description: null, status: "ACTIVE",
  createdAt: "2026-01-01T00:00:00Z", updatedAt: "2026-01-01T00:00:00Z", archivedAt: null, ...over,
});
const renderPanel = (role: Organization["role"]) => render(
  <QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}><ProjectsPanel organization={org(role)} /></QueryClientProvider>,
);

describe("ProjectsPanel", () => {
  beforeEach(() => { vi.resetAllMocks(); });
  afterEach(cleanup);

  it("lists projects with links and an empty state", async () => {
    vi.mocked(projectsApi.list).mockResolvedValue([project()]);
    renderPanel("MEMBER");
    expect((await screen.findByRole("link", { name: "Website" })).getAttribute("href")).toBe("/organizations/o1/projects/p1");
    expect(screen.getByText("WEB")).toBeTruthy();
  });

  it("shows an empty state", async () => {
    vi.mocked(projectsApi.list).mockResolvedValue([]);
    renderPanel("MEMBER");
    expect(await screen.findByText(/No active projects yet/)).toBeTruthy();
  });

  it("hides creation from members and offers it to admins", async () => {
    vi.mocked(projectsApi.list).mockResolvedValue([]);
    renderPanel("MEMBER");
    await screen.findByText(/No active projects yet/);
    expect(screen.queryByRole("button", { name: "New project" })).toBeNull();
  });

  it("requests archived projects when the toggle is on and badges them", async () => {
    vi.mocked(projectsApi.list).mockImplementation(async (_o, filter) => filter === "ALL" ? [project({ status: "ARCHIVED" })] : []);
    renderPanel("MEMBER");
    await userEvent.click(await screen.findByLabelText("Show archived"));
    expect(await screen.findByText("Archived")).toBeTruthy();
    expect(projectsApi.list).toHaveBeenLastCalledWith("o1", "ALL", expect.anything());
  });

  it("offers retry on load errors", async () => {
    vi.mocked(projectsApi.list).mockRejectedValueOnce(new Error("boom")).mockResolvedValue([project()]);
    renderPanel("MEMBER");
    await userEvent.click(await screen.findByRole("button", { name: "Retry" }));
    expect(await screen.findByRole("link", { name: "Website" })).toBeTruthy();
  });

  it("validates, suggests a key from the name and creates", async () => {
    vi.mocked(projectsApi.list).mockResolvedValue([]);
    vi.mocked(projectsApi.create).mockResolvedValue(project());
    renderPanel("ADMIN");
    await userEvent.click(await screen.findByRole("button", { name: "New project" }));
    await userEvent.click(screen.getByRole("button", { name: "Create project" }));
    expect(await screen.findByText("Name is required")).toBeTruthy();
    await userEvent.type(screen.getByLabelText("Name"), "Café app");
    expect((screen.getByLabelText("Key") as HTMLInputElement).value).toBe("CAFEA");
    await userEvent.click(screen.getByRole("button", { name: "Create project" }));
    await waitFor(() => expect(projectsApi.create).toHaveBeenCalledWith("o1", { key: "CAFEA", name: "Café app", description: undefined }));
  });

  it("maps a duplicate key conflict onto the form", async () => {
    vi.mocked(projectsApi.list).mockResolvedValue([]);
    vi.mocked(projectsApi.create).mockRejectedValue(new ApiError("Project key already in use", 409));
    renderPanel("OWNER");
    await userEvent.click(await screen.findByRole("button", { name: "New project" }));
    await userEvent.type(screen.getByLabelText("Name"), "Website");
    await userEvent.click(screen.getByRole("button", { name: "Create project" }));
    expect((await screen.findByRole("alert")).textContent).toContain("Project key already in use");
  });
});
