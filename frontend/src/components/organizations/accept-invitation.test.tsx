import { cleanup, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { AuthProvider } from "@/components/auth/auth-provider";
import { authApi } from "@/lib/auth-api";
import { ApiError } from "@/lib/http";
import { organizationsApi } from "@/lib/organizations-api";
import { AcceptInvitation } from "./accept-invitation";
import { OrganizationProvider } from "./organization-provider";

const nav = vi.hoisted(() => ({ replace: vi.fn() }));
vi.mock("next/navigation", () => ({ useRouter: () => ({ replace: nav.replace, push: vi.fn() }), usePathname: () => "/invitations/accept" }));
vi.mock("@/lib/auth-api", async original => ({ ...await original<typeof import("@/lib/auth-api")>(), authApi: { me: vi.fn(), login: vi.fn(), register: vi.fn(), logout: vi.fn() } }));
vi.mock("@/lib/organizations-api", () => ({ organizationsApi: { list: vi.fn(), acceptInvitation: vi.fn() } }));

const acme = { id: "o-1", name: "Acme", slug: "acme", role: "MEMBER" as const, createdAt: "2026-10-01T10:00:00Z" };
function mount() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  render(<QueryClientProvider client={client}><AuthProvider><OrganizationProvider><AcceptInvitation /></OrganizationProvider></AuthProvider></QueryClientProvider>);
}
beforeEach(() => {
  vi.clearAllMocks();
  window.localStorage.clear();
  window.history.replaceState(null, "", "/invitations/accept");
  vi.mocked(authApi.me).mockResolvedValue({ id: "u-1", name: "Bob", email: "bob@example.com" });
  vi.mocked(organizationsApi.list).mockResolvedValue([]);
});
afterEach(cleanup);

describe("accept invitation", () => {
  it("prefills the token from the URL fragment and opens the organization on success", async () => {
    window.history.replaceState(null, "", "/invitations/accept#token=abc%2F123");
    vi.mocked(organizationsApi.acceptInvitation).mockResolvedValue(acme);
    mount();
    expect(((await screen.findByLabelText("Invitation token")) as HTMLInputElement).value).toBe("abc/123");
    await userEvent.setup().click(screen.getByRole("button", { name: "Accept invitation" }));
    await waitFor(() => expect(nav.replace).toHaveBeenCalledWith("/organizations/o-1"));
    expect(organizationsApi.acceptInvitation).toHaveBeenCalledWith("abc/123");
    expect(window.localStorage.getItem("forge.activeOrganization.u-1")).toBe("o-1");
  });
  it("requires a token and shows expired, used or foreign-email rejections", async () => {
    vi.mocked(organizationsApi.acceptInvitation).mockRejectedValue(new ApiError("This invitation has expired", 410));
    mount();
    const user = userEvent.setup();
    await screen.findByLabelText("Invitation token");
    expect((screen.getByRole("button", { name: "Accept invitation" }) as HTMLButtonElement).disabled).toBe(true);
    await user.type(screen.getByLabelText("Invitation token"), "old-token");
    await user.click(screen.getByRole("button", { name: "Accept invitation" }));
    expect((await screen.findByRole("alert")).textContent).toBe("This invitation has expired");
    expect(nav.replace).not.toHaveBeenCalled();
  });
});
