import { expect, test } from "@playwright/test";
import { login } from "./helpers";

test("doctor sees AI drafts as readable clinical sections instead of raw JSON", async ({ page }) => {
  await login(page);

  await page.getByRole("button", { name: "Generate Summary" }).click();

  const output = page.locator(".ai-output").first();
  await expect(output).toBeVisible();
  await expect(output.getByRole("heading", { name: "Summary" })).toBeVisible();
  await expect(output).toContainText("AI draft, doctor review required.");
  await expect(output).not.toContainText("AI service is unavailable");
  await expect(output).not.toContainText('"summary"');
  await expect(output).not.toContainText('"metadata"');
});

test("AI review queue shows readable drafts and keeps JSON editor for controlled approval", async ({ page }) => {
  await login(page);
  await page.getByRole("link", { name: "AI Review" }).click();

  await expect(page.getByRole("heading", { name: "AI draft review queue" })).toBeVisible();
  await expect(page.getByText("Editable reviewed output JSON").first()).toBeVisible();

  const readableDraft = page.locator(".ai-output").first();
  await expect(readableDraft).toBeVisible();
  await expect(readableDraft).toContainText("AI draft, doctor review required.");
});
