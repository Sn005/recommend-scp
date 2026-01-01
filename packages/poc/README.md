# SCP Recommend PoC

技術検証（PoC）用パッケージ。SCP記事のベクトル検索・レコメンドシステムを実装します。

## セットアップ

### 1. 依存関係のインストール

```bash
pnpm install
```

### 2. 環境変数の設定

```bash
cp packages/poc/.env.example packages/poc/.env
```

`.env` ファイルを編集して、必要なAPIキーを設定します。

---

## OpenAI API 登録手順

Embedding生成に OpenAI API を使用します。

### Step 1: OpenAIアカウント作成

1. [OpenAI Platform](https://platform.openai.com/) にアクセス
2. 「Sign up」をクリック
3. メールアドレスまたはGoogle/Microsoft/Appleアカウントで登録
4. 電話番号認証を完了

### Step 2: APIキー発行

1. ログイン後、右上のアイコン → 「API keys」を選択
   - または直接: https://platform.openai.com/api-keys
2. 「Create new secret key」をクリック
3. 名前を入力（例: `recommend-scp-poc`）
4. 「Create secret key」をクリック
5. **表示されたキー（`sk-...`）をコピー** （この画面を閉じると二度と表示されません）

### Step 3: 支払い設定（必須）

OpenAI APIは従量課金制です。クレジットカードの登録が必要です。

1. https://platform.openai.com/settings/organization/billing/overview にアクセス
2. 「Add payment method」でクレジットカードを登録
3. 「Add to credit balance」でクレジットを追加（最低$5〜）

**料金目安:**
- text-embedding-3-small: **$0.02 / 1Mトークン**
- 10記事のEmbedding生成: 約 $0.001 以下

### Step 4: 環境変数に設定

```bash
# packages/poc/.env
OPENAI_API_KEY=sk-xxxxxxxxxxxxxxxxxxxx
```

### Step 5: 動作確認

```bash
# ドライラン（API呼び出しなし、トークン数推定のみ）
pnpm --filter poc run:02-embed -- --dry-run

# 実際にEmbedding生成
pnpm --filter poc run:02-embed
```

---

## Supabase セットアップ

### Step 1: Supabaseプロジェクト作成

1. [Supabase](https://supabase.com/) にアクセス
2. 「Start your project」→ GitHubアカウントでログイン
3. 「New project」をクリック
4. プロジェクト名: `recommend-scp-poc`
5. データベースパスワードを設定（メモしておく）
6. リージョン: `Northeast Asia (Tokyo)` 推奨
7. 「Create new project」をクリック

### Step 2: pgvector拡張有効化

1. Supabaseダッシュボード → SQL Editor
2. 以下のSQLを実行:

```sql
CREATE EXTENSION IF NOT EXISTS vector;
```

### Step 3: スキーマ作成

`supabase/migrations/20241231000000_poc_schema.sql` の内容をSQL Editorで実行。

### Step 4: APIキー取得

1. Supabaseダッシュボード → Settings → API
2. 以下をコピー:
   - **Project URL**: `https://xxx.supabase.co`
   - **anon public**: `eyJ...`
   - **service_role**: `eyJ...`（バッチ処理用）

### Step 5: 環境変数に設定

```bash
# packages/poc/.env
SUPABASE_URL=https://xxx.supabase.co
SUPABASE_ANON_KEY=eyJ...
SUPABASE_SERVICE_ROLE_KEY=eyJ...
```

---

## スクリプト一覧

| スクリプト | 説明 |
|-----------|------|
| `run:01-fetch` | SCP Data APIから記事を取得 |
| `run:02-embed` | OpenAI Embeddingを生成 |
| `run:03-tag` | LLMでタグを抽出 |
| `run:04-search` | ベクトル検索を実行 |
| `run:05-report` | 検証レポートを生成 |

### 使用例

```bash
# 記事取得（10件）
pnpm --filter poc run:01-fetch

# Embedding生成（ドライラン）
pnpm --filter poc run:02-embed -- --dry-run

# Embedding生成（実行）
pnpm --filter poc run:02-embed

# 特定記事のみ
pnpm --filter poc run:02-embed -- --id SCP-173
```

---

## トラブルシューティング

### `OPENAI_API_KEY is not set`

`.env` ファイルが存在し、`OPENAI_API_KEY` が設定されているか確認。

### `429 Too Many Requests`

レート制限に達しました。スクリプトは自動的にリトライしますが、頻発する場合は待機時間を増やしてください。

### `insufficient_quota`

OpenAIアカウントのクレジット残高を確認し、必要に応じて追加してください。
