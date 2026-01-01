# Subtask-001-02-01: SCP Data APIクローラー実装

## 概要

SCP Data APIから記事データを取得し、ローカル保存およびSupabaseへの保存を行う。

## ユーザーストーリー

**As a** 開発者
**I want** SCP Data APIから記事を取得するスクリプトを実行する
**So that** PoC用の記事データを準備できる

## Acceptance Criteria（EARS記法）

### API接続

- [ ] WHEN 開発者がクローラースクリプトを実行した際
      GIVEN SCP Data API (https://scp-data.tedivm.com/) が正常に応答する場合
      THEN 指定した件数（デフォルト10件）の記事データを取得する
      AND 取得結果をコンソールに出力する

### データ構造

- [ ] WHEN 取得データを確認した際
      GIVEN データが正常に取得できた場合
      THEN 各記事に以下のフィールドが含まれる：
      - id: 記事ID（例: "SCP-173"）
      - title: 記事タイトル
      - content: 記事本文（HTML or テキスト）
      - rating: 評価スコア

- [ ] WHEN 記事本文を確認した際
      GIVEN コンテンツが取得できた場合
      THEN 本文が500文字以上であること
      AND HTMLタグが適切に処理されていること（プレーンテキスト化 or 保持）

### ローカル保存

- [ ] WHEN クローラーが正常完了した際
      GIVEN データ取得に成功した場合
      THEN `packages/poc/data/raw/` に JSON ファイルとして保存される
      AND ファイル名が `scp-articles-{timestamp}.json` 形式である

### Supabase保存

- [ ] WHEN クローラーが正常完了した際
      GIVEN Supabase接続が有効な場合
      THEN scp_articlesテーブルに全記事がupsertされる
      AND 重複実行時に既存データが更新される

### エラーハンドリング

- [ ] WHEN API接続に失敗した際
      GIVEN ネットワークエラーが発生した場合
      THEN 適切なエラーメッセージを出力する
      AND リトライオプションを提示する

## 設計

### SCP Data API エンドポイント

```
Base URL: https://scp-data.tedivm.com/

# メタデータ取得
GET /data/scp/items.json     # 全SCPアイテムのメタデータ

# 個別記事取得
GET /data/scp/items/{id}.json  # 例: /data/scp/items/173.json
```

### 取得対象（PoC用）

- 人気記事上位10〜50件を対象
- rating が高い順にソート
- EN（英語版）のみ

### インターフェース

```typescript
// src/crawler/fetch-scp.ts

export interface ScpArticleRaw {
  id: string;          // "SCP-173"
  title: string;
  content: string;
  rating: number;
}

export interface CrawlerOptions {
  limit: number;       // 取得件数 (default: 10)
  saveLocal: boolean;  // ローカル保存 (default: true)
  saveDb: boolean;     // Supabase保存 (default: true)
}

export async function fetchScpArticles(
  options?: Partial<CrawlerOptions>
): Promise<ScpArticleRaw[]>;
```

### スクリプト実行

```bash
# 10件取得（デフォルト）
pnpm --filter poc run:01-fetch

# 50件取得
pnpm --filter poc run:01-fetch -- --limit 50

# ローカル保存のみ（DB保存しない）
pnpm --filter poc run:01-fetch -- --no-db
```

## テストケース

- [ ] APIから10件以上の記事が取得できる
- [ ] 取得データに必要なフィールドが全て含まれる
- [ ] JSONファイルがdata/raw/に保存される
- [ ] Supabaseのscp_articlesテーブルにデータが挿入される
- [ ] 2回実行してもデータが重複しない（upsert動作）
