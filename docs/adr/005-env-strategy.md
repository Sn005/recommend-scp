# ADR-005: モノレポ環境変数戦略

## ステータス

提案中 (Proposed)

## コンテキスト

モノレポ構成において、環境変数の管理方法を統一する必要がある。

### 現状の課題

1. `packages/shared/src/lib/env.ts` が `packages/shared/.env` を参照する設計だが、実際には存在しない
2. `packages/pipeline/scripts/integration-test.ts` が `process.env` を直接参照しており、`env.ts` を使用していない
3. 将来 Next.js パッケージを追加した際の環境変数戦略が未定義
4. CI 環境（GitHub Actions）では `.env` ファイルが存在せず、secrets から直接注入される

### 検討した選択肢

| 選択肢 | 概要 | メリット | デメリット |
|--------|------|---------|-----------|
| A. パッケージ毎に .env | 各パッケージに `.env` を配置 | フレームワーク標準に従える | 変数重複、同期コスト |
| B. ルート一元管理 + dotenv-cli | ルートの `.env` を dotenv-cli で読み込み | 一元管理 | 全スクリプトにプレフィックス必要 |
| C. ルート一元管理 + find-up | ルートの `.env` を find-up で自動探索 | どこから実行しても動作 | find-up 依存追加 |
| D. T3 Env | Zod による型安全なバリデーション | 型安全、extends対応 | .env 読み込みは別途必要 |

## 決定

**選択肢 C: ルート一元管理 + find-up** を採用する。

### 理由

1. **シンプルさ**: dotenv-cli のコマンドプレフィックスが不要
2. **一貫性**: どこから実行しても同じ .env を読み込む
3. **Next.js 互換**: Next.js は自前で .env を読み込むため干渉しない
4. **CI 対応**: `override: false` により、既存の環境変数（secrets）を優先

### 将来の拡張

Next.js 追加時に T3 Env への移行を検討する。現在の `env.ts` の構造は T3 Env と類似しており、移行コストは低い。

## 実装詳細

### 1. ファイル配置

```
/                                  # リポジトリルート
├── .env                           # 共通環境変数（gitignore）
├── .env.example                   # テンプレート（commit）
└── packages/
    ├── shared/
    │   └── src/lib/
    │       ├── env.ts             # サーバー用（find-up で読み込み + 検証）
    │       └── env.client.ts      # クライアント用（将来の Next.js 用、検証のみ）
    ├── pipeline/                  # env.ts を使用
    ├── poc/                       # env.ts を使用
    └── web/                       # 将来追加時: Next.js が自動読み込み
        └── .env.local             # NEXT_PUBLIC_* 用（gitignore）
```

### 2. env.ts の実装

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
 *
 * @example
 * import { env } from "@recommend-scp/shared";
 * const url = env.SUPABASE_URL; // 型安全、未設定時はエラー
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

/**
 * 全必須環境変数の検証
 * エントリポイントで呼び出して早期エラー検出
 */
export function validateEnv(): void {
  void env.SUPABASE_URL;
  void env.SUPABASE_ANON_KEY;
  void env.SUPABASE_SERVICE_ROLE_KEY;
}
```

### 3. env.client.ts の実装（将来の Next.js 用）

```typescript
// packages/shared/src/lib/env.client.ts
/**
 * クライアントサイド用環境変数アクセサ
 * Next.js の NEXT_PUBLIC_* 変数を検証付きで提供
 *
 * 注意: dotenv 読み込みは不要（Next.js が自動読み込み）
 */
