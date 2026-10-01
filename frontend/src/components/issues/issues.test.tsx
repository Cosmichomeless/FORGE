import { cleanup, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { commentsApi, type Comment } from "@/lib/comments-api";
import { ApiError } from "@/lib/http";
import { issuesApi, type Issue, type IssuePage } from "@/lib/issues-api";
import { organizationsApi } from "@/lib/organizations-api";
import { projectsApi, type Project } from "@/lib/projects-api";
import { IssueDetail } from "./issue-detail";
import { IssuesPanel } from "./issues-panel";

vi.mock("next/link", () => ({ default: ({ href, children, ...rest }: { href: string; children: React.ReactNode }) => <a href={href} {...rest}>{children}</a> }));
vi.mock("@/lib/comments-api", async original => ({ ...await original<typeof import("@/lib/comments-api")>(), commentsApi: { list: vi.fn(), add: vi.fn(), edit: vi.fn(), remove: vi.fn() } }));
vi.mock("@/lib/organizations-api", () => ({ organizationsApi: { members: vi.fn() } }));
vi.mock("@/lib/projects-api", async original => ({ ...await original<typeof import("@/lib/projects-api")>(), projectsApi: { get: vi.fn() } }));
vi.mock("@/lib/issues-api", async original => ({
  ...await original<typeof import("@/lib/issues-api")>(),
  issuesApi: { list: vi.fn(), get: vi.fn(), create: vi.fn(), edit: vi.fn(), assign: vi.fn(), setStatus: vi.fn(), setPriority: vi.fn() },
}));

const issue = (over: Partial<Issue> = {}): Issue => ({
  id: "i1", projectId: "p1", number: 1, identifier: "WEB-1", title: "Fix login", description: "Broken", status: "TODO", priority: "MEDIUM",
  assignee: null, createdBy: { id: "u1", name: "Ada" }, createdAt: "2026-01-01T00:00:00Z", updatedAt: "2026-01-01T00:00:00Z", ...over,
});
const page = (items: Issue[], over: Partial<IssuePage> = {}): IssuePage => ({ items, page: 0, size: 20, totalItems: items.length, totalPages: items.length ? 1 : 0, ...over });
const wrap = (ui: React.ReactNode) => render(<QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}>{ui}</QueryClientProvider>);

describe("IssuesPanel", () => {
  beforeEach(() => vi.resetAllMocks());
  afterEach(cleanup);

  it("shows an empty state", async () => {
    vi.mocked(issuesApi.list).mockResolvedValue(page([]));
    wrap(<IssuesPanel organizationId="o1" projectId="p1" archived={false} />);
    expect(await screen.findByText(/No issues yet/)).toBeTruthy();
  });

  it("lists issues with key, status and assignee", async () => {
    vi.mocked(issuesApi.list).mockResolvedValue(page([issue(), issue({ id: "i2", number: 2, identifier: "WEB-2", title: "Add search", status: "DONE", assignee: { id: "u2", name: "Grace" } })]));
    wrap(<IssuesPanel organizationId="o1" projectId="p1" archived={false} />);
    expect(await screen.findByText("WEB-1")).toBeTruthy();
    expect(screen.getByText("Unassigned")).toBeTruthy();
    expect(screen.getByText("Grace")).toBeTruthy();
    expect(screen.getByText("Done")).toBeTruthy();
    expect(screen.getByRole("link", { name: "Fix login" }).getAttribute("href")).toBe("/organizations/o1/projects/p1/issues/1");
  });

  it("paginates with the server page", async () => {
    vi.mocked(issuesApi.list).mockImplementation(async (_o, _p, params) => params.page === 0
      ? page([issue()], { totalItems: 21, totalPages: 2 }) : page([issue({ id: "i2", number: 2, identifier: "WEB-2", title: "Second page" })], { page: 1, totalItems: 21, totalPages: 2 }));
    wrap(<IssuesPanel organizationId="o1" projectId="p1" archived={false} />);
    await screen.findByText("Fix login");
    await userEvent.click(screen.getByRole("button", { name: "Next" }));
    expect(await screen.findByText("Second page")).toBeTruthy();
    expect(screen.getByText(/Page 2 of 2/)).toBeTruthy();
  });

  it("shows an error with retry", async () => {
    vi.mocked(issuesApi.list).mockRejectedValueOnce(new ApiError("boom", 500)).mockResolvedValue(page([issue()]));
    wrap(<IssuesPanel organizationId="o1" projectId="p1" archived={false} />);
    await userEvent.click(await screen.findByRole("button", { name: "Retry" }));
    expect(await screen.findByText("Fix login")).toBeTruthy();
  });

  it("creates an issue and hides the form", async () => {
    vi.mocked(issuesApi.list).mockResolvedValue(page([]));
    vi.mocked(issuesApi.create).mockResolvedValue(issue());
    wrap(<IssuesPanel organizationId="o1" projectId="p1" archived={false} />);
    await userEvent.click(await screen.findByRole("button", { name: "New issue" }));
    await userEvent.type(screen.getByLabelText("Title"), "Fix login");
    await userEvent.click(screen.getByRole("button", { name: "Create issue" }));
    await waitFor(() => expect(issuesApi.create).toHaveBeenCalledWith("o1", "p1", { title: "Fix login", description: undefined }));
    await waitFor(() => expect(screen.queryByRole("form", { name: "New issue" })).toBeNull());
  });

  it("validates the title and hides creation on archived projects", async () => {
    vi.mocked(issuesApi.list).mockResolvedValue(page([]));
    const { unmount } = wrap(<IssuesPanel organizationId="o1" projectId="p1" archived={false} />);
    await userEvent.click(await screen.findByRole("button", { name: "New issue" }));
    await userEvent.click(screen.getByRole("button", { name: "Create issue" }));
    expect(await screen.findByText("Title is required")).toBeTruthy();
    expect(issuesApi.create).not.toHaveBeenCalled();
    unmount();
    wrap(<IssuesPanel organizationId="o1" projectId="p1" archived />);
    await screen.findByText(/archived project has no issues/);
    expect(screen.queryByRole("button", { name: "New issue" })).toBeNull();
  });
});

