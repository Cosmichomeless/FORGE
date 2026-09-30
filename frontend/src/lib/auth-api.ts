export type PublicUser = { id: string; name: string; email: string };
export type LoginInput = { email: string; password: string };
export type RegisterInput = LoginInput & { name: string };
export class AuthApiError extends Error {
  constructor(message: string, public status: number, public fieldErrors: Record<string, string> = {}) { super(message); }
}
const baseUrl = (process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8080").replace(/[/]$/, "");

async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  const response = await fetch(`${baseUrl}/api/v1/auth/${path}`, {
    ...options, credentials: "include", cache: "no-store",
  });
  if (!response.ok) {
    const body = await response.json().catch(() => ({}));
    throw new AuthApiError(body.message || "Request failed. Please try again.", response.status, body.fieldErrors);
  }
  return response.status === 204 ? undefined as T : response.json();
}

async function post<T>(path: string, input?: LoginInput | RegisterInput): Promise<T> {
  const csrf = await request<{ token: string; headerName: string }>("csrf");
  return request<T>(path, {
    method: "POST",
    headers: { "Content-Type": "application/json", [csrf.headerName]: csrf.token },
    body: input === undefined ? undefined : JSON.stringify(input),
  });
}

export const authApi = {
  async me(signal?: AbortSignal): Promise<PublicUser | null> {
    try { return await request<PublicUser>("me", { signal }); }
    catch (error) {
      if (error instanceof AuthApiError && error.status === 401) return null;
      throw error;
    }
  },
  login: (input: LoginInput) => post<PublicUser>("login", input),
  register: (input: RegisterInput) => post<PublicUser>("register", input),
  logout: () => post<void>("logout"),
};
