# パイプライン環境変数設定手順

データパイプライン（Story-003-02〜003-04）の実行に必要な環境変数の設定手順です。

## 目次

- [必要な環境変数一覧](#必要な環境変数一覧)
- [Subtask別の必須環境変数](#subtask別の必須環境変数)
- [環境変数の取得方法（詳細）](#環境変数の取得方法詳細)
- [設定手順](#設定手順)
- [バッチ実行方法](#バッチ実行方法)
- [トラブルシューティング](#トラブルシューティング)

---

## 必要な環境変数一覧

### コア環境変数（全Subtask共通）

| 変数名                      | 必須 | 用途                               | 取得先             |
| --------------------------- | ---- | ---------------------------------- | ------------------ |
| `SUPABASE_URL`              | ✅   | SupabaseプロジェクトURL            | Supabase Dashboard |
| `SUPABASE_ANON_KEY`         | ✅   | Supabase匿名キー（公開可）         | Supabase Dashboard |
| `SUPABASE_SERVICE_ROLE_KEY` | ✅   | Supabaseサービスロールキー（秘密） | Supabase Dashboard |
| `OPENAI_API_KEY`            | ✅   | OpenAI API（Embedding/タグ抽出）   | OpenAI Dashboard   |

### メール通知用環境変数（003-04-02/03で必要）

| 変数名          | 必須 | 用途                 | 取得先                          |
| --------------- | ---- | -------------------- | ------------------------------- |
| `MAIL_SERVER`   | ✅   | SMTPサーバーアドレス | `smtp.gmail.com`（Gmail使用時） |
| `MAIL_PORT`     | ⚠️   | SMTPポート番号       | `587`（TLS）または `465`（SSL） |
| `MAIL_USERNAME` | ✅   | SMTPユーザー名       | Gmailアドレス                   |
| `MAIL_PASSWORD` | ✅   | SMTPパスワード       | **Googleアプリパスワード**      |
| `NOTIFY_EMAIL`  | ✅   | 通知先メールアドレス | 任意のメールアドレス            |

> ⚠️ **重要**: Gmailの通常パスワードは使用できません。**アプリパスワード**の発行が必要です。

---

## Subtask別の必須環境変数

| Subtask       | 説明                   | 必要な環境変数                  |
| ------------- | ---------------------- | ------------------------------- |
| **003-02-02** | EN全記事クローラー     | `SUPABASE_*`, `OPENAI_API_KEY`  |
| **003-02-03** | 差分更新クローラー     | `SUPABASE_*`, `OPENAI_API_KEY`  |
| **003-03-01** | バッチEmbedding        | `SUPABASE_*`, `OPENAI_API_KEY`  |
| **003-03-03** | タグ抽出               | `SUPABASE_*`, `OPENAI_API_KEY`  |
| **003-04-01** | オーケストレーター     | `SUPABASE_*`, `OPENAI_API_KEY`  |
| **003-04-02** | GitHub Actions定期実行 | 全環境変数（コア + メール通知） |
| **003-04-03** | 通知・リトライ機能     | 全環境変数（コア + メール通知） |

---

## 環境変数の取得方法（詳細）

### 1. Supabase関連

#### 手順

1. **[Supabase Dashboard](https://supabase.com/dashboard)** にアクセス
2. Googleアカウントまたはメールでログイン
3. 対象プロジェクトをクリック

4. **左サイドバー** → **Project Settings**（歯車アイコン）をクリック

5. **API** タブをクリック

6. **Project URL** セクション:

   ```
   ┌─────────────────────────────────────────────────┐
   │ Project URL                                     │
   │ https://xxxxxxxxxxxx.supabase.co    [Copy]      │
   └─────────────────────────────────────────────────┘
   ```

   → この値を `SUPABASE_URL` に設定

7. **Project API keys** セクション:

   ```
   ┌─────────────────────────────────────────────────┐
   │ anon public                                     │
   │ eyJhbGciOiJIUzI1NiIsInR...         [Copy]       │
   │                                                 │
   │ ⚠️ This key is safe to use in a browser...     │
   └─────────────────────────────────────────────────┘
   ```

   → この値を `SUPABASE_ANON_KEY` に設定

   ```
   ┌─────────────────────────────────────────────────┐
   │ service_role secret                 [Reveal]    │
   │ eyJhbGciOiJIUzI1NiIsInR...         [Copy]       │
   │                                                 │
   │ ⚠️ This key has the ability to bypass RLS...   │
   └─────────────────────────────────────────────────┘
   ```

   → **[Reveal]** をクリックして表示し、`SUPABASE_SERVICE_ROLE_KEY` に設定

> ⚠️ **セキュリティ注意**: `service_role` キーはRLSをバイパスできる強力なキーです。
>
> - 絶対に公開リポジトリにコミットしない
> - クライアントサイドのコードに含めない
> - GitHub Secretsなど安全な場所に保管

---

### 2. OpenAI API Key

#### 手順

1. **[OpenAI Platform](https://platform.openai.com/)** にアクセス

2. 右上の **Log in** をクリックしてログイン（Googleアカウント可）

3. ログイン後、右上のアカウントアイコン → **View API keys** をクリック
   - または直接 **[API Keys](https://platform.openai.com/api-keys)** にアクセス

4. **API keys** ページ:

   ```
   ┌─────────────────────────────────────────────────┐
   │ API keys                                        │
   │                                                 │
   │ [+ Create new secret key]                       │
   │                                                 │
   │ NAME           CREATED        LAST USED         │
   │ ─────────────────────────────────────────────── │
   │ my-key         Jan 15, 2025   Jan 15, 2025     │
   └─────────────────────────────────────────────────┘
   ```

5. **[+ Create new secret key]** をクリック

6. ダイアログで名前を入力（例: `recommend-scp-pipeline`）:

   ```
   ┌─────────────────────────────────────────────────┐
   │ Create new secret key                           │
   │                                                 │
   │ Name (optional)                                 │
   │ [recommend-scp-pipeline                    ]    │
   │                                                 │
   │ Permissions: [All ▼]                            │
   │                                                 │
   │            [Cancel]  [Create secret key]        │
   └─────────────────────────────────────────────────┘
   ```

7. **[Create secret key]** をクリック

8. 表示されたキーをコピー:
   ```
   ┌─────────────────────────────────────────────────┐
   │ Save your key                                   │
   │                                                 │
   │ Please save this secret key somewhere safe.     │
   │ You won't be able to view it again.            │
   │                                                 │
   │ sk-proj-xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx  [Copy]│
   │                                                 │
   │                              [Done]             │
   └─────────────────────────────────────────────────┘
   ```
   → この値を `OPENAI_API_KEY` に設定

> ⚠️ **注意**: キーは一度しか表示されません。必ずコピーして安全な場所に保管してください。

---

### 3. Gmail SMTP設定（メール通知用）

Gmailを使用してメール通知を送信するには、**Googleアプリパスワード**の発行が必要です。

#### 前提条件

- Googleアカウントで **2段階認証が有効** になっていること

#### 2段階認証の有効化手順（未設定の場合）

1. **[Googleアカウント](https://myaccount.google.com/)** にアクセス

2. 左サイドバー → **セキュリティ** をクリック

3. **「Googleにログインする方法」** セクション:

   ```
   ┌─────────────────────────────────────────────────┐
   │ Google にログインする方法                        │
   │                                                 │
   │ 2段階認証プロセス                               │
   │ オフ                                    [>]     │
   └─────────────────────────────────────────────────┘
   ```

4. **2段階認証プロセス** をクリック

5. **[使ってみる]** をクリック

6. 電話番号を入力し、SMSまたは音声通話で確認コードを受け取る

7. 確認コードを入力して **[有効にする]** をクリック

#### アプリパスワードの発行手順

1. **[Googleアカウント](https://myaccount.google.com/)** にアクセス

2. 左サイドバー → **セキュリティ** をクリック

3. **「Googleにログインする方法」** セクションで **2段階認証プロセス** をクリック

   ```
   ┌─────────────────────────────────────────────────┐
   │ 2段階認証プロセス                               │
   │ オン（2024/01/01 から）                  [>]    │
   └─────────────────────────────────────────────────┘
   ```

4. ページ下部にスクロールし、**アプリパスワード** をクリック

   ```
   ┌─────────────────────────────────────────────────┐
   │ アプリ パスワード                               │
   │ アプリ固有のパスワードを管理します       [>]    │
   └─────────────────────────────────────────────────┘
   ```

   - または直接 **[アプリパスワード](https://myaccount.google.com/apppasswords)** にアクセス

5. **アプリを選択** で名前を入力（例: `SCP Pipeline`）:

   ```
   ┌─────────────────────────────────────────────────┐
   │ アプリ パスワード                               │
   │                                                 │
   │ アプリ名                                        │
   │ [SCP Pipeline                             ]     │
   │                                                 │
   │                              [作成]             │
   └─────────────────────────────────────────────────┘
   ```

6. **[作成]** をクリック

7. 16文字のアプリパスワードが表示される:
   ```
   ┌─────────────────────────────────────────────────┐
   │ 生成されたアプリ パスワード                      │
   │                                                 │
   │     abcd efgh ijkl mnop                         │
   │                                                 │
   │ このパスワードは一度しか表示されません。         │
   │ コピーして安全な場所に保存してください。         │
   │                                                 │
   │                              [完了]             │
   └─────────────────────────────────────────────────┘
   ```
   → **スペースを除いた16文字**（`abcdefghijklmnop`）を `MAIL_PASSWORD` に設定

#### Gmail SMTP設定値

| 変数名          | 値                                                  |
| --------------- | --------------------------------------------------- |
| `MAIL_SERVER`   | `smtp.gmail.com`                                    |
| `MAIL_PORT`     | `587`（TLS）または `465`（SSL）                     |
| `MAIL_USERNAME` | あなたのGmailアドレス（例: `your-email@gmail.com`） |
| `MAIL_PASSWORD` | 発行したアプリパスワード（16文字、スペースなし）    |
| `NOTIFY_EMAIL`  | 通知を受け取るメールアドレス                        |

---

## 設定手順

### ローカル開発環境

1. `packages/pipeline/` ディレクトリに `.env` ファイルを作成:

```bash
cd packages/pipeline
cp .env.example .env
```

2. `.env` ファイルを編集して実際の値を設定:

```bash
# ===========================================
# Supabase
# ===========================================
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...

# ===========================================
# OpenAI
# ===========================================
OPENAI_API_KEY=sk-proj-...

# ===========================================
# メール通知（003-04で必要）
# ===========================================
MAIL_SERVER=smtp.gmail.com
MAIL_PORT=587
MAIL_USERNAME=your-email@gmail.com
MAIL_PASSWORD=abcdefghijklmnop
NOTIFY_EMAIL=notify@example.com
```

### CI/CD環境（GitHub Actions）

GitHub Actionsで実行する場合、リポジトリのSecretsに設定します。

#### 設定手順

1. GitHubリポジトリページを開く

2. **Settings** タブをクリック

3. 左サイドバー → **Secrets and variables** → **Actions** をクリック

   ```
   ┌─────────────────────────────────────────────────┐
   │ Actions secrets and variables                   │
   │                                                 │
   │ [Secrets] [Variables]                           │
   │                                                 │
   │ Repository secrets                              │
   │ [New repository secret]                         │
   │                                                 │
   │ NAME                    UPDATED                 │
   │ ─────────────────────────────────────────────── │
   │ (no secrets yet)                                │
   └─────────────────────────────────────────────────┘
   ```

4. **[New repository secret]** をクリック

5. 以下のSecretを追加:

| Secret名                    | 値                         |
| --------------------------- | -------------------------- |
| `SUPABASE_URL`              | SupabaseプロジェクトURL    |
| `SUPABASE_ANON_KEY`         | Supabase匿名キー           |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabaseサービスロールキー |
| `OPENAI_API_KEY`            | OpenAI APIキー             |
| `MAIL_SERVER`               | `smtp.gmail.com`           |
| `MAIL_USERNAME`             | Gmailアドレス              |
| `MAIL_PASSWORD`             | Googleアプリパスワード     |
| `NOTIFY_EMAIL`              | 通知先メールアドレス       |

#### ワークフローYAMLでの参照例

```yaml
env:
  SUPABASE_URL: ${{ secrets.SUPABASE_URL }}
  SUPABASE_ANON_KEY: ${{ secrets.SUPABASE_ANON_KEY }}
  SUPABASE_SERVICE_ROLE_KEY: ${{ secrets.SUPABASE_SERVICE_ROLE_KEY }}
  OPENAI_API_KEY: ${{ secrets.OPENAI_API_KEY }}
  MAIL_SERVER: ${{ secrets.MAIL_SERVER }}
  MAIL_USERNAME: ${{ secrets.MAIL_USERNAME }}
  MAIL_PASSWORD: ${{ secrets.MAIL_PASSWORD }}
  NOTIFY_EMAIL: ${{ secrets.NOTIFY_EMAIL }}
```

---

## バッチ実行方法

### 現在の実装状況

003-02-02で実装されたクローラーは `FullCrawler` クラスとして提供されています。
バッチ実行スクリプトは 003-04（オーケストレーション）で実装予定です。

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

---

## トラブルシューティング

### エラー: "SUPABASE_URL is not set"

**原因**: `.env` ファイルが読み込まれていない、または変数が未設定

**解決策**:

1. `.env` ファイルが `packages/pipeline/` に存在するか確認
2. 変数名にタイポがないか確認
3. dotenvが正しくインポートされているか確認

### エラー: "OPENAI_API_KEY is not set"

**原因**: sharedパッケージのenv.tsが検証時に必須としている

**解決策**:

- クローラーのみ使用する場合でも、OpenAI APIキーの設定が必要

### エラー: 429 Rate Limit

**原因**: SCP Data APIのレート制限

**解決策**:

- クローラーは自動的にリトライを行います
- `Retry-After` ヘッダーに従って待機します
- 頻繁に発生する場合は `batchDelayMs` を増加させてください

### エラー: "Authentication failed" (Gmail SMTP)

**原因**: 通常のGmailパスワードを使用している、または2段階認証が無効

**解決策**:

1. Googleアカウントで2段階認証を有効にする
2. アプリパスワードを発行する（上記手順参照）
3. `MAIL_PASSWORD` にアプリパスワード（16文字、スペースなし）を設定

### エラー: "Invalid credentials" (Gmail SMTP)

**原因**: アプリパスワードが正しく設定されていない

**解決策**:

1. アプリパスワードにスペースが含まれていないか確認
2. 新しいアプリパスワードを再発行して試す

---

## 関連ドキュメント

- [003-02-02 EN全記事クローラー仕様](../../../specs/003-data-pipeline/003-02-crawler/003-02-02-en-full-crawler.md)
- [003-04 オーケストレーション仕様](../../../specs/003-data-pipeline/003-04-orchestration/)
- [003-04-02 GitHub Actions定期実行](../../../specs/003-data-pipeline/003-04-orchestration/003-04-02-github-actions.md)
- [003-04-03 通知・リトライ機能](../../../specs/003-data-pipeline/003-04-orchestration/003-04-03-notification-retry.md)