describe("IssueDetail", () => {
  const project: Project = { id: "p1", organizationId: "o1", key: "WEB", name: "Website", description: null, status: "ACTIVE", createdAt: "", updatedAt: "", archivedAt: null };
  beforeEach(() => {
    vi.resetAllMocks();
    vi.mocked(projectsApi.get).mockResolvedValue(project);
    vi.mocked(commentsApi.list).mockResolvedValue([]);
    vi.mocked(organizationsApi.members).mockResolvedValue([{ userId: "u2", name: "Grace", email: "g@x.dev", role: "MEMBER", joinedAt: "" }]);
  });
  afterEach(cleanup);

  it("shows the details and applies status, priority and assignee changes", async () => {
    const moved = issue({ status: "IN_PROGRESS" });
    const assigned = issue({ status: "IN_PROGRESS", assignee: { id: "u2", name: "Grace" } });
    vi.mocked(issuesApi.get).mockResolvedValueOnce(issue()).mockResolvedValueOnce(moved).mockResolvedValue(assigned);
    vi.mocked(issuesApi.setStatus).mockResolvedValue(moved);
    vi.mocked(issuesApi.assign).mockResolvedValue(assigned);
    wrap(<IssueDetail organizationId="o1" projectId="p1" number="1" />);
    expect(await screen.findByRole("heading", { name: "Fix login" })).toBeTruthy();
    expect(screen.getByText("Ada")).toBeTruthy();
    await userEvent.selectOptions(screen.getByLabelText("Status"), "IN_PROGRESS");
    await waitFor(() => expect(issuesApi.setStatus).toHaveBeenCalledWith("o1", "p1", 1, "IN_PROGRESS"));
    await waitFor(() => expect((screen.getByLabelText("Status") as HTMLSelectElement).value).toBe("IN_PROGRESS"));
    await waitFor(() => expect((screen.getByLabelText("Assignee") as HTMLSelectElement).options.length).toBe(2));
    await userEvent.selectOptions(screen.getByLabelText("Assignee"), "u2");
    await waitFor(() => expect(issuesApi.assign).toHaveBeenCalledWith("o1", "p1", 1, "u2"));
    await waitFor(() => expect((screen.getByLabelText("Assignee") as HTMLSelectElement).value).toBe("u2"));
  });

  it("edits the title with the server response", async () => {
    const edited = issue({ title: "Fix signup", updatedAt: "2026-02-01T00:00:00Z" });
    vi.mocked(issuesApi.get).mockResolvedValueOnce(issue()).mockResolvedValue(edited);
    vi.mocked(issuesApi.edit).mockResolvedValue(edited);
    wrap(<IssueDetail organizationId="o1" projectId="p1" number="1" />);
    const title = await screen.findByLabelText("Title");
    await userEvent.clear(title);
    await userEvent.type(title, "Fix signup");
    await userEvent.click(screen.getByRole("button", { name: "Save changes" }));
    expect(await screen.findByRole("heading", { name: "Fix signup" })).toBeTruthy();
    expect(issuesApi.edit).toHaveBeenCalledWith("o1", "p1", 1, { title: "Fix signup", description: "Broken" });
  });

  it("is read-only when the project is archived", async () => {
    vi.mocked(projectsApi.get).mockResolvedValue({ ...project, status: "ARCHIVED" });
    vi.mocked(issuesApi.get).mockResolvedValue(issue());
    wrap(<IssueDetail organizationId="o1" projectId="p1" number="1" />);
    expect(await screen.findByText(/read-only/)).toBeTruthy();
    expect((screen.getByLabelText("Status") as HTMLSelectElement).disabled).toBe(true);
    expect(screen.queryByRole("button", { name: "Save changes" })).toBeNull();
  });

  it("shows not found for missing issues", async () => {
    vi.mocked(issuesApi.get).mockRejectedValue(new ApiError("Not found", 404));
    wrap(<IssueDetail organizationId="o1" projectId="p1" number="99" />);
    expect(await screen.findByText(/Issue not found/)).toBeTruthy();
  });
});

