# Upstash Redis 環境変数設定手順

## 概要

記事表示速度改善のため、Upstash Redis によるキャッシュレイヤーを導入しています。
この手順書では、各環境での Redis 接続情報の設定方法を説明します。

**キャッシュ対象:**

- `wiki-proxy` の HTML レスポンス（TTL: 1 時間）
- `articles/content` の記事メタ情報（TTL: 1 時間）

**未設定時の動作:** Redis が未設定でもアプリケーションは正常に動作します（graceful degradation）。キャッシュが無効になるだけで、既存の外部 fetch が毎回実行されます。

---

## 1. Upstash アカウント作成・Redis データベース作成

1. [Upstash Console](https://console.upstash.com/) にアクセス
2. アカウントを作成（GitHub/Google 連携可）
3. 「Create Database」をクリック
4. 設定:
   - **Name**: `recommend-scp`（任意）
   - **Region**: `ap-northeast-1`（東京）推奨
   - **Type**: Regional
5. 「Create」をクリック

## 2. 接続情報の取得

データベース作成後、Details ページで以下を確認:

- **UPSTASH_REDIS_REST_URL**: `https://xxxx.upstash.io` 形式
- **UPSTASH_REDIS_REST_TOKEN**: `AXxx...` 形式

## 3. 環境別の設定

### 3.1 ローカル開発環境

ルートの `.env` ファイルに追記:

```bash
# Upstash Redis（オプション）
UPSTASH_REDIS_REST_URL=https://your-redis.upstash.io
UPSTASH_REDIS_REST_TOKEN=AXxxxxxxxxxxxxxxxxxxxxxxxxxxxx
```

**確認方法:**

```bash
pnpm -F @recommend-scp/api-server dev
# ログに Redis 関連のエラーが出なければ OK
```

### 3.2 Vercel 環境（本番 + Preview）

1. Vercel Dashboard にアクセス
2. プロジェクト > Settings > Environment Variables
3. 以下を追加:

| Key                        | Value                   | Environment          |
| -------------------------- | ----------------------- | -------------------- |
| `UPSTASH_REDIS_REST_URL`   | `https://your-redis...` | Production + Preview |
| `UPSTASH_REDIS_REST_TOKEN` | `AXxx...`               | Production + Preview |

4. 「Save」をクリック
5. 再デプロイを実行

**Vercel Upstash Integration を使用する場合:**

Vercel Marketplace から Upstash Integration を追加すると、環境変数が自動設定されます。

### 3.3 CI 環境（GitHub Actions）

**GitHub Secrets への追加は不要です。**

テストでは `vi.mock()` で Redis クライアントをモック化しているため、実際の Redis 接続は不要です。

## 4. Free Tier 制約

| 項目            | Free Tier 上限 | 想定使用量          |
| --------------- | -------------- | ------------------- |
| Commands/day    | 10,000         | 数百〜数千（十分）  |
| Storage         | 256MB          | 記事数 x 100KB 程度 |
| Max connections | 制限なし       | REST API のため不要 |

記事 HTML は 50-200KB、content メタ情報は ~200B。TTL 1 時間で自動 eviction されるため、ストレージ圧迫の心配はありません。

## 5. トラブルシューティング

### Redis 接続エラーが発生する

```
Redisキャッシュ取得エラー: ...
```

- 環境変数が正しく設定されているか確認
- Upstash Console でデータベースがアクティブか確認
- REST URL が `https://` で始まっているか確認

### キャッシュが効かない

- `UPSTASH_REDIS_REST_URL` と `UPSTASH_REDIS_REST_TOKEN` の両方が設定されているか確認
- 片方でも未設定だと Redis クライアントが `null` になり、キャッシュが無効化されます

### ローカルで Redis なしで開発したい

`.env` から `UPSTASH_REDIS_REST_URL` と `UPSTASH_REDIS_REST_TOKEN` を削除またはコメントアウトするだけで OK です。アプリケーションは Redis なしで正常に動作します。
