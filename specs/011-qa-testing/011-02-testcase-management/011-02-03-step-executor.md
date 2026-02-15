# Subtask 011-02-03: ステップ実行エンジン実装

## 概要

StepAction配列をPlaywright操作に変換し、順次実行するエンジンを実装する。

## ユーザーストーリー

**ペルソナ**: 開発者
**目的**: CSVのsteps列をPlaywrightで実行する
**価値**: テストロジックをコードから分離できる
**理由**: テストケース追加時にコード変更が不要になる

## 受け入れ条件（EARS記法）

- [x] WHEN `goto` アクションを実行する際
      GIVEN 有効なURLが指定されている場合
      THEN `page.goto(url)` が実行される

- [x] WHEN `click` アクションを実行する際
      GIVEN testIdが指定されている場合
      THEN `page.getByTestId(testId).click()` が実行される

- [x] WHEN `fill` アクションを実行する際
      GIVEN testIdとvalueが指定されている場合
      THEN `page.getByTestId(testId).fill(value)` が実行される

- [x] WHEN `waitFor` アクションを実行する際
      GIVEN testIdが指定されている場合
      THEN `page.getByTestId(testId).waitFor()` が実行される

- [x] WHEN `assertVisible` アクションを実行する際
      GIVEN testIdが指定されている場合
      THEN `expect(page.getByTestId(testId)).toBeVisible()` が実行される

- [x] WHEN `assertText` アクションを実行する際
      GIVEN testIdとtextが指定されている場合
      THEN `expect(page.getByTestId(testId)).toHaveText(text)` が実行される

- [x] WHEN `assertUrl` アクションを実行する際
      GIVEN patternが指定されている場合
      THEN `expect(page).toHaveURL(pattern)` が実行される

## 設計

### ファイル構成

```
apps/web/e2e/lib/
├── step-executor.ts   # 本Subtaskで実装
├── csv-parser.ts      # 011-02-02で実装済み
└── types.ts           # 011-02-01で定義済み
```

### インターフェース

```typescript
// apps/web/e2e/lib/step-executor.ts

import type { Page } from "@playwright/test";
import type { StepAction } from "./types";

/**
 * StepAction配列を順次実行する
 * @param page Playwrightのページオブジェクト
 * @param steps 実行するステップ配列
 */
export async function executeSteps(page: Page, steps: StepAction[]): Promise<void>;
```

### 実装方針

```typescript
import { expect, type Page } from "@playwright/test";
import type { StepAction } from "./types";

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
      await page.getByTestId(step.testId).click();
      break;
    case "fill":
      await page.getByTestId(step.testId).fill(step.value);
      break;
    case "waitFor":
      await page.getByTestId(step.testId).waitFor({
        timeout: step.timeout ?? 5000,
      });
      break;
    case "assertVisible":
      await expect(page.getByTestId(step.testId)).toBeVisible();
      break;
    case "assertText":
      await expect(page.getByTestId(step.testId)).toHaveText(step.text);
      break;
    case "assertUrl":
      await expect(page).toHaveURL(new RegExp(step.pattern));
      break;
    default:
      throw new Error(`Unknown action: ${(step as StepAction).action}`);
  }
}
```

### 使用例（specファイル）

```typescript
// apps/web/e2e/specs/onboarding.spec.ts

import { test } from "@playwright/test";
import { parseTestCaseCsv } from "../lib/csv-parser";
import { executeSteps } from "../lib/step-executor";

const testCases = parseTestCaseCsv("./testcases/onboarding.csv");

for (const tc of testCases) {
  test(tc.name, async ({ page }) => {
    await executeSteps(page, tc.steps);
  });
}
```

## テストケース

- [x] gotoアクションでページ遷移する
- [x] clickアクションでdata-testid要素をクリックする
- [x] fillアクションでテキスト入力する
- [x] waitForアクションで要素の表示を待つ
- [x] assertVisibleアクションで要素の可視性を検証する
- [x] assertTextアクションでテキストを検証する
- [x] assertUrlアクションでURLを検証する
- [x] 不明なアクションでエラーがスローされる

## 実装状況

- **status**: completed

## 実装メモ

- 全アクションは `getByTestId` を使用（data-testid戦略）
- タイムアウトはデフォルト5秒（waitFor）
- assertUrlはRegExp対応（部分一致可能）
- 将来拡張: `hover`, `scroll`, `screenshot` など
