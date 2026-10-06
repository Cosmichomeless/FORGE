import { expect, test, type APIRequestContext, type Page } from "@playwright/test";

// Regenerates docs/screenshots against a running stack:
//   SCREENSHOTS=1 E2E_BASE_URL=http://localhost:3000 npx playwright test screenshots
// The data is seeded through the public API (E2E_API_URL, default http://localhost:8080) so every capture shows a realistic workspace.
test.skip(!process.env.SCREENSHOTS, "only runs when SCREENSHOTS=1");
test.use({ viewport: { width: 1440, height: 900 }, deviceScaleFactor: 2 });

const out = "../docs/screenshots";
const apiUrl = (process.env.E2E_API_URL ?? "http://localhost:8080").replace(/[/]$/, "");
const password = "correct-horse-battery";

type Json = Record<string, string>;

/** Every unsafe call needs a fresh CSRF token for the current session, exactly like the frontend does. */
async function call<T = Json>(ctx: APIRequestContext, method: "POST" | "PUT", path: string, data?: unknown): Promise<T> {
  const csrf = await (await ctx.get(`${apiUrl}/api/v1/auth/csrf`)).json();
  const response = await ctx.fetch(`${apiUrl}/api/v1/${path}`, { method, data, headers: { [csrf.headerName]: csrf.token } });
  expect(response.ok(), `${method} ${path} -> ${response.status()} ${await response.text()}`).toBeTruthy();
  return response.status() === 204 ? (undefined as T) : response.json();
}

async function signUp(ctx: APIRequestContext, name: string, email: string) {
  await call(ctx, "POST", "auth/register", { name, email, password });
  await call(ctx, "POST", "auth/login", { email, password });
}

/** Resolves once no skeleton or "Loading…" text is left on the page. */
async function settled(page: Page) {
  await page.waitForLoadState("networkidle");
  await expect(page.getByText(/Loading/)).toHaveCount(0);
  await page.evaluate(() => document.fonts.ready);
}

/** Full-height capture: grows the viewport to the document height so fixed elements (the sidebar) are not cut at the fold. */
async function fullPage(page: Page, path: string) {
  const original = page.viewportSize()!;
  const height = await page.evaluate(() => document.documentElement.scrollHeight);
  await page.setViewportSize({ width: original.width, height: Math.max(original.height, height) });
  await settled(page);
  await page.screenshot({ path });
  await page.setViewportSize(original);
}

