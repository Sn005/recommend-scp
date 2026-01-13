# Subtask-003-02-02: EN全記事クローラー

## 概要

SCP Data APIを使用してEN全記事（series-1〜8+）を取得するクローラーを実装する。
レート制限対応、チェックポイント機能、エラーハンドリングを含む。

## ユーザーストーリー

**As a** 開発者
**I want** EN全記事を効率的にクロールする
**So that** 7000+件のSCP記事をデータベースに保存できる

## Acceptance Criteria（EARS記法）

### 記事一覧取得

- [ ] WHEN フルクロールを実行した際
      GIVEN SCP Data APIが正常に応答する場合
      THEN series-1 から series-8+ までの全記事一覧を取得する
      AND 各記事の id, title, url, series を含む

- [ ] WHEN 記事一覧を取得した際
      GIVEN APIレスポンスがある場合
      THEN 記事数が6000件以上あることを確認する
      AND 重複記事がないことを確認する

### 記事本文取得

- [ ] WHEN 記事本文を取得した際
      GIVEN 記事IDが指定された場合
      THEN 記事のタイトル、本文、評価、タグを取得する
      AND 取得日時を記録する

- [ ] WHEN 本文取得時にエラーが発生した際
      GIVEN ネットワークエラーまたは404の場合
      THEN エクスポネンシャルバックオフでリトライする（最大3回）
      AND リトライ失敗時はエラーログを出力して次の記事へ進む

### レート制限対応

- [ ] WHILE 大量のAPI呼び出しを行う際
      THE SYSTEM SHALL 各リクエスト間に適切な遅延を挿入する
      AND バッチ単位（10件）ごとに1秒の遅延を設ける

- [ ] WHEN レート制限エラー（429）を受信した際
      GIVEN Retry-Afterヘッダーがある場合
      THEN 指定された秒数待機してからリトライする

### チェックポイント

- [ ] WHILE クロール処理が実行中
      THE SYSTEM SHALL 100件ごとにチェックポイントを保存する
      AND 最後に処理した記事IDと処理件数を記録する

- [ ] WHEN クロールを再開する際
      GIVEN チェックポイントが存在する場合
      THEN チェックポイント以降の記事から処理を再開する

### DB保存

- [ ] WHEN 記事を保存した際
      GIVEN 正常に取得できた場合
      THEN `scp_articles` テーブルに保存する
      AND `lang: 'en'` を設定する
      AND `embedding_status: 'pending'` を設定する
      AND `tagging_status: 'pending'` を設定する

## 設計

### EnglishCrawler 実装

```typescript
// packages/poc/src/crawler/english-crawler.ts

import { BranchCrawler, ArticleIndex, ArticleContent } from "./types";

const SCP_DATA_API_BASE = "https://api.crom.avn.sh";
const BATCH_SIZE = 10;
const BATCH_DELAY_MS = 1000;
const MAX_RETRIES = 3;

export class EnglishCrawler implements BranchCrawler {
  readonly lang = "en";
  readonly crawlerType = "api" as const;

  async fetchArticleList(): Promise<ArticleIndex[]> {
    const series = [
      "series-1",
      "series-2",
      "series-3",
      "series-4",
      "series-5",
      "series-6",
      "series-7",
      "series-8",
    ];
    const articles: ArticleIndex[] = [];

    for (const s of series) {
      const seriesArticles = await this.fetchSeriesArticles(s);
      articles.push(...seriesArticles);
    }

    return articles;
  }

  async fetchArticleContent(id: string): Promise<ArticleContent> {
    // SCP Data API呼び出し
  }

  async getLastModified(id: string): Promise<Date | null> {
    // 更新日時を取得
  }
}
```

### クロールオプション

```typescript
export interface FullCrawlOptions {
  resumeFromCheckpoint?: string; // チェックポイントID
  series?: string[]; // 対象シリーズ（デフォルト: 全シリーズ）
  batchSize?: number; // バッチサイズ（デフォルト: 10）
  onProgress?: (progress: CrawlProgress) => void;
  onCheckpoint?: (checkpoint: Checkpoint) => void;
}

export interface Checkpoint {
  lastProcessedId: string;
  processedCount: number;
  timestamp: Date;
}
```

### 進捗出力例

```
📥 EN全記事クロール開始
  シリーズ: series-1 ~ series-8

[series-1] 記事一覧取得中... 1000件
[series-1] 本文取得中... 100/1000
[series-1] 本文取得中... 200/1000
💾 チェックポイント保存: SCP-200
...
✅ クロール完了
  取得: 7000件
  成功: 6950件
  失敗: 50件
  所要時間: 45分
```

## テストケース

- [ ] series-1〜8の記事一覧が取得できる
- [ ] 記事本文が正しく取得できる
- [ ] レート制限対応で適切な遅延が挿入される
- [ ] 429エラー時にリトライされる
- [ ] チェックポイントが100件ごとに保存される
- [ ] チェックポイントからの再開が正常に動作する
- [ ] 取得した記事がDBに保存される
- [ ] 失敗した記事がリトライキューに追加される
