export class ApiError extends Error {
  constructor(message: string, public status: number, public fieldErrors: Record<string, string> = {}) { super(message); }
}
const baseUrl = (process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8080").replace(/[/]$/, "");

async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  const response = await fetch(`${baseUrl}/api/v1/${path}`, {
    ...options, credentials: "include", cache: "no-store",
  });
  if (!response.ok) {
    const body = await response.json().catch(() => ({}));
    throw new ApiError(body.message || "Request failed. Please try again.", response.status, body.fieldErrors);
  }
  return response.status === 204 ? undefined as T : response.json();
}

export function apiGet<T>(path: string, signal?: AbortSignal): Promise<T> {
  return request<T>(path, { signal });
}

/** Every unsafe call first fetches a fresh CSRF token for the current session. */
export async function apiSend<T>(method: "POST" | "PUT" | "DELETE", path: string, input?: unknown): Promise<T> {
  const csrf = await request<{ token: string; headerName: string }>("auth/csrf");
  return request<T>(path, {
    method,
    headers: { "Content-Type": "application/json", [csrf.headerName]: csrf.token },
    body: input === undefined ? undefined : JSON.stringify(input),
  });
}
