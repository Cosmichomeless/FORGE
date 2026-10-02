import { afterEach, describe, expect, it, vi } from "vitest";
import { ApiError } from "./http";
import { apiGet, statusMessage } from "./http";

afterEach(() => vi.unstubAllGlobals());

describe("http errors", () => {
  it("keeps the server message when there is one", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response(JSON.stringify({ message: "Key already in use", fieldErrors: { key: "taken" } }), { status: 409 })));
    await expect(apiGet("x")).rejects.toMatchObject({ message: "Key already in use", status: 409, fieldErrors: { key: "taken" } });
  });
  it("falls back to a readable message by status when the body is not JSON", async () => {
    for (const status of [401, 403, 404, 500]) {
      vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response("<html>oops</html>", { status })));
      const error = await apiGet("x").catch(e => e) as ApiError;
      expect(error).toBeInstanceOf(ApiError);
      expect(error.message).toBe(statusMessage(status));
    }
  });
  it("never shows raw status codes to people", () => {
    for (const status of [400, 401, 403, 404, 409, 429, 500, 503]) expect(statusMessage(status)).not.toMatch(/\d{3}/);
  });
});
