# Vercel セットアップ手順書

このドキュメントは、recommend-scp プロジェクトを Vercel にデプロイするための手動セットアップ手順を説明します。

## 前提条件

- GitHub アカウントがあること
- Vercel アカウントがあること（GitHub アカウントで登録可能）
- `recommend-scp` リポジトリへのアクセス権限があること
- 以下の環境変数の値を用意していること：
  - Supabase プロジェクトの URL と API キー
  - OpenAI API キー

## 手順

### Step 1: Vercel にログイン

1. [https://vercel.com](https://vercel.com) にアクセス
2. 右上の「Log In」をクリック
3. 「Continue with GitHub」を選択してログイン

### Step 2: 新規プロジェクトを作成

1. Vercel ダッシュボードで「Add New...」→「Project」をクリック
2. 「Import Git Repository」セクションが表示される

### Step 3: GitHub リポジトリを連携

1. 「Import Git Repository」の一覧に `recommend-scp` が表示されていない場合：
   - 「Adjust GitHub App Permissions」をクリック
   - GitHub の設定画面で「Only select repositories」を選択
   - `recommend-scp` リポジトリを追加して「Save」
   - Vercel に戻る

2. `recommend-scp` リポジトリの横にある「Import」をクリック

### Step 4: プロジェクト設定

「Configure Project」画面で以下を設定：

#### 4.1 基本設定

| 項目             | 設定値                            |
| ---------------- | --------------------------------- |
| Project Name     | `recommend-scp`（任意の名前でOK） |
| Framework Preset | `Next.js`（自動検出されるはず）   |
| Root Directory   | `apps/web`                        |

**Root Directory の設定方法:**

1. 「Root Directory」の「Edit」をクリック
2. `apps/web` と入力
3. 「Continue」をクリック

#### 4.2 ビルド設定

「Build and Output Settings」セクションを展開：

| 項目             | 設定値                    | Override |
| ---------------- | ------------------------- | -------- |
| Build Command    | `pnpm --filter web build` | ON       |
| Output Directory | `.next`                   | ON       |
| Install Command  | `pnpm install`            | ON       |

> **Note**: これらの設定は `apps/web/vercel.json` にも定義されていますが、ダッシュボードで明示的に設定することを推奨します。

### Step 5: 環境変数を設定

「Environment Variables」セクションで以下の変数を追加：

#### 5.1 全環境共通（Production + Preview + Development）

| 変数名                      | 値                        | 説明                        |
| --------------------------- | ------------------------- | --------------------------- |
| `NEXT_PUBLIC_API_URL`       | `/api`                    | API エンドポイント          |
| `SUPABASE_URL`              | `https://xxx.supabase.co` | Supabase プロジェクト URL   |
| `SUPABASE_ANON_KEY`         | `eyJ...`                  | Supabase 匿名キー           |
| `SUPABASE_SERVICE_ROLE_KEY` | `eyJ...`                  | Supabase サービスロールキー |
| `OPENAI_API_KEY`            | `sk-...`                  | OpenAI API キー             |

**環境変数の追加方法:**

1. 「Name」フィールドに変数名を入力（例: `SUPABASE_URL`）
2. 「Value」フィールドに値を入力
3. 「Environment」で `Production`、`Preview`、`Development` すべてにチェック
4. 「Add」をクリック
5. 他の変数も同様に追加

#### 5.2 Preview 環境のみ

| 変数名              | 値                   | 説明                     |
| ------------------- | -------------------- | ------------------------ |
| `PREVIEW_AUTH_USER` | `preview`            | ベーシック認証ユーザー名 |
| `PREVIEW_AUTH_PASS` | `<ランダムな文字列>` | ベーシック認証パスワード |

**Preview 環境のみに設定する方法:**

1. 変数名と値を入力
2. 「Environment」で `Preview` のみにチェック（Production と Development のチェックを外す）
3. 「Add」をクリック

> **Tip**: パスワードは `openssl rand -base64 16` などで生成できます。

### Step 6: デプロイを実行

1. 全ての設定が完了したら「Deploy」をクリック
2. ビルドが開始され、進捗がリアルタイムで表示される
3. 数分でデプロイが完了

### Step 7: デプロイ完了を確認

デプロイが成功すると：

1. 「Congratulations!」画面が表示される
2. プロジェクトの URL が発行される（例: `https://recommend-scp.vercel.app`）
3. 「Go to Dashboard」でプロジェクト管理画面へ移動

## 自動デプロイの動作確認

### PR プレビューデプロイ

1. GitHub でブランチを作成し、PR を作成
2. Vercel が自動的にプレビューデプロイを開始
3. デプロイ完了後、PR にプレビュー URL がコメントされる
4. URL 形式: `https://recommend-scp-<hash>-<team>.vercel.app`

### 本番デプロイ

1. PR を `main` ブランチにマージ
2. Vercel が自動的に本番デプロイを開始
3. デプロイ完了後、本番 URL が更新される

## 設定の確認方法

### プロジェクト設定の確認

1. Vercel ダッシュボードでプロジェクトを選択
2. 「Settings」タブをクリック
3. 各セクションで設定を確認：
   - **General**: プロジェクト名、Framework Preset
   - **Build & Development Settings**: ビルドコマンド、Root Directory
   - **Environment Variables**: 環境変数一覧

### GitHub 連携の確認

1. 「Settings」→「Git」セクション
2. 「Connected Git Repository」に `recommend-scp` が表示されていることを確認

## トラブルシューティング

### ビルドエラー: "No Next.js version detected"

**原因**: Root Directory が正しく設定されていない

**解決方法**:

1. Settings → General → Root Directory を確認
2. `apps/web` が設定されていることを確認
3. 再デプロイを実行

### ビルドエラー: "pnpm: command not found"

**原因**: Node.js バージョンが古い

**解決方法**:

1. Settings → General → Node.js Version を確認
2. `20.x` 以上に設定
3. 再デプロイを実行

### ビルドエラー: モジュールが見つからない

**原因**: Install Command が正しく実行されていない

**解決方法**:

1. Settings → Build & Development Settings を確認
2. Install Command が `pnpm install` であることを確認
3. 「Override」がオンになっていることを確認

### 環境変数が読み込まれない

**原因**: 環境変数の設定漏れ、または Environment の選択漏れ

**解決方法**:

1. Settings → Environment Variables を確認
2. 必要な変数がすべて設定されているか確認
3. 各変数の「Environment」列が正しいか確認（Production/Preview/Development）

### PR にプレビュー URL がコメントされない

**原因**: GitHub App の権限不足

**解決方法**:

1. GitHub リポジトリの Settings → Actions → General を開く
2. 「Workflow permissions」で「Read and write permissions」を選択
3. 「Save」をクリック

## 参考リンク

- [Vercel Documentation - Monorepos](https://vercel.com/docs/monorepos)
- [Vercel Documentation - Environment Variables](https://vercel.com/docs/environment-variables)
- [Vercel Documentation - Git Integration](https://vercel.com/docs/git)
- [Vercel Documentation - Project Configuration](https://vercel.com/docs/projects/project-configuration)
