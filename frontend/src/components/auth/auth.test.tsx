import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { AuthProvider } from "./auth-provider";
import { AuthForm } from "./auth-form";
import { PrivateShell } from "./private-shell";
import { UserMenu } from "@/components/layout/user-menu";
import { authApi, AuthApiError } from "@/lib/auth-api";

const { replace } = vi.hoisted(() => ({ replace: vi.fn() }));
vi.mock("next/navigation", () => ({ useRouter: () => ({ replace }) }));
vi.mock("@/lib/auth-api", async (original) => ({ ...await original<typeof import("@/lib/auth-api")>(), authApi: { me: vi.fn(), login: vi.fn(), register: vi.fn(), logout: vi.fn() } }));
const ada = { id: "f73d03ae-fdfe-4a12-832b-478a712b1d0f", name: "Ada", email: "ada@example.com" };
function mount(child: React.ReactNode) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  render(<QueryClientProvider client={client}><AuthProvider>{child}</AuthProvider></QueryClientProvider>);
  return client;
}
beforeEach(() => { vi.clearAllMocks(); vi.mocked(authApi.me).mockResolvedValue(null); });
afterEach(cleanup);
async function fill(mode: "login" | "register") {
  const user = userEvent.setup();
  if (mode === "register") await user.type(screen.getByLabelText("Name"), " Ada " );
  await user.type(screen.getByLabelText("Email"), "ADA@example.com");
  await user.type(screen.getByLabelText("Password"), "password123");
  return user;
}
describe("auth forms", () => {
  it("validates register fields including UTF-8 password byte limits", async () => {
    mount(<AuthForm mode="register" />);
    fireEvent.submit(screen.getByRole("button", { name: "Create account" }).closest("form")!);
    expect(await screen.findByText("Name is required")).toBeTruthy();
    await fill("register");
    fireEvent.change(screen.getByLabelText("Password"), { target: { value: "é".repeat(37) } });
    fireEvent.submit(screen.getByRole("button", { name: "Create account" }).closest("form")!);
    expect(await screen.findByText("Password must be at most 72 UTF-8 bytes")).toBeTruthy();
    expect(authApi.register).not.toHaveBeenCalled();
  });
  it("normalizes registration and displays API field errors", async () => {
    vi.mocked(authApi.register).mockRejectedValue(new AuthApiError("Registration failed", 409, { email: "Already registered" }));
    mount(<AuthForm mode="register" />);
    const user = await fill("register");
    await user.click(screen.getByRole("button", { name: "Create account" }));
    expect(await screen.findByText("Already registered")).toBeTruthy();
    expect(authApi.register).toHaveBeenCalledWith({ name: "Ada", email: "ada@example.com", password: "password123" });
    expect(screen.getByLabelText("Email").getAttribute("aria-describedby")).toBe("email-error");
  });
  it("disables pending submissions and prevents duplicate requests", async () => {
    let finish!: (value: typeof ada) => void;
    vi.mocked(authApi.login).mockReturnValue(new Promise(resolve => { finish = resolve; }));
    const client = mount(<AuthForm mode="login" />);
    const user = await fill("login");
    const form = screen.getByRole("button", { name: "Log in" }).closest("form")!;
    await user.click(screen.getByRole("button", { name: "Log in" }));
    expect((screen.getByRole("button", { name: "Please wait…" }) as HTMLButtonElement).disabled).toBe(true);
    fireEvent.submit(form);
    expect(authApi.login).toHaveBeenCalledTimes(1);
    finish(ada);
    await waitFor(() => expect(replace).toHaveBeenCalledWith("/dashboard"));
    expect(client.getQueryData(["auth", "me"])).toEqual(ada);
  });
  it("displays the generic API error for invalid login credentials", async () => {
    vi.mocked(authApi.login).mockRejectedValue(new AuthApiError("Invalid email or password", 401));
    mount(<AuthForm mode="login" />);
    fireEvent.change(screen.getByLabelText("Email"), { target: { value: "unknown@example.com" } });
    fireEvent.change(screen.getByLabelText("Password"), { target: { value: "x" } });
    fireEvent.submit(screen.getByRole("button", { name: "Log in" }).closest("form")!);
    expect(await screen.findByText("Invalid email or password")).toBeTruthy();
    expect(authApi.login).toHaveBeenCalled();
  });
  it("sends successful registration to login without authenticating", async () => {
    vi.mocked(authApi.register).mockResolvedValue(ada);
    const client = mount(<AuthForm mode="register" />);
    const user = await fill("register");
    await user.click(screen.getByRole("button", { name: "Create account" }));
    await waitFor(() => expect(replace).toHaveBeenCalledWith("/login"));
    expect(client.getQueryData(["auth", "me"])).toBeNull();
  });
});
describe("private shell", () => {
  it("hides private content while resolving and redirects anonymous users", async () => {
    mount(<PrivateShell><p>Private content</p></PrivateShell>);
    expect(screen.queryByText("Private content")).toBeNull();
    await waitFor(() => expect(replace).toHaveBeenCalledWith("/login"));
    expect(screen.queryByText("Private content")).toBeNull();
  });
  it("resolves an existing cookie session and clears all private cache on logout", async () => {
    vi.mocked(authApi.me).mockResolvedValue(ada);
    vi.mocked(authApi.logout).mockResolvedValue(undefined);
    // Identity and logout live in the sidebar user menu; the shell only gates the page content.
    const client = mount(<><UserMenu /><PrivateShell><p>Private content</p></PrivateShell></>);
    client.setQueryData(["private"], { secret: true });
    expect(await screen.findByText("Private content")).toBeTruthy();
    await userEvent.setup().click(screen.getByRole("button", { name: "Log out" }));
    await waitFor(() => expect(replace).toHaveBeenCalledWith("/login"));
    expect(client.getQueryData(["auth", "me"])).toBeNull();
    expect(client.getQueryData(["private"])).toBeUndefined();
    expect(screen.queryByText("Private content")).toBeNull();
  });
  it("shows resolution errors with retry instead of redirecting", async () => {
    vi.mocked(authApi.me).mockRejectedValueOnce(new Error("Offline")).mockResolvedValueOnce(ada);
    mount(<PrivateShell><p>Private content</p></PrivateShell>);
    expect(await screen.findByRole("alert")).toBeTruthy();
    expect(replace).not.toHaveBeenCalled();
    await userEvent.setup().click(screen.getByRole("button", { name: "Retry" }));
    expect(await screen.findByText("Private content")).toBeTruthy();
  });
});
