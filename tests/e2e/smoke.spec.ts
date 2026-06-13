import { expect, test, type Page } from "@playwright/test";

async function login(page: Page, email = "doctor@medipilot.local") {
  await page.goto("/login");
  await page.getByLabel("Email").fill(email);
  await page.getByLabel("Password").fill("DemoPassword123!");
  await page.getByRole("button", { name: "Sign in" }).click();
  await expect(page.getByRole("heading", { name: /dashboard/i })).toBeVisible();
}

test("doctor can reach core clinical workflow pages", async ({ page }) => {
  await login(page);
  await expect(page.getByText("AI-assisted workflow, still doctor-led.")).toBeVisible();

  await page.getByRole("link", { name: "Patients" }).click();
  await expect(page.getByRole("heading", { name: "Patient registry" })).toBeVisible();

  await page.getByRole("link", { name: "Schedule" }).click();
  await expect(page.getByRole("heading", { name: "Appointment board" })).toBeVisible();

  await page.getByRole("link", { name: "Inbox" }).click();
  await expect(page.getByRole("heading", { name: "Inbox signals" })).toBeVisible();

  await page.getByRole("link", { name: "Documents" }).click();
  await expect(page.getByRole("heading", { name: "Upload clinical document" })).toBeVisible();
});

test("patient chart export requires privacy reason before download link activates", async ({ page }) => {
  await login(page);
  await page.getByRole("link", { name: "Patients" }).click();
  await page.getByRole("link", { name: /Sara Malik/ }).click();
  await page.getByRole("button", { name: "Export chart" }).click();
  await expect(page.getByText("Exports are audited.")).toBeVisible();

  const downloadLink = page.getByRole("link", { name: "Download JSON" });
  await expect(downloadLink).toHaveAttribute("href", "#");
  await page.getByLabel("Export reason").fill("Care coordination review");
  await expect(downloadLink).toHaveAttribute("href", /reason=Care\+coordination\+review/);
});

test("admin can open staff security controls", async ({ page }) => {
  await login(page, "admin@medipilot.local");
  await page.getByRole("link", { name: "Staff" }).click();
  await expect(page.getByRole("heading", { name: "Staff directory" })).toBeVisible();
  await expect(page.getByText("Login lockout")).toBeVisible();
  await expect(page.getByRole("button", { name: /Deactivate|Activate/ }).first()).toBeVisible();
});
