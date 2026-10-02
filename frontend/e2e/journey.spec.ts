import { expect, test } from "@playwright/test";

// Core MVP journey: register → organization → project → issue → assignment → comment → status.
test("a new user can run the whole core journey", async ({ page }) => {
  const unique = Date.now().toString(36);
  const email = `ada-${unique}@example.com`;

  await page.goto("/register");
  await page.getByLabel("Name").fill("Ada Lovelace");
  await page.getByLabel("Email").fill(email);
  await page.getByLabel("Password").fill("correct-horse-battery");
  await page.getByRole("button", { name: "Create account" }).click();

  await expect(page).toHaveURL(/\/login$/);
  await page.getByLabel("Email").fill(email);
  await page.getByLabel("Password").fill("correct-horse-battery");
  await page.getByRole("button", { name: "Log in" }).click();
  await expect(page).toHaveURL(/\/dashboard$/);

  await page.goto("/organizations");
  await page.getByLabel("Name").fill(`Acme ${unique}`);
  await page.getByLabel("Slug").fill(`acme-${unique}`);
  await page.getByRole("button", { name: "Create organization" }).click();
  await expect(page).toHaveURL(/\/organizations\/[0-9a-f-]+$/);

  await page.getByRole("button", { name: "New project" }).click();
  const projectForm = page.getByRole("form", { name: "New project" });
  await projectForm.getByLabel("Name").fill("Forge Core");
  await projectForm.getByLabel("Key").fill("CORE");
  await projectForm.getByRole("button", { name: "Create project" }).click();
  await page.getByRole("link", { name: "Forge Core" }).click();
  await expect(page).toHaveURL(/\/projects\/[0-9a-f-]+$/);

  await page.getByRole("button", { name: "New issue" }).click();
  const issueForm = page.getByRole("form", { name: "New issue" });
  await issueForm.getByLabel("Title").fill("Ship the login page");
  await issueForm.getByRole("button", { name: "Create issue" }).click();
  await page.getByRole("link", { name: "Ship the login page" }).click();
  await expect(page.getByRole("heading", { level: 1, name: "Ship the login page" })).toBeVisible();

  await page.getByLabel("Assignee").selectOption({ label: "Ada Lovelace" });
  await expect(page.getByLabel("Assignee")).toHaveValue(/.+/);

  await page.getByRole("textbox").last().fill("First comment from the e2e run");
  await page.getByRole("button", { name: "Comment", exact: true }).click();
  await expect(page.getByText("First comment from the e2e run")).toBeVisible();

  await page.getByLabel("Status").selectOption({ label: "Done" });
  await expect(page.getByLabel("Status")).toHaveValue("DONE");

  await page.reload();
  await expect(page.getByLabel("Status")).toHaveValue("DONE");
  await expect(page.getByText("First comment from the e2e run")).toBeVisible();
});
