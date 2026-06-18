import { expect, test } from "@playwright/test";

test("patient can open portal and send a clinic request", async ({ page }) => {
  await page.goto("/portal");
  await expect(page.getByRole("heading", { name: /View clinic updates/ })).toBeVisible();
  await page.waitForFunction(() => document.cookie.includes("medipilot_csrf="));

  await page.getByRole("button", { name: "Open demo portal" }).click();
  await expect(page.getByRole("heading", { name: "Sara Malik" })).toBeVisible({ timeout: 20_000 });
  await expect(page.getByRole("heading", { name: "Upcoming appointments" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Request history" })).toBeVisible();

  const subject = `Portal request ${Date.now()}`;
  await page.getByLabel("Subject").fill(subject);
  await page.getByLabel("Message").fill("Please confirm my clinic follow-up appointment time when available.");
  await page.getByRole("button", { name: "Send request" }).click();

  await expect(page.getByText("Request sent to the clinic team.")).toBeVisible();
  await expect(page.getByText(subject)).toBeVisible();
  await expect(page.getByText("Use a secure portal link to reply to this request.").first()).toBeVisible();
});
