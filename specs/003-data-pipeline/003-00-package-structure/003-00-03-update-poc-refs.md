# Subtask-003-00-03: PoC参照更新

## 概要

`packages/poc/` 内のコードが `@recommend-scp/shared` を参照するようimport文を更新する。

## ユーザーストーリー

**ペルソナ**: 開発者

**目的**: pocパッケージが共通コードをsharedから参照するよう更新する

**価値**: PoCスクリプトが引き続き動作することを保証

## スコープ

### 含む

- `packages/poc/package.json` の dependencies 更新
- `packages/poc/scripts/` 内のimport文更新
- `packages/poc/src/report/` 内のimport文更新
- 不要になったファイルの削除（lib/, types.ts, embedding/, tagging/, search/）

### 含まない

- PoCスクリプトのロジック変更
- 新機能の追加

## 依存関係

- 003-00-01（sharedパッケージ作成）が完了していること
- 003-00-02（pipelineパッケージ作成）が完了していること

## Acceptance Criteria

### package.json更新

- [x] WHEN package.jsonを更新する際
      GIVEN pocパッケージが存在する場合
      THEN dependencies に `@recommend-scp/shared` が追加される
      AND 不要になった直接依存（openai等）が削除される

### import文更新

- [x] WHEN scripts/01-fetch.ts を更新する際
      GIVEN `../src/` への相対パス参照がある場合
      THEN `@recommend-scp/shared` または `@recommend-scp/pipeline` への参照に変更される

- [x] WHEN scripts/02-embed.ts を更新する際
      GIVEN embedding生成関数を参照している場合
      THEN `@recommend-scp/shared/embedding` からimportするよう変更される

- [x] WHEN scripts/03-tag.ts を更新する際
      GIVEN タグ抽出関数を参照している場合
      THEN `@recommend-scp/shared/tagging` からimportするよう変更される

- [x] WHEN scripts/04-search.ts を更新する際
      GIVEN 検索関数を参照している場合
      THEN `@recommend-scp/shared/search` からimportするよう変更される

- [x] WHEN scripts/05-report.ts を更新する際
      GIVEN レポート生成関数を参照している場合
      THEN `../src/report/` への相対パス参照が維持される（poc固有機能のため）

- [x] WHEN src/report/ 内のファイルを更新する際
      GIVEN 共通型やライブラリを参照している場合
      THEN `@recommend-scp/shared` への参照に変更される

### 不要ファイル削除

- [x] WHEN 移行完了後にクリーンアップする際
      GIVEN shared/pipelineに移行済みのファイルがある場合
      THEN `packages/poc/src/lib/` が削除される
      AND `packages/poc/src/types.ts` が削除される
      AND `packages/poc/src/embedding/` が削除される
      AND `packages/poc/src/tagging/` が削除される
      AND `packages/poc/src/search/` が削除される
      AND `packages/poc/src/crawler/` が削除される
      AND `packages/poc/src/migrations/` が削除される

### 検証

- [x] WHEN pnpm --filter poc test を実行する際
      GIVEN 全参照が更新されている場合
      THEN 全テストが通過する

- [x] WHEN pnpm --filter poc run:01-fetch を実行する際
      GIVEN 環境変数が設定されている場合
      THEN スクリプトがエラーなく実行できる（実際のAPI呼び出しは不要）

## 設計詳細

### 更新後のpackage.json

```json
{
  "name": "@recommend-scp/poc",
  "version": "0.1.0",
  "type": "module",
  "scripts": {
    "dev": "tsx src/index.ts",
    "run:01-fetch": "tsx scripts/01-fetch.ts",
    "run:02-embed": "tsx scripts/02-embed.ts",
    "run:03-tag": "tsx scripts/03-tag.ts",
    "run:04-search": "tsx scripts/04-search.ts",
    "run:05-report": "tsx scripts/05-report.ts",
    "test": "vitest run",
    "type-check": "tsc --noEmit"
  },
  "dependencies": {
    "@recommend-scp/shared": "workspace:*",
    "@recommend-scp/pipeline": "workspace:*"
  },
  "devDependencies": {
    "tsx": "^4.19.2",
    "typescript": "^5.7.2",
    "vitest": "^2.1.8"
  }
}
```

### 更新後のディレクトリ構造

```
packages/poc/
├── package.json
├── tsconfig.json
├── vitest.config.ts
├── data/
│   ├── raw/
│   └── processed/
├── scripts/
│   ├── 01-fetch.ts         # @recommend-scp/pipeline/crawler を参照
│   ├── 02-embed.ts         # @recommend-scp/shared/embedding を参照
│   ├── 03-tag.ts           # @recommend-scp/shared/tagging を参照
│   ├── 04-search.ts        # @recommend-scp/shared/search を参照
│   ├── 05-report.ts        # ../src/report を参照（poc固有）
│   ├── test-supabase.ts
│   └── verify-embedding.ts
└── src/
    ├── index.ts            # エントリポイント
    └── report/             # PoC検証レポート（poc固有機能）
        ├── generate-report.ts
        └── __dev__/
            └── generate.test.ts
```

### import文更新例

```typescript
// scripts/02-embed.ts

// Before
import "../src/lib/env";
import { generateEmbeddingsForArticles } from "../src/embedding/generate";
import { createSupabaseAdmin } from "../src/lib/supabase";

// After
import "@recommend-scp/shared/lib/env";
import { generateEmbeddingsForArticles } from "@recommend-scp/shared/embedding";
import { createSupabaseAdmin } from "@recommend-scp/shared/lib/supabase";
```

## テストケース

- [x] pocパッケージのpnpm installが成功する
- [x] pocパッケージの全テストが通過する
- [x] pocパッケージの型チェックが通過する
- [x] scripts/01-fetch.ts が構文エラーなく読み込める
- [x] scripts/02-embed.ts が構文エラーなく読み込める
- [x] scripts/03-tag.ts が構文エラーなく読み込める
- [x] scripts/04-search.ts が構文エラーなく読み込める
- [x] scripts/05-report.ts が構文エラーなく読み込める

## 実装状況

- **status**: completed
- **completed_at**: 2026-01-14
