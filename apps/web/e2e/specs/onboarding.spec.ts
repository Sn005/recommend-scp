import { test } from "@playwright/test";
import { dirname, join } from "path";
import { fileURLToPath } from "node:url";
import { parseTestCaseCsv } from "../lib/csv-parser";
import { executeSteps } from "../lib/step-executor";
import { setupOnboardingTest } from "../lib/setup";

const __dirname = dirname(fileURLToPath(import.meta.url));
const testCases = parseTestCaseCsv(join(__dirname, "../lib/testcases/onboarding.csv"));

test.describe("オンボーディング画面", () => {
  test.beforeEach(async ({ page }) => {
    await setupOnboardingTest(page);
  });

  for (const tc of testCases) {
    test(`${tc.name} @${tc.tags.join(" @")}`, async ({ page }) => {
      await executeSteps(page, tc.steps);
    });
  }
});
