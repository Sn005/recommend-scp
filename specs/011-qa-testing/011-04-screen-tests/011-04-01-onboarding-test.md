# Subtask 011-04-01: オンボーディング画面テスト

## 概要

オンボーディング画面の正常系E2Eテストケースを作成し、初回ユーザーフローを検証する。

## ユーザーストーリー

**ペルソナ**: 開発者
**目的**: オンボーディングフローが正常に動作することを検証する
**価値**: 初回ユーザー体験のリグレッションを防止できる
**理由**: オンボーディングは最初のタッチポイントであり、離脱率に直結する

## 受け入れ条件（EARS記法）

- [ ] WHEN オンボーディングページにアクセスする際
      GIVEN 初回ユーザーの場合
      THEN オンボーディング画面が表示される
      AND ジャンル選択UIが表示される

- [ ] WHEN ジャンルパックを選択する際
      GIVEN 「ホラー」パックをクリックした場合
      THEN パックが選択状態になる
      AND 次へボタンが活性化する

- [ ] WHEN オンボーディングを完了する際
      GIVEN 必要なジャンルを選択した場合
      THEN 推薦画面に遷移する
      AND ユーザー設定が保存される

## テストケース

### CSV形式

```csv
id,name,steps,expected,tags,result
TC-006-01-001,オンボーディング画面表示,"[{""action"":""goto"",""url"":""/onboarding""},{""action"":""assertVisible"",""testId"":""onboarding-title""},{""action"":""assertVisible"",""testId"":""pack-selector""}]",オンボーディング画面とジャンル選択UIが表示される,critical,
TC-006-01-002,ジャンルパック選択,"[{""action"":""goto"",""url"":""/onboarding""},{""action"":""click"",""testId"":""pack-horror""},{""action"":""assertVisible"",""testId"":""pack-horror-selected""}]",ホラーパックが選択状態になる,critical,
TC-006-01-003,オンボーディング完了フロー,"[{""action"":""goto"",""url"":""/onboarding""},{""action"":""click"",""testId"":""pack-horror""},{""action"":""click"",""testId"":""complete-button""},{""action"":""assertUrl"",""pattern"":""/recommend""}]",推薦画面に遷移する,critical,
```

### 必要なdata-testid

| testId               | 要素                     |
| -------------------- | ------------------------ |
| onboarding-title     | オンボーディングタイトル |
| pack-selector        | ジャンル選択コンテナ     |
| pack-horror          | ホラーパック             |
| pack-horror-selected | ホラーパック（選択状態） |
| complete-button      | 完了ボタン               |

## 設計

### ファイル構成

```
apps/web/e2e/
├── testcases/
│   └── onboarding.csv
└── specs/
    └── onboarding.spec.ts
```

### spec ファイル

```typescript
// apps/web/e2e/specs/onboarding.spec.ts

import { test } from "@playwright/test";
import { parseTestCaseCsv } from "../lib/csv-parser";
import { executeSteps } from "../lib/step-executor";

const testCases = parseTestCaseCsv("./testcases/onboarding.csv");

test.describe("オンボーディング画面", () => {
  for (const tc of testCases) {
    test(tc.name, async ({ page }) => {
      await executeSteps(page, tc.steps);
    });
  }
});
```

## 実装メモ

- 既存コンポーネントにdata-testidを追加する必要あり
- 選択状態の検出: `[data-testid="pack-horror"][data-selected="true"]` など
- LocalStorageのクリアが必要な場合はfixture追加
