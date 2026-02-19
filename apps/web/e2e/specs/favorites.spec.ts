import { test } from "@playwright/test";
import { dirname, join } from "path";
import { fileURLToPath } from "node:url";
import { parseTestCaseCsv } from "../lib/csv-parser";
import { executeSteps } from "../lib/step-executor";
import { setupFavoritesTest } from "../lib/setup";

const __dirname = dirname(fileURLToPath(import.meta.url));
const testCases = parseTestCaseCsv(join(__dirname, "../lib/testcases/favorites.csv"));

test.describe("お気に入り画面", () => {
  test.beforeEach(async ({ page }) => {
    await setupFavoritesTest(page);
  });

  for (const tc of testCases) {
    test(`${tc.name} @${tc.tags.join(" @")}`, async ({ page }) => {
      await executeSteps(page, tc.steps);
    });
  }
});
