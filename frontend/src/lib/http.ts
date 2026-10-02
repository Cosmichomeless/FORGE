export class ApiError extends Error {
  constructor(message: string, public status: number, public fieldErrors: Record<string, string> = {}) { super(message); }
}
/** Readable fallbacks for responses whose body has no `message` (proxies, CSRF rejections, crashes). */
export function statusMessage(status: number): string {
  if (status === 401) return "Your session has expired. Please log in again.";
  if (status === 403) return "You do not have permission to do that.";
  if (status === 404) return "We could not find what you were looking for.";
  if (status === 409) return "That conflicts with the current state. Refresh and try again.";
  if (status === 429) return "Too many requests. Please wait a moment and try again.";
  if (status >= 500) return "Something went wrong on our side. Please try again.";
  return "Request failed. Please try again.";
}
const baseUrl = (process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8080").replace(/[/]$/, "");

async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  const response = await fetch(`${baseUrl}/api/v1/${path}`, {
    ...options, credentials: "include", cache: "no-store",
  });
  if (!response.ok) {
    const body = await response.json().catch(() => ({}));
    throw new ApiError(typeof body.message === "string" && body.message ? body.message : statusMessage(response.status), response.status, body.fieldErrors);
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
