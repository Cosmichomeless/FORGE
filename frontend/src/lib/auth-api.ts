import { ApiError, apiGet, apiSend } from "./http";

export type PublicUser = { id: string; name: string; email: string };
export type LoginInput = { email: string; password: string };
export type RegisterInput = LoginInput & { name: string };
export { ApiError as AuthApiError };

export const authApi = {
  async me(signal?: AbortSignal): Promise<PublicUser | null> {
    try { return await apiGet<PublicUser>("auth/me", signal); }
    catch (error) {
      if (error instanceof ApiError && error.status === 401) return null;
      throw error;
    }
  },
  login: (input: LoginInput) => apiSend<PublicUser>("POST", "auth/login", input),
  register: (input: RegisterInput) => apiSend<PublicUser>("POST", "auth/register", input),
  logout: () => apiSend<void>("POST", "auth/logout"),
};
