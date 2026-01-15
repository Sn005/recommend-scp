/**
 * クローラー抽象化レイヤーの型定義
 * Subtask: 003-02-01
 */

/** 記事インデックス（一覧取得時） */
export interface ArticleIndex {
  /** 記事ID（例: 'SCP-173'） */
  id: string;
  /** 記事タイトル */
  title: string;
  /** 記事URL */
  url: string;
  /** シリーズ（例: 'series-1'） */
  series: string;
}

/** 記事コンテンツ（詳細取得時） */
export interface ArticleContent {
  /** 記事ID */
  id: string;
  /** 記事タイトル */
  title: string;
  /** 記事本文 */
  content: string;
  /** レーティング */
  rating: number;
  /** タグ一覧 */
  tags: string[];
  /** 作成日時 */
  createdAt: Date;
  /** 更新日時 */
  updatedAt: Date;
  /** ソースハッシュ（差分検出用） */
  sourceHash?: string;
}

/** クロール進捗状況 */
export interface CrawlProgress {
  /** フェーズ */
  phase: "fetch_index" | "fetch_content" | "save_db";
  /** 現在の処理数 */
  current: number;
  /** 総数 */
  total: number;
}

/** 支部クローラーインターフェース */
export interface BranchCrawler {
  /** 言語コード（例: 'en', 'ja'） */
  readonly lang: string;
  /** クローラータイプ */
  readonly crawlerType: "api" | "scraping";

  /** 記事一覧を取得 */
  fetchArticleList(): Promise<ArticleIndex[]>;

  /** 指定IDの記事コンテンツを取得 */
  fetchArticleContent(id: string): Promise<ArticleContent>;

  /** 指定IDの最終更新日時を取得（差分更新用） */
  getLastModified(id: string): Promise<Date | null>;
}

/** チェックポイント */
export interface Checkpoint {
  /** 最後に処理した記事ID */
  lastProcessedId: string;
  /** 処理済み件数 */
  processedCount: number;
  /** チェックポイント保存時刻 */
  timestamp: Date;
  /** 処理中のシリーズ */
  currentSeries?: string;
}

/** フルクロールオプション */
export interface FullCrawlOptions {
  /** チェックポイントから再開 */
  resumeFromCheckpoint?: Checkpoint;
  /** 対象シリーズ（デフォルト: 全シリーズ） */
  series?: string[];
  /** バッチサイズ（デフォルト: 10） */
  batchSize?: number;
  /** チェックポイント保存間隔（デフォルト: 100） */
  checkpointInterval?: number;
  /** 進捗コールバック */
  onProgress?: (progress: CrawlProgress) => void;
  /** チェックポイント保存コールバック */
  onCheckpoint?: (checkpoint: Checkpoint) => void;
  /** ドライラン（DBに保存しない） */
  dryRun?: boolean;
}

/** クロール結果 */
export interface CrawlResult {
  /** 成功件数 */
  successCount: number;
  /** 失敗件数 */
  failedCount: number;
  /** 失敗した記事ID一覧 */
  failedIds: string[];
  /** 最終チェックポイント */
  lastCheckpoint?: Checkpoint;
  /** 所要時間（ミリ秒） */
  durationMs: number;
}

/** DB保存用の記事データ */
export interface ArticleForDb {
  /** 記事ID */
  article_id: string;
  /** 言語コード */
  lang: string;
  /** タイトル */
  title: string;
  /** 本文 */
  content: string;
  /** レーティング */
  rating: number;
  /** タグ（JSON配列） */
  tags: string[];
  /** 取得日時 */
  fetched_at: string;
  /** 埋め込みステータス */
  embedding_status: "pending" | "completed" | "failed";
  /** タグ付けステータス */
  tagging_status: "pending" | "completed" | "failed";
}
