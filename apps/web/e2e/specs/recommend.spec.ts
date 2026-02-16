import { test } from "@playwright/test";
import { dirname, join } from "path";
import { fileURLToPath } from "node:url";
import { parseTestCaseCsv } from "../lib/csv-parser";
import { executeSteps } from "../lib/step-executor";

const __dirname = dirname(fileURLToPath(import.meta.url));
const testCases = parseTestCaseCsv(join(__dirname, "../lib/testcases/recommend.csv"));

test.describe("推薦画面", () => {
  for (const tc of testCases) {
    test(`${tc.name} @${tc.tags.join(" @")}`, async ({ page }) => {
      await executeSteps(page, tc.steps);
    });
  }
});
