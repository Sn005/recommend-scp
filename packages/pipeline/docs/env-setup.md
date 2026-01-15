# EN全記事クローラー環境変数設定手順

003-02-02 EN全記事クローラーのバッチ実行に必要な環境変数の設定手順です。

## 必要な環境変数一覧

| 変数名 | 必須 | 用途 | 取得先 |
|--------|------|------|--------|
| `SUPABASE_URL` | ✅ | SupabaseプロジェクトURL | Supabase Dashboard |
| `SUPABASE_ANON_KEY` | ✅ | Supabase匿名キー（公開可） | Supabase Dashboard |
| `SUPABASE_SERVICE_ROLE_KEY` | ✅ | Supabaseサービスロールキー（秘密） | Supabase Dashboard |
| `OPENAI_API_KEY` | ⚠️ | OpenAI API（sharedパッケージで必須） | OpenAI Dashboard |

> **注意**: クローラー自体はSCP Data API（公開API）を使用するため、外部APIキーは不要です。
> ただし、`@recommend-scp/shared` パッケージの `env.ts` が `OPENAI_API_KEY` を必須としているため、
> バッチ実行時にも設定が必要です。

## 環境変数の取得方法

### 1. Supabase関連（SUPABASE_URL / SUPABASE_ANON_KEY / SUPABASE_SERVICE_ROLE_KEY）

1. [Supabase Dashboard](https://supabase.com/dashboard) にログイン
2. 対象プロジェクトを選択
3. **Settings > API** に移動
4. 以下の値をコピー:
   - **Project URL** → `SUPABASE_URL`
   - **anon public** → `SUPABASE_ANON_KEY`
   - **service_role secret** → `SUPABASE_SERVICE_ROLE_KEY`

> ⚠️ **セキュリティ注意**: `SUPABASE_SERVICE_ROLE_KEY` はRLS（Row Level Security）をバイパスできる強力なキーです。
> 絶対に公開リポジトリにコミットしないでください。

### 2. OpenAI API Key（OPENAI_API_KEY）

1. [OpenAI Dashboard](https://platform.openai.com/api-keys) にログイン
2. **Create new secret key** をクリック
3. 生成されたキーをコピー

## 設定手順

### ローカル開発環境

1. `packages/pipeline/` ディレクトリに `.env` ファイルを作成:

```bash
cd packages/pipeline
cp ../poc/.env.example .env
```

2. `.env` ファイルを編集して実際の値を設定:

```bash
# Supabase
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...

# OpenAI
OPENAI_API_KEY=sk-...
```

### CI/CD環境（GitHub Actions）

GitHub Actionsで実行する場合、リポジトリのSecretsに設定します:

1. リポジトリの **Settings > Secrets and variables > Actions** に移動
2. **New repository secret** で以下を追加:
   - `SUPABASE_URL`
   - `SUPABASE_ANON_KEY`
   - `SUPABASE_SERVICE_ROLE_KEY`
   - `OPENAI_API_KEY`

ワークフローYAMLでの参照例:

```yaml
env:
  SUPABASE_URL: ${{ secrets.SUPABASE_URL }}
  SUPABASE_ANON_KEY: ${{ secrets.SUPABASE_ANON_KEY }}
  SUPABASE_SERVICE_ROLE_KEY: ${{ secrets.SUPABASE_SERVICE_ROLE_KEY }}
  OPENAI_API_KEY: ${{ secrets.OPENAI_API_KEY }}
```

## バッチ実行方法

### 現在の実装状況

003-02-02で実装されたクローラーは `FullCrawler` クラスとして提供されています。
バッチ実行スクリプトは今後 003-04（オーケストレーション）で実装予定です。

### 動作確認用コード（TypeScript）

```typescript
import { createClient } from "@supabase/supabase-js";
import { FullCrawler } from "@recommend-scp/pipeline/src/crawler/full-crawler";

// 環境変数読み込み
import "@recommend-scp/shared/lib/env";
import { env } from "@recommend-scp/shared/lib/env";

const supabase = createClient(env.SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY);

const crawler = new FullCrawler({
  supabaseClient: supabase,
  dryRun: false, // true: DBに保存しない（テスト用）
  onProgress: (progress) => {
    console.log(`進捗: ${progress.current}/${progress.total}`);
  },
});

await crawler.runFullCrawl();
```

### ドライランモード（DB保存なし）

```typescript
const crawler = new FullCrawler({
  dryRun: true, // DBに保存しない
});

await crawler.runFullCrawl();
```

## トラブルシューティング

### エラー: "SUPABASE_URL is not set"

**原因**: `.env` ファイルが読み込まれていない、または変数が未設定

**解決策**:
1. `.env` ファイルが `packages/pipeline/` または `packages/shared/` に存在するか確認
2. 変数名にタイポがないか確認
3. dotenvが正しくインポートされているか確認

### エラー: "OPENAI_API_KEY is not set"

**原因**: sharedパッケージのenv.tsが検証時に必須としている

**解決策**:
- クローラーのみ使用する場合でも、OpenAI APIキーの設定が必要
- 将来的に、クローラー専用の環境変数検証を分離することを検討

### エラー: 429 Rate Limit

**原因**: SCP Data APIのレート制限

**解決策**:
- クローラーは自動的にリトライを行います
- `Retry-After` ヘッダーに従って待機します
- 頻繁に発生する場合は `batchDelayMs` を増加させてください

## 関連ドキュメント

- [003-02-02 EN全記事クローラー仕様](../../../specs/003-data-pipeline/003-02-crawler/003-02-02-en-full-crawler.md)
- [003-04 オーケストレーション仕様](../../../specs/003-data-pipeline/003-04-orchestration/)
