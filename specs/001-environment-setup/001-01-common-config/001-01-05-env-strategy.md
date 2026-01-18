# Subtask: モノレポ環境変数戦略

- **Subtask ID**: 001-01-05
- **Story**: [001-01 共通設定整備](./001-01-common-config.md)
- **ステータス**: pending
- **依存**: なし

## ユーザーストーリー

開発者として、環境変数を型安全かつ一元管理された方法でアクセスしたい。
なぜなら、`process.env` の直接参照は型安全でなく、設定漏れに気づきにくいからだ。

## 背景・コンテキスト

### 現状の課題

1. `packages/shared/src/lib/env.ts` が `packages/shared/.env` を参照する設計だが、実際には存在しない
2. `packages/pipeline/scripts/integration-test.ts` が `process.env` を直接参照しており、`env.ts` を使用していない
3. 将来 Next.js パッケージを追加した際の環境変数戦略が未定義
4. CI 環境（GitHub Actions）では `.env` ファイルが存在せず、secrets から直接注入される

### 検討した選択肢

| 選択肢                 | 概要                                     | 採否 | 理由                              |
| ---------------------- | ---------------------------------------- | ---- | --------------------------------- |
| A. パッケージ毎に .env | 各パッケージに `.env` を配置             | ❌   | 変数重複、同期コスト              |
| B. dotenv-cli          | ルートの `.env` を dotenv-cli で読み込み | ❌   | 全スクリプトにプレフィックス必要  |
| C. find-up             | ルートの `.env` を find-up で自動探索    | ✅   | どこから実行しても動作            |
| D. T3 Env              | Zod による型安全なバリデーション         | 保留 | .env 読み込みは別途必要。将来検討 |

## 受入条件（white-box）

### AC1: ルートに .env を配置

- [ ] リポジトリルートに `.env` ファイルを配置する設計とする
- [ ] `.env.example` をルートに作成し、必要な変数をドキュメント化

### AC2: env.ts を find-up 方式に改修

- [ ] `find-up` パッケージを `@recommend-scp/shared` に追加
- [ ] `env.ts` で `pnpm-workspace.yaml` を目印にモノレポルートを探索
- [ ] `override: false` で既存の環境変数（CI secrets）を優先

### AC3: ESLint で process.env 直接参照を禁止

- [ ] `eslint-plugin-n` をルートの devDependencies に追加
- [ ] `n/no-process-env` ルールを `error` として設定
- [ ] 例外ファイルを設定: `env.ts`, `env.client.ts`, `vitest.config.ts`

### AC4: 既存コードを env オブジェクト経由に移行

- [ ] `integration-test.ts` の `process.env` 参照を `env` オブジェクト経由に変更
- [ ] その他 `process.env` 直接参照があれば修正

### AC5: ドキュメント整備

- [ ] CLAUDE.md に環境変数ルールを記載
- [ ] 環境変数一覧を本 Subtask に記載

## 技術仕様

### ファイル配置

```
/                                  # リポジトリルート
├── .env                           # 共通環境変数（gitignore）
├── .env.example                   # テンプレート（commit）
└── packages/
    ├── shared/
    │   └── src/lib/
    │       ├── env.ts             # サーバー用（find-up で読み込み + 検証）
    │       └── env.client.ts      # クライアント用（将来の Next.js 用）
    ├── pipeline/                  # env.ts を使用
    └── web/                       # 将来追加時: Next.js が自動読み込み
        └── .env.local             # NEXT_PUBLIC_* 用（gitignore）
```

### env.ts の実装

