# Subtask-001-01-01: モノレポ・pocパッケージ初期化

## 概要

Turborepo + pnpm でモノレポを構成し、PoC用パッケージを作成する。

## ユーザーストーリー

**As a** 開発者
**I want** モノレポ構成でpocパッケージを初期化する
**So that** vidmark準拠の開発環境でPoCを進められる

## Acceptance Criteria（EARS記法）

### モノレポ構成

- [ ] WHEN 開発者がリポジトリをクローンした際
      GIVEN pnpm がインストールされている場合
      THEN `pnpm install` で全依存関係がインストールされる
      AND エラーなく完了する

- [ ] WHEN 開発者が `pnpm --filter poc dev` を実行した際
      GIVEN pocパッケージが存在する場合
      THEN pocパッケージの開発モードが起動する

### pocパッケージ構成

- [ ] WHEN 開発者がpocパッケージの構成を確認した際
      GIVEN パッケージが正しく作成されている場合
      THEN 以下のディレクトリ構成が存在する：
      ```
      packages/poc/
      ├── src/
      │   ├── crawler/
      │   ├── embedding/
      │   ├── tagging/
      │   ├── search/
      │   └── report/
      ├── scripts/
      ├── data/          # .gitignore対象
      ├── package.json
      └── tsconfig.json
      ```

### 依存パッケージ

- [ ] WHEN pocパッケージのpackage.jsonを確認した際
      GIVEN 依存関係が設定されている場合
      THEN 以下のパッケージが含まれる：
      - typescript
      - tsx (TypeScript実行)
      - @supabase/supabase-js
      - openai
      - zod (バリデーション)

## 設計

### ディレクトリ構成

```
recommend-scp/
├── packages/
│   └── poc/
│       ├── src/
│       │   ├── crawler/
│       │   │   └── fetch-scp.ts
│       │   ├── embedding/
│       │   │   └── generate.ts
│       │   ├── tagging/
│       │   │   └── extract.ts
│       │   ├── search/
│       │   │   ├── vector-search.ts
│       │   │   └── hybrid-search.ts
│       │   ├── report/
│       │   │   └── generate-report.ts
│       │   └── types.ts
│       ├── scripts/
│       │   ├── 01-fetch.ts
│       │   ├── 02-embed.ts
│       │   ├── 03-tag.ts
│       │   ├── 04-search.ts
│       │   └── 05-report.ts
│       ├── data/
│       │   ├── raw/
│       │   └── processed/
│       ├── .env.example
│       ├── .gitignore
│       ├── package.json
│       └── tsconfig.json
├── turbo.json
├── pnpm-workspace.yaml
└── package.json
```

### package.json (poc)

```json
{
  "name": "@recommend-scp/poc",
  "version": "0.0.1",
  "private": true,
  "scripts": {
    "dev": "tsx watch src/index.ts",
    "run:01-fetch": "tsx scripts/01-fetch.ts",
    "run:02-embed": "tsx scripts/02-embed.ts",
    "run:03-tag": "tsx scripts/03-tag.ts",
    "run:04-search": "tsx scripts/04-search.ts",
    "run:05-report": "tsx scripts/05-report.ts"
  },
  "dependencies": {
    "@supabase/supabase-js": "^2.x",
    "openai": "^4.x",
    "zod": "^3.x"
  },
  "devDependencies": {
    "typescript": "^5.x",
    "tsx": "^4.x",
    "@types/node": "^20.x"
  }
}
```

## テストケース

- [ ] `pnpm install` が成功する
- [ ] `pnpm --filter poc run:01-fetch --help` がエラーなく実行できる
- [ ] TypeScript の型チェックが通る
