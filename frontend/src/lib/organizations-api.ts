import { apiGet, apiSend } from "./http";

export type Role = "OWNER" | "ADMIN" | "MEMBER";
export type Organization = { id: string; name: string; slug: string; role: Role; createdAt: string };
export type OrganizationInput = { name: string; slug: string };
export type Member = { userId: string; name: string; email: string; role: Role; joinedAt: string };
export type Invitation = { id: string; email: string; role: Exclude<Role, "OWNER">; createdAt: string; expiresAt: string };
export type CreatedInvitation = Invitation & { token: string };
export type InvitationInput = { email: string; role: Invitation["role"] };

const org = (id: string) => `organizations/${id}`;

export const organizationsApi = {
  list: (signal?: AbortSignal) => apiGet<Organization[]>("organizations", signal),
  get: (id: string, signal?: AbortSignal) => apiGet<Organization>(org(id), signal),
  create: (input: OrganizationInput) => apiSend<Organization>("POST", "organizations", input),
  update: (id: string, input: OrganizationInput) => apiSend<Organization>("PUT", org(id), input),
  members: (id: string, signal?: AbortSignal) => apiGet<Member[]>(`${org(id)}/members`, signal),
  changeRole: (id: string, userId: string, role: Role) => apiSend<Member>("PUT", `${org(id)}/members/${userId}`, { role }),
  removeMember: (id: string, userId: string) => apiSend<void>("DELETE", `${org(id)}/members/${userId}`),
  invitations: (id: string, signal?: AbortSignal) => apiGet<Invitation[]>(`${org(id)}/invitations`, signal),
  invite: (id: string, input: InvitationInput) => apiSend<CreatedInvitation>("POST", `${org(id)}/invitations`, input),
  revokeInvitation: (id: string, invitationId: string) => apiSend<void>("DELETE", `${org(id)}/invitations/${invitationId}`),
  acceptInvitation: (token: string) => apiSend<Organization>("POST", "invitations/accept", { token }),
};
