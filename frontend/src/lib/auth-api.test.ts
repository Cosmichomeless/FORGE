import { afterEach, describe, expect, it, vi } from "vitest";
import { authApi, AuthApiError } from "./auth-api";

afterEach(() => vi.unstubAllGlobals());
const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status });

describe("auth API", () => {
  it("includes cookies and obtains a fresh uncached CSRF token before every POST", async () => {
    const fetch = vi.fn()
      .mockResolvedValueOnce(json({ token: "first", headerName: "X-CSRF-TOKEN" }))
      .mockResolvedValueOnce(json({ id: "f73d03ae-fdfe-4a12-832b-478a712b1d0f", name: "Ada", email: "ada@example.com" }))
      .mockResolvedValueOnce(json({ token: "rotated", headerName: "X-CSRF-TOKEN" }))
      .mockResolvedValueOnce(new Response(null, { status: 204 }));
    vi.stubGlobal("fetch", fetch);
    await authApi.login({ email: "ada@example.com", password: "secret" });
    await authApi.logout();
    expect(fetch.mock.calls.map(([url]) => url)).toEqual([
      "http://localhost:8080/api/v1/auth/csrf", "http://localhost:8080/api/v1/auth/login",
      "http://localhost:8080/api/v1/auth/csrf", "http://localhost:8080/api/v1/auth/logout",
    ]);
    for (const [, options] of fetch.mock.calls) expect(options).toMatchObject({ credentials: "include", cache: "no-store" });
    expect(fetch.mock.calls[1][1]).toMatchObject({ method: "POST", headers: { "X-CSRF-TOKEN": "first", "Content-Type": "application/json" }, body: JSON.stringify({ email: "ada@example.com", password: "secret" }) });
    expect(fetch.mock.calls[3][1].headers["X-CSRF-TOKEN"]).toBe("rotated");
  });
  it("registers and preserves duplicate email field errors", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValueOnce(json({ token: "t", headerName: "X-CSRF-TOKEN" })).mockResolvedValueOnce(json({ message: "Email already registered", fieldErrors: { email: "Already registered" } }, 409)));
    await expect(authApi.register({ name: "Ada", email: "ada@example.com", password: "password" })).rejects.toMatchObject({ status: 409, fieldErrors: { email: "Already registered" } });
  });
  it("resolves anonymous only for 401 and surfaces other failures", async () => {
    const fetch = vi.fn().mockResolvedValueOnce(json({}, 401)).mockResolvedValueOnce(json({ message: "Unavailable" }, 503));
    vi.stubGlobal("fetch", fetch);
    await expect(authApi.me()).resolves.toBeNull();
    await expect(authApi.me()).rejects.toBeInstanceOf(AuthApiError);
    expect(fetch.mock.calls[0][1]).toMatchObject({ credentials: "include", cache: "no-store" });
  });
});
