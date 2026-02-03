# Subtask 011-04-03: お気に入り画面テスト

## 概要

お気に入り画面の正常系E2Eテストケースを作成し、お気に入り管理フローを検証する。

## ユーザーストーリー

**ペルソナ**: 開発者
**目的**: お気に入り画面のメインフローが正常に動作することを検証する
**価値**: お気に入り機能のリグレッションを防止できる
**理由**: お気に入りはユーザーの価値保存機能であり、データ損失は致命的

## 受け入れ条件（EARS記法）

- [ ] WHEN お気に入り画面にアクセスする際
      GIVEN お気に入り記事が存在する場合
      THEN お気に入り一覧が表示される

- [ ] WHEN お気に入り一覧を表示する際
      GIVEN 複数のお気に入りがある場合
      THEN 記事タイトルとオブジェクトクラスが表示される

- [ ] WHEN お気に入り記事の詳細を表示する際
      GIVEN 記事をタップした場合
      THEN 記事詳細（WebView）が表示される

- [ ] WHEN お気に入りを削除する際
      GIVEN 削除ボタンをタップした場合
      THEN お気に入りから削除される
      AND 一覧から該当記事が消える

## テストケース

### CSV形式

```csv
id,name,steps,expected,tags,result
TC-006-03-001,お気に入り画面表示,"[{""action"":""goto"",""url"":""/favorites""},{""action"":""waitFor"",""testId"":""favorites-list""},{""action"":""assertVisible"",""testId"":""favorites-list""}]",お気に入り一覧が表示される,critical,
TC-006-03-002,お気に入り記事内容表示,"[{""action"":""goto"",""url"":""/favorites""},{""action"":""waitFor"",""testId"":""favorite-item""},{""action"":""assertVisible"",""testId"":""favorite-item-title""},{""action"":""assertVisible"",""testId"":""favorite-item-class""}]",記事タイトルとオブジェクトクラスが表示される,critical,
TC-006-03-003,お気に入り記事詳細表示,"[{""action"":""goto"",""url"":""/favorites""},{""action"":""waitFor"",""testId"":""favorite-item""},{""action"":""click"",""testId"":""favorite-item""},{""action"":""assertVisible"",""testId"":""article-webview""}]",記事詳細WebViewが表示される,critical,
```

### 必要なdata-testid

| testId              | 要素                   |
| ------------------- | ---------------------- |
| favorites-list      | お気に入り一覧コンテナ |
| favorite-item       | お気に入り記事アイテム |
| favorite-item-title | 記事タイトル           |
| favorite-item-class | オブジェクトクラス     |
| article-webview     | 記事詳細WebView        |
| delete-button       | 削除ボタン             |

## 設計

### ファイル構成

```
apps/web/e2e/
├── testcases/
│   └── favorites.csv
└── specs/
    └── favorites.spec.ts
```

### spec ファイル

```typescript
// apps/web/e2e/specs/favorites.spec.ts

import { test } from "@playwright/test";
import { parseTestCaseCsv } from "../lib/csv-parser";
import { executeSteps } from "../lib/step-executor";

const testCases = parseTestCaseCsv("./testcases/favorites.csv");

test.describe("お気に入り画面", () => {
  for (const tc of testCases) {
    test(tc.name, async ({ page }) => {
      await executeSteps(page, tc.steps);
    });
  }
});
```

## 実装メモ

- テスト前にお気に入りデータを投入するfixtureが必要
- 削除テストは状態変更を伴うため、他テストへの影響に注意
- 空状態（お気に入りなし）のテストは将来対応
