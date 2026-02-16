# Subtask 011-04-04: 閲覧履歴画面テスト

## 概要

閲覧履歴画面の正常系E2Eテストケースを作成し、履歴表示・詳細遷移フローを検証する。

## ユーザーストーリー

**ペルソナ**: 開発者
**目的**: 閲覧履歴画面のメインフローが正常に動作することを検証する
**価値**: 閲覧履歴機能のリグレッションを防止できる
**理由**: 閲覧履歴はユーザーの過去の閲覧記録を保持する機能であり、データ表示の正確性が重要

## 受け入れ条件（EARS記法）

- [x] WHEN 閲覧履歴画面にアクセスする際
      GIVEN 閲覧履歴が存在する場合
      THEN 履歴一覧が表示される

- [x] WHEN 履歴カードを表示する際
      GIVEN 複数の履歴がある場合
      THEN SCP番号・タイトル・抜粋・オブジェクトクラスが表示される

- [x] WHEN 履歴記事の詳細を表示する際
      GIVEN 履歴カードをタップした場合
      THEN 記事詳細画面に遷移する

## テストケース

### CSV形式

```csv
id,name,steps,expected,tags,result
TC-006-04-001,閲覧履歴一覧表示,"[{""action"":""goto"",""url"":""/history""},{""action"":""waitFor"",""testId"":""history-card"",""timeout"":3000},{""action"":""assertVisible"",""testId"":""history-card""}]",閲覧履歴一覧が表示される,critical,
TC-006-04-002,履歴カード情報表示,"[{""action"":""goto"",""url"":""/history""},{""action"":""waitFor"",""testId"":""history-card"",""timeout"":3000},{""action"":""assertVisible"",""testId"":""history-card""},{""action"":""assertVisible"",""testId"":""excerpt""}]",SCP番号・タイトル・抜粋・オブジェクトクラスが表示される,critical,
TC-006-04-003,履歴カードから記事詳細遷移,"[{""action"":""goto"",""url"":""/history""},{""action"":""waitFor"",""testId"":""history-card"",""timeout"":3000},{""action"":""click"",""testId"":""history-card""},{""action"":""assertUrl"",""pattern"":""/article/""}]",記事詳細画面に遷移する,critical,
```

### 必要なdata-testid

| testId       | 要素             | 実装状況 |
| ------------ | ---------------- | -------- |
| history-card | 履歴カードリンク | 実装済み |
| excerpt      | 抜粋テキスト     | 実装済み |

## 設計

### ファイル構成

```
apps/web/e2e/
├── lib/
│   ├── testcases/
│   │   └── history.csv
│   └── __dev__/
│       └── history-csv.test.ts
└── specs/
    └── history.spec.ts
```

### spec ファイル

```typescript
// apps/web/e2e/specs/history.spec.ts

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
```

## 実装メモ

- テストケースはユニットテストスイート（useHistory.test.ts, HistoryCard.test.tsx, historyStorage.test.ts）から導出
- data-testid（history-card, excerpt）は既にHistoryCardコンポーネントに実装済み
- 閲覧履歴はlocalStorageベースのため、テスト前にデータ投入が必要
- 空状態（履歴なし）のテストは将来対応

## 実装状況

- **status**: completed
