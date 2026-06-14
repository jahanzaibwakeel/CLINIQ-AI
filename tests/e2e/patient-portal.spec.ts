import { expect, test } from "@playwright/test";

test("patient can open portal and send a clinic request", async ({ page }) => {
  await page.goto("/portal");
  await expect(page.getByRole("heading", { name: /View clinic updates/ })).toBeVisible();

  await page.getByRole("button", { name: "Send secure link" }).click();
  await expect(page.getByText("If the details match a portal-enabled patient")).toBeVisible();

  await page.getByRole("button", { name: "Open demo portal" }).click();
  await expect(page.getByRole("heading", { name: "Sara Malik" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Upcoming appointments" })).toBeVisible();

  await page.getByLabel("Subject").fill(`Portal request ${Date.now()}`);
  await page.getByLabel("Message").fill("Please confirm my clinic follow-up appointment time when available.");
  await page.getByRole("button", { name: "Send request" }).click();

  await expect(page.getByText("Request sent to the clinic team.")).toBeVisible();
});
