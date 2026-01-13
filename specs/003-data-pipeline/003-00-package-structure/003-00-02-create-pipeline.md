# Subtask-003-00-02: pipelineパッケージ作成

## 概要

データパイプライン固有のコードを格納する `packages/pipeline/` パッケージを新規作成する。

## ユーザーストーリー

**ペルソナ**: 開発者

**目的**: EPIC-003（データパイプライン本番化）の成果物を適切なパッケージに配置する

**価値**: パイプライン固有のコードと共通コードを明確に分離

## スコープ

### 含む

- `packages/pipeline/package.json` の作成
- `packages/pipeline/tsconfig.json` の作成
- 以下のコードを `packages/poc/src/` から移行:
  - `crawler/` ディレクトリ全体
  - `migrations/` ディレクトリ全体

### 含まない

- pocパッケージの参照更新（003-00-03で実施）
- orchestrator/ の実装（003-04で実施）

## 依存関係

- 003-00-01（sharedパッケージ作成）が完了していること

## Acceptance Criteria

### パッケージ設定

- [ ] WHEN package.jsonを作成する際
      GIVEN pnpm workspaceを使用している場合
      THEN name が `@recommend-scp/pipeline` である
      AND dependencies に `@recommend-scp/shared` が含まれる

- [ ] WHEN tsconfig.jsonを作成する際
      GIVEN TypeScript 5.x を使用している場合
      THEN moduleResolution が "Bundler" である
      AND paths で `@recommend-scp/shared/*` が解決できる

### コード移行

- [ ] WHEN crawler/ を移行する際
      GIVEN SCP Data APIクローラーが含まれる場合
      THEN `packages/pipeline/src/crawler/` に配置される
      AND import文が `@recommend-scp/shared` を参照するよう更新される

- [ ] WHEN migrations/ を移行する際
      GIVEN DBスキーマテストが含まれる場合
      THEN `packages/pipeline/src/migrations/` に配置される
      AND import文が `@recommend-scp/shared` を参照するよう更新される

### 検証

- [ ] WHEN pnpm install を実行する際
      GIVEN packages/pipeline/ が存在する場合
      THEN エラーなく完了する
      AND node_modules/@recommend-scp/shared がシンボリックリンクされる

- [ ] WHEN pnpm --filter pipeline test を実行する際
      GIVEN 全テストファイルが移行されている場合
      THEN 全テストが通過する

- [ ] WHEN pnpm --filter pipeline type-check を実行する際
      GIVEN TypeScript設定が正しい場合
      THEN 型エラーがない

## 設計詳細

### package.json

```json
{
  "name": "@recommend-scp/pipeline",
  "version": "0.1.0",
  "type": "module",
  "scripts": {
    "test": "vitest run",
    "test:watch": "vitest",
    "type-check": "tsc --noEmit"
  },
  "dependencies": {
    "@recommend-scp/shared": "workspace:*"
  },
  "devDependencies": {
    "typescript": "^5.7.2",
    "vitest": "^2.1.8"
  }
}
```

### ディレクトリ構造

```
packages/pipeline/
├── package.json
├── tsconfig.json
├── vitest.config.ts
└── src/
    ├── crawler/
    │   └── fetch-scp.ts
    ├── migrations/
    │   └── __dev__/
    │       ├── 003-01-01-language-schema.test.ts
    │       ├── 003-01-02-tag-dictionary.test.ts
    │       └── 003-01-03-pipeline-tables.test.ts
    └── orchestrator/       # 003-04で実装予定（空ディレクトリ）
```

### import文の更新例

```typescript
// Before (poc内での相対パス)
import type { ScpArticleRaw } from "../types";

// After (workspaceパッケージ参照)
import type { ScpArticleRaw } from "@recommend-scp/shared/types";
```

## テストケース

- [ ] pipelineパッケージのpnpm installが成功する
- [ ] pipelineパッケージの全テストが通過する
- [ ] pipelineパッケージの型チェックが通過する
- [ ] `@recommend-scp/shared` への依存が正しく解決される
- [ ] crawler/fetch-scp.ts が shared の types を参照できる