test("capture the main screens", async ({ page, playwright }) => {
  test.setTimeout(180_000);
  const unique = Date.now().toString(36);
  const adaEmail = `ada.lovelace-${unique}@example.com`;
  const graceEmail = `grace.hopper-${unique}@example.com`;

  await page.goto("/login");
  await settled(page);
  await page.screenshot({ path: `${out}/01-login.png` });

  // --- Seed: two users, one organization, three projects, a dozen issues with comments and activity.
  const ada = page.request; // shares cookies with the page, so the browser is logged in as Ada afterwards
  const graceCtx = await playwright.request.newContext();
  await signUp(ada, "Ada Lovelace", adaEmail);
  await signUp(graceCtx, "Grace Hopper", graceEmail);

  const org = await call(ada, "POST", "organizations", { name: "Northwind Labs", slug: `northwind-${unique}` });
  const invitation = await call(ada, "POST", `organizations/${org.id}/invitations`, { email: graceEmail, role: "ADMIN" });
  await call(graceCtx, "POST", "invitations/accept", { token: invitation.token });
  await call(ada, "POST", `organizations/${org.id}/invitations`, { email: "linus.torvalds@example.com", role: "MEMBER" });
  const members: Json[] = await (await ada.get(`${apiUrl}/api/v1/organizations/${org.id}/members`)).json();
  const adaId = members.find(m => m.email === adaEmail)!.userId;
  const graceId = members.find(m => m.email === graceEmail)!.userId;

  const project = (key: string, name: string, description: string) => call(ada, "POST", `organizations/${org.id}/projects`, { key, name, description });
  const core = await project("CORE", "Platform Core", "Authentication, billing and the shared services every product builds on.");
  const web = await project("WEB", "Marketing Site", "Public website, docs and onboarding flows.");
  const api = await project("API", "Public API", "Versioned REST API and developer tooling.");

  type Seed = { title: string; description?: string; priority: string; status?: string; assignee?: string };
  const issuesOf = async (p: Json, seeds: Seed[]) => {
    const created: Json[] = [];
    for (const seed of seeds) {
      const base = `organizations/${org.id}/projects/${p.id}/issues`;
      const issue = await call(ada, "POST", base, { title: seed.title, description: seed.description, priority: seed.priority, assigneeId: seed.assignee });
      if (seed.status && seed.status !== "TODO") await call(seed.assignee === graceId ? graceCtx : ada, "PUT", `${base}/${issue.number}/status`, { status: seed.status });
      created.push({ ...issue, base });
    }
    return created;
  };

  const coreIssues = await issuesOf(core, [
    { title: "Add SSO login with Google and GitHub", description: "Let teams sign in with their identity provider.\n\n- Google Workspace\n- GitHub organizations\n- Fall back to password login for invited guests", priority: "HIGH", status: "IN_PROGRESS", assignee: adaId },
    { title: "Rate-limit the password reset endpoint", description: "The reset endpoint can currently be hit without limits. Add a per-IP and per-account limit and return 429 with a Retry-After header.", priority: "URGENT", status: "IN_PROGRESS", assignee: graceId },
    { title: "Invoices show the wrong currency for EU customers", priority: "HIGH", assignee: graceId },
    { title: "Migrate session storage to Redis", priority: "MEDIUM", status: "DONE", assignee: adaId },
    { title: "Write the incident runbook for database failover", priority: "MEDIUM", assignee: adaId },
    { title: "Upgrade Java runtime to the latest LTS", priority: "LOW", status: "DONE", assignee: graceId },
    { title: "Audit log is missing role changes", priority: "HIGH", status: "IN_PROGRESS" },
    { title: "Add health checks to the deployment pipeline", priority: "MEDIUM", status: "DONE", assignee: adaId },
    { title: "Email verification links expire too early", priority: "LOW" },
    { title: "Document the permission model for new contributors", priority: "LOW", assignee: graceId },
    { title: "Cache organization settings per request", priority: "MEDIUM" },
  ]);
  await issuesOf(web, [
    { title: "Redesign the pricing page", priority: "HIGH", status: "IN_PROGRESS", assignee: adaId },
    { title: "Add a changelog section to the docs", priority: "LOW", assignee: graceId },
    { title: "Fix broken anchor links in the getting started guide", priority: "MEDIUM", status: "DONE" },
    { title: "Improve Lighthouse performance score on mobile", priority: "MEDIUM", assignee: adaId },
  ]);
  await issuesOf(api, [
    { title: "Publish the OpenAPI spec for v1", priority: "HIGH", status: "IN_PROGRESS", assignee: graceId },
    { title: "Return consistent error bodies for validation failures", priority: "MEDIUM", assignee: adaId },
    { title: "Add cursor pagination to the issues endpoint", priority: "MEDIUM" },
  ]);

  // The showcase issue gets a conversation and a visible history of changes.
  const sso = coreIssues[0];
  const thread = `${sso.base}/${sso.number}`;
  await call(graceCtx, "POST", `${thread}/comments`, { body: "I can pick up the GitHub side once the Google flow lands. Do we want to support personal accounts or only organizations?" });
  await call(ada, "POST", `${thread}/comments`, { body: "Organizations only for now. Google is wired up locally and the callback is working; I am adding tests before opening the PR." });
  await call(graceCtx, "POST", `${thread}/comments`, { body: "Sounds good. I will review the PR as soon as it is up." });
  await call(ada, "PUT", `${thread}/priority`, { priority: "URGENT" });
  await call(ada, "PUT", `${thread}/priority`, { priority: "HIGH" });
  await call(ada, "PUT", `${thread}/assignee`, { assigneeId: graceId });
  await call(graceCtx, "PUT", `${thread}/assignee`, { assigneeId: adaId });
  const rateLimit = coreIssues[1];
  await call(ada, "POST", `${rateLimit.base}/${rateLimit.number}/comments`, { body: "Bucket4j with a Redis backend looks like the right fit." });
  await graceCtx.dispose();

  // --- Captures with the browser logged in as Ada.
  await page.goto("/dashboard");
  await expect(page.getByText("Add SSO login with Google and GitHub").first()).toBeVisible();
  await settled(page);
  await page.screenshot({ path: `${out}/02-dashboard.png` });

  await page.goto(`/organizations/${org.id}`);
  await expect(page.getByRole("link", { name: "Platform Core" })).toBeVisible();
  await expect(page.getByText("Grace Hopper").first()).toBeVisible();
  await settled(page);
  await fullPage(page, `${out}/03-organization.png`);

  await page.getByRole("link", { name: "Platform Core" }).click();
  await expect(page.getByRole("link", { name: "Add SSO login with Google and GitHub" })).toBeVisible();
  await settled(page);
  await fullPage(page, `${out}/04-project-issues.png`);

  await page.getByRole("link", { name: "Add SSO login with Google and GitHub" }).click();
  await expect(page.getByRole("heading", { level: 1, name: "Add SSO login with Google and GitHub" })).toBeVisible();
  await expect(page.getByText("I will review the PR as soon as it is up.")).toBeVisible();
  await expect(page.getByText(/assigned this issue to/).first()).toBeVisible();
  await settled(page);
  await fullPage(page, `${out}/05-issue-detail.png`);

  // Mobile list: ~390 px wide, first screen only.
  await page.goBack();
  await expect(page.getByRole("link", { name: "Cache organization settings per request" })).toBeVisible();
  await page.setViewportSize({ width: 390, height: 844 });
  await settled(page);
  await page.screenshot({ path: `${out}/06-mobile-issues.png` });
});
