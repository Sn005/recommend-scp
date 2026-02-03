# Subtask 011-02-01: CSV/TSVスキーマ定義

## 概要

テストケースCSV/TSVのスキーマを定義し、型定義とサンプルファイルを作成する。

## ユーザーストーリー

**ペルソナ**: 開発者
**目的**: テストケースの構造を明確に定義する
**価値**: 一貫したフォーマットでテストケースを管理できる
**理由**: スキーマがないとパーサー実装やAI生成が困難

## 受け入れ条件（EARS記法）

- [ ] WHEN テストケースを定義する際
      GIVEN CSV/TSVファイルを作成する場合
      THEN 以下のカラムが使用できる:
      `id, name, steps, expected, tags, result`

- [ ] WHEN テストケースIDを付与する際
      GIVEN 新規テストケースの場合
      THEN `TC-{epic}-{story}-{連番}` 形式で命名される

- [ ] WHEN 型定義を参照する際
      GIVEN `apps/web/e2e/lib/types.ts` が存在する場合
      THEN TestCase型とStepAction型が定義されている

## 設計

### CSV/TSVスキーマ

```csv
id,name,steps,expected,tags,result
TC-006-01-001,オンボーディング完了フロー,"[{""action"":""goto"",""url"":""/onboarding""}]",推薦画面に遷移する,critical,
```

| カラム   | 型     | 必須 | 説明                                |
| -------- | ------ | ---- | ----------------------------------- |
| id       | string | ✓    | `TC-{epic}-{story}-{連番}`          |
| name     | string | ✓    | テスト名（日本語）                  |
| steps    | JSON   | ✓    | 操作手順の配列                      |
| expected | string | ✓    | 期待結果（日本語）                  |
| tags     | string | -    | `critical`, `edge` などカンマ区切り |
| result   | string | -    | 実行結果（pass/fail/skip）          |

### TypeScript型定義

```typescript
// apps/web/e2e/lib/types.ts

export type StepAction =
  | { action: "goto"; url: string }
  | { action: "click"; testId: string }
  | { action: "fill"; testId: string; value: string }
  | { action: "waitFor"; testId: string; timeout?: number }
  | { action: "assertVisible"; testId: string }
  | { action: "assertText"; testId: string; text: string }
  | { action: "assertUrl"; pattern: string };

export interface TestCase {
  id: string;
  name: string;
  steps: StepAction[];
  expected: string;
  tags: string[];
  result?: "pass" | "fail" | "skip";
}
```

### サンプルCSV

```csv
id,name,steps,expected,tags,result
TC-006-01-001,オンボーディング完了フロー,"[{""action"":""goto"",""url"":""/onboarding""},{""action"":""click"",""testId"":""pack-horror""},{""action"":""click"",""testId"":""complete-button""}]",推薦画面に遷移する,critical,
TC-006-02-001,推薦カード表示,"[{""action"":""goto"",""url"":""/recommend""},{""action"":""waitFor"",""testId"":""article-card""}]",記事カードが表示される,critical,
```

## テストケース

- [ ] types.ts に TestCase 型が定義されている
- [ ] types.ts に StepAction 型が定義されている
- [ ] サンプルCSVがスキーマに従っている

## 実装メモ

- CSVのエスケープ: JSON内のダブルクォートは `""` で表現
- tags はカンマ区切り文字列（パーサーで配列に変換）
- result は実行後に更新（初期値は空）