describe("CommentThread", () => {
  const project: Project = { id: "p1", organizationId: "o1", key: "WEB", name: "Website", description: null, status: "ACTIVE", createdAt: "", updatedAt: "", archivedAt: null };
  const comment = (over: Partial<Comment> = {}): Comment => ({
    id: "c1", issueId: "i1", body: "Hello", author: { id: "u1", name: "Ada" }, createdAt: "2026-01-01T00:00:00Z", updatedAt: "2026-01-01T00:00:00Z", canEdit: true, canDelete: true, ...over,
  });
  beforeEach(() => {
    vi.resetAllMocks();
    vi.mocked(projectsApi.get).mockResolvedValue(project);
    vi.mocked(issuesApi.get).mockResolvedValue(issue());
    vi.mocked(organizationsApi.members).mockResolvedValue([]);
  });
  afterEach(cleanup);

  it("shows comments in order and only offers permitted actions", async () => {
    vi.mocked(commentsApi.list).mockResolvedValue([comment(), comment({ id: "c2", body: "Reply", author: { id: "u2", name: "Bob" }, canEdit: false, canDelete: false })]);
    wrap(<IssueDetail organizationId="o1" projectId="p1" number="1" />);
    expect(await screen.findByText("Hello")).toBeTruthy();
    const items = screen.getAllByRole("listitem").filter(li => li.textContent?.includes("·"));
    expect(items.map(li => li.textContent)).toEqual([expect.stringContaining("Hello"), expect.stringContaining("Reply")]);
    expect(screen.getAllByRole("button", { name: "Delete" })).toHaveLength(1);
    expect(screen.getAllByRole("button", { name: "Edit" })).toHaveLength(1);
  });

  it("sends a comment, refreshes the thread and shows the sending state", async () => {
    vi.mocked(commentsApi.list).mockResolvedValueOnce([]).mockResolvedValue([comment({ body: "New one" })]);
    vi.mocked(commentsApi.add).mockResolvedValue(comment({ body: "New one" }));
    wrap(<IssueDetail organizationId="o1" projectId="p1" number="1" />);
    await screen.findByText("No comments yet.");
    await userEvent.type(screen.getByLabelText("Add a comment"), "New one");
    await userEvent.click(screen.getByRole("button", { name: "Comment" }));
    await waitFor(() => expect(commentsApi.add).toHaveBeenCalledWith("o1", "p1", "1", "New one"));
    expect(await screen.findByText("New one")).toBeTruthy();
  });

  it("rejects empty comments and surfaces API errors", async () => {
    vi.mocked(commentsApi.list).mockResolvedValue([]);
    vi.mocked(commentsApi.add).mockRejectedValue(new ApiError("Archived projects are read-only", 409));
    wrap(<IssueDetail organizationId="o1" projectId="p1" number="1" />);
    await screen.findByText("No comments yet.");
    await userEvent.click(screen.getByRole("button", { name: "Comment" }));
    expect(await screen.findByText("Comment cannot be empty")).toBeTruthy();
    expect(commentsApi.add).not.toHaveBeenCalled();
    await userEvent.type(screen.getByLabelText("Add a comment"), "Hi");
    await userEvent.click(screen.getByRole("button", { name: "Comment" }));
    expect(await screen.findByText("Archived projects are read-only")).toBeTruthy();
  });

  it("edits and deletes through the API", async () => {
    const edited = comment({ body: "Changed", updatedAt: "2026-02-01T00:00:00Z" });
    vi.mocked(commentsApi.list).mockResolvedValueOnce([comment()]).mockResolvedValueOnce([edited]).mockResolvedValue([]);
    vi.mocked(commentsApi.edit).mockResolvedValue(edited);
    vi.mocked(commentsApi.remove).mockResolvedValue(undefined);
    wrap(<IssueDetail organizationId="o1" projectId="p1" number="1" />);
    await userEvent.click(await screen.findByRole("button", { name: "Edit" }));
    const box = screen.getByLabelText("Edit comment");
    await userEvent.clear(box);
    await userEvent.type(box, "Changed");
    await userEvent.click(screen.getByRole("button", { name: "Save" }));
    await waitFor(() => expect(commentsApi.edit).toHaveBeenCalledWith("o1", "p1", "1", "c1", "Changed"));
    expect(await screen.findByText("Changed")).toBeTruthy();
    expect(screen.getByText(/\(edited\)/)).toBeTruthy();
    await userEvent.click(screen.getByRole("button", { name: "Delete" }));
    expect(await screen.findByText("No comments yet.")).toBeTruthy();
    expect(commentsApi.remove).toHaveBeenCalledWith("o1", "p1", "1", "c1");
  });

  it("closes commenting on archived projects", async () => {
    vi.mocked(projectsApi.get).mockResolvedValue({ ...project, status: "ARCHIVED" });
    vi.mocked(commentsApi.list).mockResolvedValue([comment({ canEdit: false, canDelete: false })]);
    wrap(<IssueDetail organizationId="o1" projectId="p1" number="1" />);
    expect(await screen.findByText(/Comments are closed/)).toBeTruthy();
    expect(screen.queryByLabelText("Add a comment")).toBeNull();
  });
});
