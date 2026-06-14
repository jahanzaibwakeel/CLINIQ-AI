import { expect, test } from "@playwright/test";
import { login, uniqueId } from "./helpers";

test("doctor uploads extracted report text and sees parsed value review", async ({ page }) => {
  await login(page);
  await page.getByRole("link", { name: "Documents" }).click();

  await expect(page.getByRole("heading", { name: "Parsed value review" })).toBeVisible();

  const fileName = `${uniqueId("lab-report")}.txt`;
  await page.getByLabel("File name").fill(fileName);
  await page.getByLabel("Extracted text preview").fill(
    "Lab report: HbA1c 8.4 % and glucose 190 mg/dL. Patient missed eye exam follow up."
  );
  await page.getByRole("button", { name: "Upload and process" }).click();

  const uploadedReport = page.locator("article").filter({ has: page.getByRole("heading", { name: fileName }) });
  await expect(uploadedReport).toBeVisible({ timeout: 20_000 });
  await expect(page.getByRole("heading", { name: "Parsed value review" })).toBeVisible();
  await expect(uploadedReport.getByText("HbA1c").or(uploadedReport.getByText("Glucose")).first()).toBeVisible();
  await expect(uploadedReport.getByText(/reviewed parse|ai draft parse|text scan|needs review/i).first()).toBeVisible();
});
