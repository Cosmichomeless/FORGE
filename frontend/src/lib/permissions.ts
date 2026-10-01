import type { Member, Role } from "./organizations-api";

/** Mirrors the API's RBAC so the UI only offers allowed actions; the server remains the authority. */
export const canManageOrganization = (role: Role) => role === "OWNER" || role === "ADMIN";

export function assignableRoles(actor: Role, target: Member): Role[] {
  if (actor === "OWNER") return ["OWNER", "ADMIN", "MEMBER"];
  if (actor === "ADMIN" && target.role === "MEMBER") return ["MEMBER", "ADMIN"];
  return [];
}

export function canRemoveMember(actor: Role, actorId: string, target: Member): boolean {
  if (target.userId === actorId) return true;
  if (actor === "OWNER") return true;
  return actor === "ADMIN" && target.role === "MEMBER";
}

export function slugify(name: string): string {
  return name.normalize("NFKD").replace(/[̀-ͯ]/g, "").toLowerCase()
    .replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 48).replace(/-+$/, "");
}
