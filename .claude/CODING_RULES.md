# コーディングルール & コミット規約

> CLAUDE.mdから分離。プロジェクトのコーディング規約とコミットメッセージルールを定義。

---

## コーディングルール

### Import文

- **`.js` 拡張子は使用しない**: 特別な事情がない限り、import文に `.js` 拡張子を付けない
  - 良い例: `import { foo } from "./lib/bar"`
  - 悪い例: `import { foo } from "./lib/bar.js"`
- tsconfig.jsonで `moduleResolution: "Bundler"` を使用しているため、拡張子なしで解決可能

### 変数と制御フロー

- **変数の再代入は避ける**: `let` より `const` を優先し、イミュータブルなコードを書く
- **for文での再代入は避ける**: `map` / `filter` / `reduce` などの高階関数を使用
  - 良い例: `const doubled = numbers.map(n => n * 2)`
  - 悪い例: `let result = []; for (const n of numbers) { result.push(n * 2); }`
- 副作用のない純粋関数を推奨

### 環境変数

> 詳細: [001-01-05: モノレポ環境変数戦略](../specs/001-environment-setup/001-01-common-config/001-01-05-env-strategy.md)

- **ルートの `.env` で一元管理**: 環境変数はリポジトリルートの `.env` に配置
- **`env.ts` 経由でアクセス**: `packages/shared/src/lib/env.ts` の `env` オブジェクトを使用
- **`process.env` 直接参照は禁止**: ESLint ルール `n/no-process-env` でエラー
  - 良い例: `import { env } from "@recommend-scp/shared"; env.SUPABASE_URL`
  - 悪い例: `process.env.SUPABASE_URL` → ESLint エラー
- **例外**: `env.ts` / `env.client.ts` / `vitest.config.ts` 内では `process.env` アクセス可

### TypeScript

- 型定義は `src/types.ts` に集約
- 明示的な型アノテーションを推奨
- `any` 型の使用は避ける

### テストコード

- **⚠️ 最重要ルール: テストケース名は必ず日本語で記述する**
  - 良い例: `it("有効なJSONレスポンスをパースできる", ...)`
  - 悪い例: `it("should parse valid JSON response", ...)`
- `describe` ブロックの説明も日本語を推奨
- テストの意図が日本語で明確に伝わることを優先

### ログ出力

- **⚠️ 最重要ルール: `console.log` 禁止 → `createLogger` を使用**
  - `packages/pipeline/src/crawler/utils/logger.ts` の `createLogger` を必ず使用
  - ESLintで `no-console: "error"` が設定されており、違反するとビルドエラー
  - 良い例:
    ```typescript
    import { createLogger } from "./crawler/utils/logger";
    const logger = createLogger({ prefix: "[MyModule]" });
    logger.info("記事を取得中...");
    logger.error("取得に失敗:", error);
    ```
  - 悪い例:
    ```typescript
    console.log("記事を取得中..."); // ESLintエラー
    ```
- **例外: `scripts/` ディレクトリ内のCLIスクリプトでは `console` 使用可**
- ログメッセージは日本語で記述
- 技術的な固有名詞（Supabase, Embedding等）はそのまま使用可

### コミット前の必須アクション

- **⚠️ 最重要ルール: コミット前に必ず `pnpm format` を実行する**
  - Claude Code環境ではlefthookのgitフックが動作しないため、手動でフォーマットを実行する必要がある
  - 実行コマンド: `pnpm format` または `pnpm prettier --write <対象ファイル>`
  - フォーマット対象: `**/*.{ts,tsx,js,jsx,json,md,yaml,yml}`
- フォーマットを忘れるとCIで `format:check` が失敗する
- 特に `.claude/skills/**/*.md` ファイルを編集した場合は要注意

---

## コミットメッセージ規約（Conventional Commits）

コミットメッセージは以下の形式に従うこと：

```
<type>(<scope>): <description>

[optional body]

[optional footer(s)]
```

### type（必須）

| type       | 説明                                                 |
| ---------- | ---------------------------------------------------- |
| `feat`     | 新機能                                               |
| `fix`      | バグ修正                                             |
| `docs`     | ドキュメントのみの変更                               |
| `style`    | コードの意味に影響しない変更（空白、フォーマット等） |
| `refactor` | バグ修正でも機能追加でもないコード変更               |
| `perf`     | パフォーマンス改善                                   |
| `test`     | テストの追加・修正                                   |
| `chore`    | ビルドプロセスやツールの変更                         |

### scope（任意）

変更対象のモジュールやコンポーネント名
例: `feat(search):`, `fix(crawler):`

### 例

```
feat(search): ベクトル検索機能を追加
fix(tagging): タグ抽出時のnullチェックを修正
docs: README.mdにセットアップ手順を追記
chore: ESLint設定を追加
```

### 緊急時のフックスキップ

緊急時は `--no-verify` フラグでフックをスキップ可能（通常は非推奨）：

```bash
git commit -m "fix: 緊急修正" --no-verify
```
