# Subtask-003-00-01: sharedパッケージ作成

## 概要

共通基盤と再利用可能な処理を格納する `packages/shared/` パッケージを新規作成する。

## ユーザーストーリー

**ペルソナ**: 開発者

**目的**: 複数パッケージから参照される共通コードを一箇所に集約する

**価値**: コードの重複を防ぎ、一貫性のあるインターフェースを提供

## スコープ

### 含む

- `packages/shared/package.json` の作成
- `packages/shared/tsconfig.json` の作成
- 以下のコードを `packages/poc/src/` から移行:
  - `lib/env.ts`
  - `lib/supabase.ts`
  - `types.ts`
  - `embedding/` ディレクトリ全体
  - `tagging/` ディレクトリ全体
  - `search/` ディレクトリ全体

### 含まない

- pocパッケージの参照更新（003-00-03で実施）
- pipelineパッケージの作成（003-00-02で実施）

## Acceptance Criteria

### パッケージ設定

- [x] WHEN package.jsonを作成する際
      GIVEN pnpm workspaceを使用している場合
      THEN name が `@recommend-scp/shared` である
      AND 必要な dependencies が定義されている（openai, @supabase/supabase-js, dotenv）
      AND exports フィールドでサブパスexportが定義されている

- [x] WHEN tsconfig.jsonを作成する際
      GIVEN TypeScript 5.x を使用している場合
      THEN moduleResolution が "Bundler" である
      AND target が "ES2022" である
      AND strict が true である

### コード移行

- [x] WHEN lib/env.ts を移行する際
      GIVEN 環境変数の検証ロジックが含まれる場合
      THEN `packages/shared/src/lib/env.ts` に配置される
      AND 既存のexportインターフェースが維持される

- [x] WHEN lib/supabase.ts を移行する際
      GIVEN Supabaseクライアント生成関数が含まれる場合
      THEN `packages/shared/src/lib/supabase.ts` に配置される
      AND createSupabaseClient, createSupabaseAdmin, getSupabaseAdmin がexportされる

- [x] WHEN types.ts を移行する際
      GIVEN 共通の型定義が含まれる場合
      THEN `packages/shared/src/types.ts` に配置される
      AND 全ての型がre-exportされる

- [x] WHEN embedding/ を移行する際
      GIVEN Embedding生成ロジックとテストが含まれる場合
      THEN `packages/shared/src/embedding/` に配置される
      AND 全テストが通過する

- [x] WHEN tagging/ を移行する際
      GIVEN タグ抽出ロジックとテストが含まれる場合
      THEN `packages/shared/src/tagging/` に配置される
      AND 全テストが通過する

- [x] WHEN search/ を移行する際
      GIVEN 検索ロジックとテストが含まれる場合
      THEN `packages/shared/src/search/` に配置される
      AND 全テストが通過する

### 検証

- [x] WHEN pnpm install を実行する際
      GIVEN packages/shared/ が存在する場合
      THEN エラーなく完了する

- [x] WHEN pnpm --filter shared test を実行する際
      GIVEN 全テストファイルが移行されている場合
      THEN 全テストが通過する

- [x] WHEN pnpm --filter shared type-check を実行する際
      GIVEN TypeScript設定が正しい場合
      THEN 型エラーがない

## 設計詳細

### package.json

```json
{
  "name": "@recommend-scp/shared",
  "version": "0.1.0",
  "type": "module",
  "exports": {
    "./lib/env": "./src/lib/env.ts",
    "./lib/supabase": "./src/lib/supabase.ts",
    "./types": "./src/types.ts",
    "./embedding": "./src/embedding/index.ts",
    "./tagging": "./src/tagging/index.ts",
    "./search": "./src/search/index.ts"
  },
  "scripts": {
    "test": "vitest run",
    "test:watch": "vitest",
    "type-check": "tsc --noEmit"
  },
  "dependencies": {
    "@supabase/supabase-js": "^2.49.1",
    "dotenv": "^16.4.7",
    "openai": "^4.77.0"
  },
  "devDependencies": {
    "typescript": "^5.7.2",
    "vitest": "^2.1.8"
  }
}
```

### ディレクトリ構造

```
packages/shared/
├── package.json
├── tsconfig.json
├── vitest.config.ts
└── src/
    ├── lib/
    │   ├── env.ts
    │   └── supabase.ts
    ├── types.ts
    ├── embedding/
    │   ├── index.ts          # re-export
    │   ├── generate.ts
    │   └── generate.test.ts
    ├── tagging/
    │   ├── index.ts          # re-export
    │   ├── extract.ts
    │   └── extract.test.ts
    └── search/
        ├── index.ts          # re-export
        ├── vector-search.ts
        ├── hybrid-search.ts
        └── __dev__/
            ├── vector-search.test.ts
            └── hybrid-search.test.ts
```

## テストケース

- [x] sharedパッケージのpnpm installが成功する
- [x] sharedパッケージの全テストが通過する
- [x] sharedパッケージの型チェックが通過する
- [ ] 他パッケージから `@recommend-scp/shared/lib/env` でimportできる
- [ ] 他パッケージから `@recommend-scp/shared/types` でimportできる

## 実装状況

- **status**: completed
- **実装日**: 2026-01-14
- **テスト結果**: 20 tests passed
- **型チェック**: OK
