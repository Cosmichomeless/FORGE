import { cleanup, render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { AuthProvider } from "@/components/auth/auth-provider";
import { authApi } from "@/lib/auth-api";
import { ApiError } from "@/lib/http";
import { organizationsApi, type Member, type Organization } from "@/lib/organizations-api";
import { InvitationsPanel } from "./invitations-panel";
import { MembersPanel } from "./members-panel";
import { OrganizationDetail } from "./organization-detail";
import { OrganizationProvider } from "./organization-provider";

vi.mock("next/navigation", () => ({ useRouter: () => ({ push: vi.fn(), replace: vi.fn() }), usePathname: () => "/organizations/o-1" }));
vi.mock("@/lib/auth-api", async original => ({ ...await original<typeof import("@/lib/auth-api")>(), authApi: { me: vi.fn(), login: vi.fn(), register: vi.fn(), logout: vi.fn() } }));
vi.mock("@/lib/organizations-api", () => ({ organizationsApi: {
  list: vi.fn(), get: vi.fn(), update: vi.fn(), members: vi.fn(), changeRole: vi.fn(), removeMember: vi.fn(),
  invitations: vi.fn(), invite: vi.fn(), revokeInvitation: vi.fn(),
} }));

vi.mock("@/lib/projects-api", async original => ({ ...await original<typeof import("@/lib/projects-api")>(), projectsApi: { list: vi.fn().mockResolvedValue([]) } }));

const me = { id: "u-1", name: "Ada", email: "ada@example.com" };
const organization = (role: Organization["role"]): Organization => ({ id: "o-1", name: "Acme", slug: "acme", role, createdAt: "2026-10-01T10:00:00Z" });
const member = (userId: string, name: string, role: Member["role"]): Member => ({ userId, name, email: `${name.toLowerCase()}@example.com`, role, joinedAt: "2026-10-01T10:00:00Z" });
const roster = [member("u-1", "Ada", "OWNER"), member("u-2", "Bob", "ADMIN"), member("u-3", "Cy", "MEMBER")];

function mount(child: React.ReactNode) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  render(<QueryClientProvider client={client}><AuthProvider><OrganizationProvider>{child}</OrganizationProvider></AuthProvider></QueryClientProvider>);
  return client;
}
beforeEach(() => {
  vi.clearAllMocks();
  window.localStorage.clear();
  vi.mocked(authApi.me).mockResolvedValue(me);
  vi.mocked(organizationsApi.list).mockResolvedValue([organization("OWNER")]);
  vi.mocked(organizationsApi.members).mockResolvedValue(roster);
  vi.mocked(organizationsApi.invitations).mockResolvedValue([]);
});
afterEach(cleanup);
const row = async (name: string) => (await screen.findByText(name, { selector: "p" })).closest("li")!;

describe("members panel", () => {
  it("lets an owner change any role and remove others", async () => {
    mount(<MembersPanel organization={organization("OWNER")} />);
    const bob = await row("Bob");
    expect(within(bob).getByLabelText("Role of Bob")).toBeTruthy();
    expect(within(bob).getByRole("button", { name: "Remove Bob" })).toBeTruthy();
    expect(within(await row("Ada (you)")).getByRole("button", { name: /Leave/ })).toBeTruthy();
    vi.mocked(organizationsApi.changeRole).mockResolvedValue({ ...roster[2], role: "ADMIN" });
    await userEvent.setup().selectOptions(within(await row("Cy")).getByLabelText("Role of Cy"), "ADMIN");
    await waitFor(() => expect(organizationsApi.changeRole).toHaveBeenCalledWith("o-1", "u-3", "ADMIN"));
  });
  it("shows only the actions an admin may perform", async () => {
    mount(<MembersPanel organization={organization("ADMIN")} />);
    expect(within(await row("Cy")).getByLabelText("Role of Cy")).toBeTruthy();
    expect(within(await row("Cy")).getByRole("button", { name: "Remove Cy" })).toBeTruthy();
    const ada = await row("Ada (you)");
    expect(within(ada).queryByLabelText(/Role of/)).toBeNull();
    expect(within(await row("Bob")).queryByRole("button", { name: /Remove/ })).toBeNull();
    expect(within(await row("Ada (you)")).queryByRole("button", { name: /Remove Ada/ })).toBeNull();
  });
  it("gives plain members a read-only roster with only a leave action for themselves", async () => {
    vi.mocked(authApi.me).mockResolvedValue({ id: "u-3", name: "Cy", email: "cy@example.com" });
    mount(<MembersPanel organization={organization("MEMBER")} />);
    await row("Ada");
    expect(screen.queryAllByLabelText(/Role of/)).toHaveLength(0);
    expect(screen.getAllByRole("button").map(button => button.textContent)).toEqual(["Leave"]);
  });
  it("explains API rejections such as removing the last owner", async () => {
    vi.mocked(organizationsApi.removeMember).mockRejectedValue(new ApiError("An organization must keep at least one owner", 409));
    mount(<MembersPanel organization={organization("OWNER")} />);
    await userEvent.setup().click(within(await row("Ada (you)")).getByRole("button", { name: /Leave/ }));
    expect((await screen.findByRole("alert")).textContent).toBe("An organization must keep at least one owner");
  });
  it("removes a member and reloads the roster", async () => {
    vi.mocked(organizationsApi.removeMember).mockResolvedValue(undefined);
    mount(<MembersPanel organization={organization("OWNER")} />);
    await userEvent.setup().click(within(await row("Cy")).getByRole("button", { name: "Remove Cy" }));
    await waitFor(() => expect(organizationsApi.removeMember).toHaveBeenCalledWith("o-1", "u-3"));
    await waitFor(() => expect(organizationsApi.members).toHaveBeenCalledTimes(2));
  });
});

