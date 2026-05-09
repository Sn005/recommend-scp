import { expect, type Page } from "@playwright/test";
import type { StepAction } from "./types";

/**
 * StepAction配列を順次実行する
 * @param page Playwrightのページオブジェクト
 * @param steps 実行するステップ配列
 */
export async function executeSteps(page: Page, steps: StepAction[]): Promise<void> {
  for (const step of steps) {
    await executeStep(page, step);
  }
}

async function executeStep(page: Page, step: StepAction): Promise<void> {
  switch (step.action) {
    case "goto":
      await page.goto(step.url);
      break;
    case "click":
      await page.getByTestId(step.testId).filter({ visible: true }).first().click();
      break;
    case "fill":
      await page.getByTestId(step.testId).filter({ visible: true }).first().fill(step.value);
      break;
    case "waitFor":
      await page
        .getByTestId(step.testId)
        .filter({ visible: true })
        .first()
        .waitFor({
          timeout: step.timeout ?? 5000,
        });
      break;
    case "assertVisible":
      await expect(page.getByTestId(step.testId).filter({ visible: true }).first()).toBeVisible();
      break;
    case "assertText":
      await expect(page.getByTestId(step.testId).filter({ visible: true }).first()).toHaveText(
        step.text
      );
      break;
    case "assertUrl":
      await expect(page).toHaveURL(new RegExp(step.pattern));
      break;
    default: {
      const exhaustiveCheck: never = step;
      throw new Error(`Unknown action: ${String(exhaustiveCheck)}`);
    }
  }
}
