import { test, expect } from "@playwright/test";

test("トップページにアクセスできる @critical", async ({ page }) => {
  await page.goto("/");
  await expect(page).toHaveTitle(/SCPicks/);
});

test("存在しないページは404を返す", async ({ page }) => {
  const response = await page.goto("/non-existent-page-12345");
  expect(response?.status()).toBe(404);
});