describe("invitations panel", () => {
  const fill = async (email: string) => {
    const user = userEvent.setup();
    await user.type(screen.getByLabelText("Email to invite"), email);
    await user.click(screen.getByRole("button", { name: "Create invitation" }));
    return user;
  };
  it("validates the email before calling the API", async () => {
    mount(<InvitationsPanel organization={organization("OWNER")} />);
    await fill("nope");
    expect(await screen.findByText("Enter a valid email")).toBeTruthy();
    expect(organizationsApi.invite).not.toHaveBeenCalled();
  });
  it("creates an invitation and shows the one-time acceptance link", async () => {
    vi.mocked(organizationsApi.invite).mockResolvedValue({ id: "i-1", email: "new@example.com", role: "ADMIN", createdAt: "2026-10-01T10:00:00Z", expiresAt: "2026-10-08T10:00:00Z", token: "tok/en+1" });
    mount(<InvitationsPanel organization={organization("ADMIN")} />);
    await screen.findByText("No pending invitations.");
    await userEvent.setup().selectOptions(screen.getByLabelText("Role"), "ADMIN");
    await fill(" NEW@example.com ");
    const link = await screen.findByLabelText("Invitation link") as HTMLInputElement;
    expect(link.value).toBe(`${window.location.origin}/invitations/accept#token=tok%2Fen%2B1`);
    expect(organizationsApi.invite).toHaveBeenCalledWith("o-1", { email: "new@example.com", role: "ADMIN" });
  });
  it("shows duplicate and permission errors clearly", async () => {
    vi.mocked(organizationsApi.invite)
      .mockRejectedValueOnce(new ApiError("This user is already a member", 409, { email: "This user is already a member" }))
      .mockRejectedValueOnce(new ApiError("Only owners and admins can do this", 403));
    mount(<InvitationsPanel organization={organization("OWNER")} />);
    const user = await fill("bob@example.com");
    expect((await screen.findAllByText("This user is already a member")).length).toBeGreaterThan(0);
    expect(screen.getByLabelText("Email to invite").getAttribute("aria-invalid")).toBe("true");
    await user.click(screen.getByRole("button", { name: "Create invitation" }));
    expect(await screen.findByText("Only owners and admins can do this")).toBeTruthy();
    expect(screen.queryByLabelText("Invitation link")).toBeNull();
  });
  it("lists pending invitations and revokes one", async () => {
    vi.mocked(organizationsApi.invitations).mockResolvedValue([{ id: "i-1", email: "cy@example.com", role: "MEMBER", createdAt: "2026-10-01T10:00:00Z", expiresAt: "2026-10-08T10:00:00Z" }]);
    vi.mocked(organizationsApi.revokeInvitation).mockResolvedValue(undefined);
    mount(<InvitationsPanel organization={organization("OWNER")} />);
    await screen.findByText("cy@example.com");
    await userEvent.setup().click(screen.getByRole("button", { name: "Revoke invitation for cy@example.com" }));
    await waitFor(() => expect(organizationsApi.revokeInvitation).toHaveBeenCalledWith("o-1", "i-1"));
  });
});

describe("organization detail", () => {
  it("shows settings and invitations to managers", async () => {
    vi.mocked(organizationsApi.get).mockResolvedValue(organization("ADMIN"));
    mount(<OrganizationDetail organizationId="o-1" />);
    expect(await screen.findByRole("heading", { name: "Settings" })).toBeTruthy();
    expect(screen.getByRole("heading", { name: "Invitations" })).toBeTruthy();
    expect(await screen.findByRole("heading", { name: "Members" })).toBeTruthy();
  });
  it("hides management UI from plain members and never requests invitations", async () => {
    vi.mocked(organizationsApi.get).mockResolvedValue(organization("MEMBER"));
    mount(<OrganizationDetail organizationId="o-1" />);
    expect(await screen.findByText("Only owners and admins can edit this organization.")).toBeTruthy();
    expect(screen.queryByRole("heading", { name: "Invitations" })).toBeNull();
    expect(organizationsApi.invitations).not.toHaveBeenCalled();
  });
  it("reports organizations the user cannot see without retry noise", async () => {
    vi.mocked(organizationsApi.get).mockRejectedValue(new ApiError("Organization not found", 404));
    mount(<OrganizationDetail organizationId="other" />);
    expect((await screen.findByRole("alert")).textContent).toContain("not found");
    expect(screen.queryByRole("button", { name: "Retry" })).toBeNull();
  });
});