```typescript
// packages/shared/src/lib/env.ts
import { config } from "dotenv";
import { findUpSync } from "find-up";
import { dirname, join } from "path";

/**
 * モノレポルートの .env を探索して読み込む
 * - CI 環境: secrets が既に process.env に設定済み → スキップ
 * - ローカル: pnpm-workspace.yaml を目印にルートを探索
 */
const loadEnv = () => {
  const workspaceFile = findUpSync("pnpm-workspace.yaml");
  if (workspaceFile) {
    const envPath = join(dirname(workspaceFile), ".env");
    config({ path: envPath, override: false });
  }
};

loadEnv();

/**
 * 環境変数アクセサ（検証付き）
 */
export const env = {
  get SUPABASE_URL(): string {
    const value = process.env.SUPABASE_URL;
    if (!value) throw new Error("SUPABASE_URL is not set");
    return value;
  },
  get SUPABASE_ANON_KEY(): string {
    const value = process.env.SUPABASE_ANON_KEY;
    if (!value) throw new Error("SUPABASE_ANON_KEY is not set");
    return value;
  },
  get SUPABASE_SERVICE_ROLE_KEY(): string {
    const value = process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (!value) throw new Error("SUPABASE_SERVICE_ROLE_KEY is not set");
    return value;
  },
  get OPENAI_API_KEY(): string {
    const value = process.env.OPENAI_API_KEY;
    if (!value) throw new Error("OPENAI_API_KEY is not set");
    return value;
  },
  /** オプション: デフォルト値あり */
  get TAGGING_LLM_PROVIDER(): string {
    return process.env.TAGGING_LLM_PROVIDER ?? "openai";
  },
};
```

### ESLint 設定

```javascript
// eslint.config.mjs に追加
import nodePlugin from "eslint-plugin-n";

export default tseslint.config(
  // ... 既存設定 ...
  {
    plugins: {
      n: nodePlugin,
    },
    rules: {
      "n/no-process-env": "error",
    },
  },
  // 例外ファイル
  {
    files: ["**/src/lib/env.ts", "**/src/lib/env.client.ts", "**/vitest.config.ts"],
    rules: {
      "n/no-process-env": "off",
    },
  }
);
```

### 依存パッケージ

```bash
# ルートに追加
pnpm add -D eslint-plugin-n -w

# shared に追加
pnpm add find-up --filter @recommend-scp/shared
```

## 環境変数一覧

| 変数名                      | 必須 | 用途                                         | 使用パッケージ   |
| --------------------------- | ---- | -------------------------------------------- | ---------------- |
| `SUPABASE_URL`              | ✅   | Supabase プロジェクト URL                    | shared, pipeline |
| `SUPABASE_ANON_KEY`         | ✅   | Supabase 匿名キー                            | shared           |
| `SUPABASE_SERVICE_ROLE_KEY` | ✅   | Supabase サービスロールキー                  | shared, pipeline |
| `OPENAI_API_KEY`            | ✅   | OpenAI API キー                              | shared, pipeline |
| `TAGGING_LLM_PROVIDER`      | ❌   | タグ付け LLM プロバイダー（default: openai） | pipeline         |

### 将来追加予定（Next.js 用）

| 変数名                          | 必須 | 用途                        |
| ------------------------------- | ---- | --------------------------- |
| `NEXT_PUBLIC_SUPABASE_URL`      | ✅   | クライアント用 Supabase URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | ✅   | クライアント用匿名キー      |

## 使用方法

### サーバーサイド（pipeline, poc 等）

```typescript
// ❌ 禁止: process.env 直接参照
const url = process.env.SUPABASE_URL;

// ✅ 推奨: env オブジェクト経由
import { env } from "@recommend-scp/shared";
const url = env.SUPABASE_URL;
```

### CI 環境（GitHub Actions）

```yaml
env:
  SUPABASE_URL: ${{ secrets.SUPABASE_URL }}
  SUPABASE_SERVICE_ROLE_KEY: ${{ secrets.SUPABASE_SERVICE_ROLE_KEY }}
  OPENAI_API_KEY: ${{ secrets.OPENAI_API_KEY }}
```

CI では secrets が直接 `process.env` に注入されるため、`.env` ファイルは不要。

## テストケース

- [ ] `pnpm --filter pipeline run test` がルートの `.env` を読み込む
- [ ] `cd packages/pipeline && pnpm test` がルートの `.env` を読み込む
- [ ] CI 環境（.env なし）で secrets から環境変数を取得できる
- [ ] `process.env.SUPABASE_URL` を直接参照すると ESLint エラー
- [ ] `env.ts` 内では `process.env` アクセスが許可される

## 参考資料

- [Turborepo - Using environment variables](https://turborepo.dev/docs/crafting-your-repository/using-environment-variables)
- [eslint-plugin-n - no-process-env](https://github.com/eslint-community/eslint-plugin-n/blob/master/docs/rules/no-process-env.md)
- [T3 Env](https://env.t3.gg/) - 将来の移行候補
