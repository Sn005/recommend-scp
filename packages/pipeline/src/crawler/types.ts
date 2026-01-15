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
