import { expect, type BrowserContext, type Page } from "@playwright/test";
import { mkdir, readFile } from "fs/promises";
import path from "path";

const authDir = path.join(process.cwd(), "tests", "e2e", ".auth");

function authFile(email: string) {
  return path.join(authDir, `${email.replace(/[^a-z0-9]/gi, "_").toLowerCase()}.json`);
}

async function restoreSession(page: Page, email: string) {
  try {
    const storageState = JSON.parse(await readFile(authFile(email), "utf8")) as {
      cookies?: Parameters<BrowserContext["addCookies"]>[0];
    };
    if (!storageState.cookies?.length) return false;
    await page.context().addCookies(storageState.cookies);
    await page.goto("/");
    await expect(page.getByRole("heading", { name: /dashboard/i })).toBeVisible({ timeout: 3000 });
    return true;
  } catch {
    await page.context().clearCookies();
    return false;
  }
}

export async function login(page: Page, email = "doctor@clinik.local") {
  if (await restoreSession(page, email)) return;

  await page.goto("/login");
  await page.getByLabel("Email").fill(email);
  await page.locator('input[type="password"]').fill("DemoPassword123!");
  await page.getByRole("button", { name: "Sign in" }).click();
  await expect(page.getByRole("heading", { name: /dashboard/i })).toBeVisible();
  await mkdir(authDir, { recursive: true });
  await page.context().storageState({ path: authFile(email) });
}

export function uniqueId(prefix: string) {
  return `${prefix}-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}
