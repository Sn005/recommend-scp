# Subtask 011-02-02: CSVパーサー実装

## 概要

CSVファイルを読み込み、TestCase型の配列にパースする機能を実装する。

## ユーザーストーリー

**ペルソナ**: 開発者
**目的**: CSVファイルからテストケースを読み込む
**価値**: テストケースをコードと分離して管理できる
**理由**: CSVなら非エンジニアでも編集可能で、Git差分も見やすい

## 受け入れ条件（EARS記法）

- [ ] WHEN CSVファイルを読み込む際
      GIVEN 有効なCSVファイルが存在する場合
      THEN TestCase[]型の配列が返される

- [ ] WHEN steps列をパースする際
      GIVEN JSON形式の文字列が含まれている場合
      THEN StepAction[]型にデシリアライズされる

- [ ] WHEN tags列をパースする際
      GIVEN カンマ区切りの文字列が含まれている場合
      THEN string[]型の配列に変換される

- [ ] WHEN 不正なCSVを読み込む際
      GIVEN JSON形式が壊れている場合
      THEN 適切なエラーメッセージを出力する

## 設計

### ファイル構成

```
apps/web/e2e/lib/
├── csv-parser.ts      # 本Subtaskで実装
└── types.ts           # 011-02-01で定義済み
```

### インターフェース

```typescript
// apps/web/e2e/lib/csv-parser.ts

import type { TestCase } from "./types";

/**
 * CSVファイルをパースしてTestCase配列を返す
 * @param filePath CSVファイルのパス
 * @returns TestCase[]
 * @throws Error CSVパースエラー、JSONパースエラー
 */
export function parseTestCaseCsv(filePath: string): TestCase[];

/**
 * CSV行をTestCaseに変換（内部関数）
 */
function parseRow(row: Record<string, string>): TestCase;
```

### 実装方針

```typescript
import { parse } from "csv-parse/sync";
import { readFileSync } from "fs";
import type { TestCase, StepAction } from "./types";

export function parseTestCaseCsv(filePath: string): TestCase[] {
  const content = readFileSync(filePath, "utf-8");
  const records = parse(content, {
    columns: true,
    skip_empty_lines: true,
  });

  return records.map(parseRow);
}

function parseRow(row: Record<string, string>): TestCase {
  return {
    id: row.id,
    name: row.name,
    steps: JSON.parse(row.steps) as StepAction[],
    expected: row.expected,
    tags: row.tags ? row.tags.split(",").map((t) => t.trim()) : [],
    result: row.result as TestCase["result"] | undefined,
  };
}
```

## テストケース

- [ ] 有効なCSVをパースしてTestCase[]が返る
- [ ] steps列のJSONが正しくパースされる
- [ ] tags列がstring[]に変換される
- [ ] 空のtags列が空配列になる
- [ ] 不正なJSONでエラーがスローされる

## 実装メモ

- `csv-parse` パッケージを使用
- 同期API（`csv-parse/sync`）を使用（テスト実行時のシンプルさ優先）
- エラーハンドリング: 行番号とカラム名を含むエラーメッセージ
