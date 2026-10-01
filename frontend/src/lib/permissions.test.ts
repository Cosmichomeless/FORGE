import { describe, expect, it } from "vitest";
import type { Member } from "./organizations-api";
import { assignableRoles, canManageOrganization, canRemoveMember, slugify } from "./permissions";

const member = (role: Member["role"], userId = "u-2"): Member => ({ userId, name: "N", email: "n@example.com", role, joinedAt: "2026-10-01T00:00:00Z" });

describe("permissions", () => {
  it("only owners and admins manage the organization", () => {
    expect(canManageOrganization("OWNER")).toBe(true);
    expect(canManageOrganization("ADMIN")).toBe(true);
    expect(canManageOrganization("MEMBER")).toBe(false);
  });
  it("mirrors the API role assignment rules", () => {
    expect(assignableRoles("OWNER", member("ADMIN"))).toEqual(["OWNER", "ADMIN", "MEMBER"]);
    expect(assignableRoles("ADMIN", member("MEMBER"))).toEqual(["MEMBER", "ADMIN"]);
    expect(assignableRoles("ADMIN", member("ADMIN"))).toEqual([]);
    expect(assignableRoles("ADMIN", member("OWNER"))).toEqual([]);
    expect(assignableRoles("MEMBER", member("MEMBER"))).toEqual([]);
  });
  it("lets anyone leave but only managers remove others", () => {
    expect(canRemoveMember("MEMBER", "u-1", member("MEMBER", "u-1"))).toBe(true);
    expect(canRemoveMember("MEMBER", "u-1", member("MEMBER"))).toBe(false);
    expect(canRemoveMember("ADMIN", "u-1", member("MEMBER"))).toBe(true);
    expect(canRemoveMember("ADMIN", "u-1", member("ADMIN"))).toBe(false);
    expect(canRemoveMember("OWNER", "u-1", member("OWNER"))).toBe(true);
  });
  it("builds URL-safe slugs", () => {
    expect(slugify("  Café Ñandú -- Inc.  ")).toBe("cafe-nandu-inc");
    expect(slugify("A".repeat(60))).toHaveLength(48);
    expect(slugify("!!!")).toBe("");
  });
});
