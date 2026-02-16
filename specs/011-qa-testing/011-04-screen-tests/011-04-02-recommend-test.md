# Subtask 011-04-02: 推薦画面テスト

## 概要

推薦画面の正常系E2Eテストケースを作成し、記事推薦フローを検証する。

## ユーザーストーリー

**ペルソナ**: 開発者
**目的**: 推薦画面のメインフローが正常に動作することを検証する
**価値**: コア機能のリグレッションを防止できる
**理由**: 推薦画面はアプリの中心機能であり、品質が最重要

## 受け入れ条件（EARS記法）

- [x] WHEN 推薦画面にアクセスする際
      GIVEN オンボーディング完了済みの場合
      THEN 推薦記事カードが表示される

- [x] WHEN 記事カードを表示する際
      GIVEN 推薦記事が存在する場合
      THEN 記事タイトルが表示される
      AND オブジェクトクラスバッジが表示される

- [x] WHEN 記事の詳細を表示する際
      GIVEN 記事カードをタップした場合
      THEN 記事詳細（WebView）が表示される

- [x] WHEN 記事をお気に入りに追加する際
      GIVEN お気に入りボタンをタップした場合
      THEN お気に入りに追加される
      AND favorited状態になる

## テストケース

### CSV形式

```csv
id,name,steps,expected,tags,result
TC-006-02-001,推薦画面表示,"[{""action"":""goto"",""url"":""/recommend""},{""action"":""waitFor"",""testId"":""article-card""},{""action"":""assertVisible"",""testId"":""article-card""}]",推薦記事カードが表示される,critical,
TC-006-02-002,記事カード内容表示,"[{""action"":""goto"",""url"":""/recommend""},{""action"":""waitFor"",""testId"":""article-card""},{""action"":""assertVisible"",""testId"":""article-title""},{""action"":""assertVisible"",""testId"":""object-class-badge""}]",記事タイトルとオブジェクトクラスバッジが表示される,critical,
TC-006-02-003,記事詳細表示,"[{""action"":""goto"",""url"":""/recommend""},{""action"":""waitFor"",""testId"":""article-card""},{""action"":""click"",""testId"":""article-card""},{""action"":""assertVisible"",""testId"":""article-webview""}]",記事詳細WebViewが表示される,critical,
TC-006-02-004,お気に入り追加,"[{""action"":""goto"",""url"":""/recommend""},{""action"":""waitFor"",""testId"":""article-card""},{""action"":""click"",""testId"":""favorite-button""},{""action"":""assertVisible"",""testId"":""toast-success""}]",お気に入りに追加されトーストが表示される,critical,
```

### 必要なdata-testid

| testId             | 要素                     |
| ------------------ | ------------------------ |
| article-card       | 記事カード               |
| article-title      | 記事タイトル             |
| object-class-badge | オブジェクトクラスバッジ |
| article-webview    | 記事詳細WebView          |
| favorite-button    | お気に入りボタン         |
| toast-success      | 成功トースト             |

## 設計

### ファイル構成

```
apps/web/e2e/
├── testcases/
│   └── recommend.csv
└── specs/
    └── recommend.spec.ts
```

### spec ファイル

```typescript
// apps/web/e2e/specs/recommend.spec.ts

import { test } from "@playwright/test";
import { parseTestCaseCsv } from "../lib/csv-parser";
import { executeSteps } from "../lib/step-executor";

const testCases = parseTestCaseCsv("./testcases/recommend.csv");

test.describe("推薦画面", () => {
  for (const tc of testCases) {
    test(tc.name, async ({ page }) => {
      await executeSteps(page, tc.steps);
    });
  }
});
```

## 実装メモ

- API呼び出しがあるためwaitForでローディング待ち
- オンボーディング完了状態の事前設定が必要（fixture）
- WebViewはiframeの場合、セレクタ注意
- AC4: トースト通知は未実装のため、お気に入りボタンのfavorited状態変化を検証に変更

## 実装状況

- **status**: completed
