import { test } from "@playwright/test";
import { join } from "path";
import { parseTestCaseCsv } from "../lib/csv-parser";
import { executeSteps } from "../lib/step-executor";

const testCases = parseTestCaseCsv(join(__dirname, "../lib/testcases/history.csv"));

test.describe("閲覧履歴画面", () => {
  for (const tc of testCases) {
    test(`${tc.name} @${tc.tags.join(" @")}`, async ({ page }) => {
      await executeSteps(page, tc.steps);
    });
  }
});
