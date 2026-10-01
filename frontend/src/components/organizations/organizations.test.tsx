import { cleanup, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { AuthProvider } from "@/components/auth/auth-provider";
import { authApi } from "@/lib/auth-api";
import { ApiError } from "@/lib/http";
import { organizationsApi, type Organization } from "@/lib/organizations-api";
import { ActiveOrganizationSummary } from "./active-organization-summary";
import { OrganizationProvider } from "./organization-provider";
import { OrganizationSwitcher } from "./organization-switcher";
import { OrganizationsView } from "./organizations-view";

const nav = vi.hoisted(() => ({ push: vi.fn(), replace: vi.fn(), pathname: "/dashboard" }));
vi.mock("next/navigation", () => ({ useRouter: () => ({ push: nav.push, replace: nav.replace }), usePathname: () => nav.pathname }));
vi.mock("@/lib/auth-api", async original => ({ ...await original<typeof import("@/lib/auth-api")>(), authApi: { me: vi.fn(), login: vi.fn(), register: vi.fn(), logout: vi.fn() } }));
vi.mock("@/lib/organizations-api", () => ({ organizationsApi: { list: vi.fn(), create: vi.fn(), get: vi.fn(), update: vi.fn() } }));

const ada = { id: "u-1", name: "Ada", email: "ada@example.com" };
const org = (id: string, name: string, role: Organization["role"] = "OWNER"): Organization => ({ id, name, slug: name.toLowerCase(), role, createdAt: "2026-10-01T10:00:00Z" });
const acme = org("o-1", "Acme");
const globex = org("o-2", "Globex", "MEMBER");

function mount(child: React.ReactNode) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  render(<QueryClientProvider client={client}><AuthProvider><OrganizationProvider>{child}</OrganizationProvider></AuthProvider></QueryClientProvider>);
  return client;
}
beforeEach(() => {
  vi.clearAllMocks();
  window.localStorage.clear();
  nav.pathname = "/dashboard";
  vi.mocked(authApi.me).mockResolvedValue(ada);
  vi.mocked(organizationsApi.list).mockResolvedValue([acme, globex]);
});
afterEach(cleanup);

describe("organization creation", () => {
  it("suggests a slug from the name, creates the organization and opens it", async () => {
    vi.mocked(organizationsApi.list).mockResolvedValue([]);
    vi.mocked(organizationsApi.create).mockResolvedValue(org("o-9", "Acme Inc"));
    mount(<OrganizationsView />);
    const user = userEvent.setup();
    await screen.findByText(/do not belong to any organization/);
    await user.type(screen.getByLabelText("Name"), "Café Ñandú Inc");
    expect((screen.getByLabelText("Slug") as HTMLInputElement).value).toBe("cafe-nandu-inc");
    await user.click(screen.getByRole("button", { name: "Create organization" }));
    await waitFor(() => expect(nav.push).toHaveBeenCalledWith("/organizations/o-9"));
    expect(vi.mocked(organizationsApi.create).mock.calls[0][0]).toEqual({ name: "Café Ñandú Inc", slug: "cafe-nandu-inc" });
    expect(window.localStorage.getItem("forge.activeOrganization.u-1")).toBe("o-9");
  });
  it("validates fields and does not call the API when invalid", async () => {
    mount(<OrganizationsView />);
    const user = userEvent.setup();
    await screen.findByText("Globex");
    await user.type(screen.getByLabelText("Slug"), "Bad Slug!");
    await user.click(screen.getByRole("button", { name: "Create organization" }));
    expect(await screen.findByText("Name is required")).toBeTruthy();
    expect(screen.getByText("Use lowercase letters, digits and single hyphens")).toBeTruthy();
    expect(organizationsApi.create).not.toHaveBeenCalled();
  });
  it("shows the API slug conflict next to the field", async () => {
    vi.mocked(organizationsApi.create).mockRejectedValue(new ApiError("Slug already in use", 409, { slug: "Slug already in use" }));
    mount(<OrganizationsView />);
    const user = userEvent.setup();
    await screen.findByText("Globex");
    await user.type(screen.getByLabelText("Name"), "Acme");
    await user.click(screen.getByRole("button", { name: "Create organization" }));
    expect((await screen.findAllByText("Slug already in use")).length).toBeGreaterThan(0);
    expect(screen.getByLabelText("Slug").getAttribute("aria-invalid")).toBe("true");
    expect(nav.push).not.toHaveBeenCalled();
  });
});

describe("organization switcher", () => {
  it("defaults to the first organization and changes the visible data when switching", async () => {
    mount(<><OrganizationSwitcher /><ActiveOrganizationSummary /></>);
    const select = await screen.findByLabelText("Organization") as HTMLSelectElement;
    expect(select.value).toBe("o-1");
    expect((await screen.findByRole("heading", { name: "Active organization" })).parentElement?.textContent).toContain("Acme");
    await userEvent.setup().selectOptions(select, "o-2");
    await waitFor(() => expect(screen.getByRole("heading", { name: "Active organization" }).parentElement?.textContent).toContain("Globex"));
    expect(screen.getByText(/your role: MEMBER/)).toBeTruthy();
    expect(window.localStorage.getItem("forge.activeOrganization.u-1")).toBe("o-2");
    expect(nav.push).not.toHaveBeenCalled();
  });
  it("restores the remembered organization and ignores ones the user left", async () => {
    window.localStorage.setItem("forge.activeOrganization.u-1", "o-2");
    mount(<OrganizationSwitcher />);
    expect(((await screen.findByLabelText("Organization")) as HTMLSelectElement).value).toBe("o-2");
    cleanup();
    window.localStorage.setItem("forge.activeOrganization.u-1", "gone");
    mount(<OrganizationSwitcher />);
    expect(((await screen.findByLabelText("Organization")) as HTMLSelectElement).value).toBe("o-1");
  });
  it("navigates to the selected organization while viewing an organization page", async () => {
    nav.pathname = "/organizations/o-1";
    mount(<OrganizationSwitcher />);
    await userEvent.setup().selectOptions(await screen.findByLabelText("Organization"), "o-2");
    expect(nav.push).toHaveBeenCalledWith("/organizations/o-2");
  });
  it("offers creation when the user has no organization and retry when loading fails", async () => {
    vi.mocked(organizationsApi.list).mockResolvedValueOnce([]);
    mount(<OrganizationSwitcher />);
    await waitFor(() => expect(organizationsApi.list).toHaveBeenCalledTimes(1));
    expect((await screen.findByRole("link", { name: "Create an organization" })).getAttribute("href")).toBe("/organizations");
    cleanup();
    vi.mocked(organizationsApi.list).mockRejectedValueOnce(new Error("offline")).mockResolvedValueOnce([acme]);
    mount(<OrganizationSwitcher />);
    await userEvent.setup().click(await screen.findByRole("button", { name: "Retry loading organizations" }));
    expect(await screen.findByLabelText("Organization")).toBeTruthy();
  });
});
