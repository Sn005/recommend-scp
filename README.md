# SCPicks — SCP 記事推薦アプリ

SCP Foundation の記事をあなたの好みに合わせて推薦する Web アプリケーションです。
ハイブリッド推薦エンジン（ベクトル検索 + タグマッチング）により、読みたい SCP にいつでも出会えます。

## 主な機能

- 無限スクロール形式の記事推薦（80% 好み / 20% セレンディピティ）
- SCP Wiki 原作テーマを再現した記事表示
- オンボーディングによる初期プロファイル構築
- お気に入り管理・閲覧履歴
- PWA 対応（ホーム画面に追加可能）

## 技術スタック

| レイヤー       | 技術                             |
| -------------- | -------------------------------- |
| フロントエンド | Next.js 16 (App Router)          |
| バックエンド   | Hono (Vercel Functions)          |
| DB             | Supabase (PostgreSQL + pgvector) |
| キャッシュ     | Upstash Redis                    |
| LLM            | OpenAI (Embedding + タグ抽出)    |
| モノレポ       | Turborepo + pnpm                 |
| テスト         | Vitest + Playwright              |
| CI/CD          | GitHub Actions + Vercel          |

## リポジトリ構成

```
apps/
  web/           # Next.js フロントエンド
  api-server/    # Hono API サーバー
packages/
  shared/        # 共通基盤（型定義・Embedding・検索）
  pipeline/      # データパイプライン（クローラー・バッチ処理）
  api-types/     # API 型定義（共有）
  poc/           # PoC 検証スクリプト
supabase/
  migrations/    # DB マイグレーション
```

## セットアップ

### 前提条件

- Node.js 20+
- pnpm 10+
- Supabase プロジェクト（ローカル or クラウド）
- OpenAI API キー

### 手順

```bash
# 1. リポジトリをクローン
git clone https://github.com/Sn005/recommend-scp.git
cd recommend-scp

# 2. 依存関係をインストール
pnpm install

# 3. 環境変数を設定
cp .env.example .env
# .env を編集して実際の値を設定

# 4. 開発サーバーを起動
pnpm dev
```

## 開発コマンド

| コマンド             | 説明                   |
| -------------------- | ---------------------- |
| `pnpm dev`           | 全アプリの開発サーバー |
| `pnpm build`         | 全アプリのビルド       |
| `pnpm test`          | 全パッケージのテスト   |
| `pnpm test:coverage` | カバレッジ付きテスト   |
| `pnpm lint`          | ESLint 実行            |
| `pnpm format`        | Prettier フォーマット  |
| `pnpm format:check`  | フォーマットチェック   |
| `pnpm type-check`    | TypeScript 型チェック  |

## ドキュメント

詳細なドキュメントは [docs/README.md](docs/README.md) を参照してください。

## ライセンス

SCP Foundation のコンテンツは CC BY-SA 3.0 ライセンスに基づきます。
