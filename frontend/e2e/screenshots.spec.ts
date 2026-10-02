import { expect, test } from "@playwright/test";

// Regenerates docs/screenshots against a running stack: SCREENSHOTS=1 E2E_BASE_URL=... npx playwright test screenshots
test.skip(!process.env.SCREENSHOTS, "only runs when SCREENSHOTS=1");

const out = "../docs/screenshots";

test("capture the main screens", async ({ page }) => {
  const unique = Date.now().toString(36);
  const email = `ada-${unique}@example.com`;
  await page.setViewportSize({ width: 1280, height: 800 });

  await page.goto("/login");
  await page.screenshot({ path: `${out}/01-login.png` });

  await page.goto("/register");
  await page.getByLabel("Name").fill("Ada Lovelace");
  await page.getByLabel("Email").fill(email);
  await page.getByLabel("Password").fill("correct-horse-battery");
  await page.getByRole("button", { name: "Create account" }).click();
  await page.getByLabel("Email").fill(email);
  await page.getByLabel("Password").fill("correct-horse-battery");
  await page.getByRole("button", { name: "Log in" }).click();
  await expect(page).toHaveURL(/\/dashboard$/);

  await page.goto("/organizations");
  await page.getByLabel("Name").fill("Acme Labs");
  await page.getByLabel("Slug").fill(`acme-${unique}`);
  await page.getByRole("button", { name: "Create organization" }).click();
  await expect(page).toHaveURL(/\/organizations\/[0-9a-f-]+$/);

  await page.getByRole("button", { name: "New project" }).click();
  const projectForm = page.getByRole("form", { name: "New project" });
  await projectForm.getByLabel("Name").fill("Forge Core");
  await projectForm.getByLabel("Key").fill("CORE");
  await projectForm.getByRole("button", { name: "Create project" }).click();
  await expect(page.getByRole("link", { name: "Forge Core" })).toBeVisible();
  await page.screenshot({ path: `${out}/02-organization.png`, fullPage: true });

  await page.getByRole("link", { name: "Forge Core" }).click();
  for (const title of ["Ship the login page", "Add issue filters", "Fix flaky export test"]) {
    await page.getByRole("button", { name: "New issue" }).click();
    const form = page.getByRole("form", { name: "New issue" });
    await form.getByLabel("Title").fill(title);
    await form.getByRole("button", { name: "Create issue" }).click();
    await expect(page.getByRole("link", { name: title })).toBeVisible();
  }
  await page.screenshot({ path: `${out}/03-project-issues.png`, fullPage: true });

  await page.getByRole("link", { name: "Ship the login page" }).click();
  await expect(page.getByRole("heading", { level: 1, name: "Ship the login page" })).toBeVisible();
  await page.getByLabel("Assignee").selectOption({ label: "Ada Lovelace" });
  await page.getByLabel("Priority").selectOption({ label: "High" });
  await expect(page.getByLabel("Priority")).toHaveValue("HIGH");
  await page.waitForLoadState("networkidle");
  await page.getByRole("textbox").last().fill("Form validation is done, waiting for review.");
  await page.getByRole("button", { name: "Comment", exact: true }).click();
  await expect(page.getByText("Form validation is done")).toBeVisible();
  await page.screenshot({ path: `${out}/04-issue-detail.png`, fullPage: true });

  await page.goto("/dashboard");
  await page.screenshot({ path: `${out}/05-dashboard.png`, fullPage: true });
});