export const clientEnv = {
  get SUPABASE_URL(): string {
    const value = process.env.NEXT_PUBLIC_SUPABASE_URL;
    if (!value) throw new Error("NEXT_PUBLIC_SUPABASE_URL is not set");
    return value;
  },
  get SUPABASE_ANON_KEY(): string {
    const value = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    if (!value) throw new Error("NEXT_PUBLIC_SUPABASE_ANON_KEY is not set");
    return value;
  },
};
```

### 4. ESLint ルール: process.env 直接参照の禁止

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
      // process.env 直接参照を禁止
      // env.ts 経由でアクセスすること
      "n/no-process-env": "error",
    },
  },
  // env.ts 内では process.env アクセスを許可
  {
    files: ["**/src/lib/env.ts", "**/src/lib/env.client.ts"],
    rules: {
      "n/no-process-env": "off",
    },
  },
  // vitest.config.ts では process.env アクセスを許可（loadEnv 用）
  {
    files: ["**/vitest.config.ts"],
    rules: {
      "n/no-process-env": "off",
    },
  },
);
```

### 5. 依存パッケージの追加

```bash
# ルートに追加
pnpm add -D eslint-plugin-n -w

# shared に追加
pnpm add find-up --filter @recommend-scp/shared
```

## 使用方法

### サーバーサイド（pipeline, poc 等）

```typescript
// ❌ 禁止: process.env 直接参照
const url = process.env.SUPABASE_URL;

// ✅ 推奨: env オブジェクト経由
import { env } from "@recommend-scp/shared";
const url = env.SUPABASE_URL;
```

### クライアントサイド（将来の Next.js）

```typescript
// ❌ 禁止: process.env 直接参照
const url = process.env.NEXT_PUBLIC_SUPABASE_URL;

// ✅ 推奨: clientEnv オブジェクト経由
import { clientEnv } from "@recommend-scp/shared/lib/env.client";
const url = clientEnv.SUPABASE_URL;
```

### CI 環境（GitHub Actions）

```yaml
# .github/workflows/data-pipeline.yml
env:
  SUPABASE_URL: ${{ secrets.SUPABASE_URL }}
  SUPABASE_SERVICE_ROLE_KEY: ${{ secrets.SUPABASE_SERVICE_ROLE_KEY }}
  OPENAI_API_KEY: ${{ secrets.OPENAI_API_KEY }}
```

CI では secrets が直接 `process.env` に注入されるため、`.env` ファイルは不要。
`override: false` により、既存の環境変数が優先される。

## 環境変数一覧

| 変数名 | 必須 | 用途 | 使用パッケージ |
|--------|------|------|---------------|
| `SUPABASE_URL` | ✅ | Supabase プロジェクト URL | shared, pipeline |
| `SUPABASE_ANON_KEY` | ✅ | Supabase 匿名キー | shared |
| `SUPABASE_SERVICE_ROLE_KEY` | ✅ | Supabase サービスロールキー | shared, pipeline |
| `OPENAI_API_KEY` | ✅ | OpenAI API キー | shared, pipeline |
| `TAGGING_LLM_PROVIDER` | ❌ | タグ付け LLM プロバイダー（default: openai） | pipeline |

### 将来追加予定（Next.js 用）

| 変数名 | 必須 | 用途 |
|--------|------|------|
| `NEXT_PUBLIC_SUPABASE_URL` | ✅ | クライアント用 Supabase URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | ✅ | クライアント用匿名キー |

## 結果

### メリット

1. **一元管理**: ルートの `.env` で全パッケージの変数を管理
2. **型安全**: `env` オブジェクト経由で補完が効く
3. **早期エラー検出**: 未設定の変数は即座にエラー
4. **ESLint 強制**: `process.env` 直接参照を禁止
5. **CI 対応**: secrets 優先で `.env` 不要

### デメリット

1. `find-up` 依存の追加
2. `eslint-plugin-n` 依存の追加

## 参考資料

- [Turborepo - Using environment variables](https://turborepo.dev/docs/crafting-your-repository/using-environment-variables)
- [ESLint - no-process-env](https://eslint.org/docs/latest/rules/no-process-env)
- [eslint-plugin-n - no-process-env](https://github.com/eslint-community/eslint-plugin-n/blob/master/docs/rules/no-process-env.md)
- [T3 Env](https://env.t3.gg/) - 将来の移行候補
