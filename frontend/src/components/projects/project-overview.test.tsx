import { cleanup, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { ApiError } from "@/lib/http";
import { organizationsApi, type Organization } from "@/lib/organizations-api";
import { projectsApi, type Project } from "@/lib/projects-api";
import { ProjectOverview } from "./project-overview";

vi.mock("@/lib/organizations-api", () => ({ organizationsApi: { get: vi.fn() } }));
vi.mock("@/lib/projects-api", async original => ({
  ...await original<typeof import("@/lib/projects-api")>(),
  projectsApi: { get: vi.fn(), update: vi.fn(), archive: vi.fn(), restore: vi.fn(), list: vi.fn().mockResolvedValue([]) },
}));

const org = (role: Organization["role"]) => ({ id: "o1", name: "Acme", slug: "acme", role }) as Organization;
const project = (over: Partial<Project> = {}): Project => ({
  id: "p1", organizationId: "o1", key: "WEB", name: "Website", description: null, status: "ACTIVE",
  createdAt: "2026-01-01T00:00:00Z", updatedAt: "2026-01-01T00:00:00Z", archivedAt: null, ...over,
});
const renderPage = () => render(
  <QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}><ProjectOverview organizationId="o1" projectId="p1" /></QueryClientProvider>,
);

describe("ProjectOverview", () => {
  beforeEach(() => { vi.resetAllMocks(); vi.mocked(projectsApi.list).mockResolvedValue([]); });
  afterEach(cleanup);

  it("shows read-only details to members", async () => {
    vi.mocked(organizationsApi.get).mockResolvedValue(org("MEMBER"));
    vi.mocked(projectsApi.get).mockResolvedValue(project());
    renderPage();
    expect(await screen.findByRole("heading", { name: "Website" })).toBeTruthy();
    expect(screen.getByText("WEB")).toBeTruthy();
    expect(screen.queryByRole("button", { name: "Archive project" })).toBeNull();
    expect(screen.getByText(/Only owners and admins/)).toBeTruthy();
  });

  it("lets admins archive and shows the archived state", async () => {
    vi.mocked(organizationsApi.get).mockResolvedValue(org("ADMIN"));
    const archived = project({ status: "ARCHIVED", archivedAt: "2026-02-01T00:00:00Z" });
    vi.mocked(projectsApi.get).mockResolvedValueOnce(project()).mockResolvedValue(archived);
    vi.mocked(projectsApi.archive).mockResolvedValue(archived);
    renderPage();
    await userEvent.click(await screen.findByRole("button", { name: "Archive project" }));
    expect(await screen.findByRole("button", { name: "Restore project" })).toBeTruthy();
    expect(screen.getByText(/This project is archived/)).toBeTruthy();
    expect(screen.queryByRole("form", { name: "Edit project" })).toBeNull();
  });

  it("restores an archived project", async () => {
    vi.mocked(organizationsApi.get).mockResolvedValue(org("OWNER"));
    vi.mocked(projectsApi.get).mockResolvedValueOnce(project({ status: "ARCHIVED" })).mockResolvedValue(project());
    vi.mocked(projectsApi.restore).mockResolvedValue(project());
    renderPage();
    await userEvent.click(await screen.findByRole("button", { name: "Restore project" }));
    expect(await screen.findByRole("button", { name: "Archive project" })).toBeTruthy();
  });

  it("saves edits and surfaces server errors", async () => {
    vi.mocked(organizationsApi.get).mockResolvedValue(org("ADMIN"));
    vi.mocked(projectsApi.get).mockResolvedValue(project());
    vi.mocked(projectsApi.update).mockRejectedValue(new ApiError("Archived projects cannot be edited", 409));
    renderPage();
    const name = await screen.findByLabelText("Name");
    await userEvent.clear(name);
    await userEvent.type(name, "Site");
    await userEvent.click(screen.getByRole("button", { name: "Save changes" }));
    await waitFor(() => expect(projectsApi.update).toHaveBeenCalledWith("o1", "p1", { name: "Site", description: undefined }));
    expect((await screen.findByRole("alert")).textContent).toContain("Archived projects cannot be edited");
  });

  it("reports a project that does not exist", async () => {
    vi.mocked(organizationsApi.get).mockResolvedValue(org("MEMBER"));
    vi.mocked(projectsApi.get).mockRejectedValue(new ApiError("Not found", 404));
    renderPage();
    expect((await screen.findByRole("alert")).textContent).toContain("Project not found");
  });
});
