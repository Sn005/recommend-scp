/**
 * クローラー抽象化レイヤーの型定義
 *
 * 将来の多言語支部対応を見据えて、クローラーを抽象化する。
 * 共通インターフェース（BranchCrawler）を定義し、支部別実装を差し替え可能にする。
 */

/**
 * 記事インデックス（一覧取得時の軽量データ）
 */
export interface ArticleIndex {
  /** 記事ID（例: 'SCP-173'） */
  id: string;
  /** 記事タイトル（例: 'The Sculpture'） */
  title: string;
  /** 記事URL */
  url: string;
  /** シリーズ（例: 'series-1'） */
  series: string;
}

/**
 * 記事コンテンツ（全文取得時のデータ）
 */
export interface ArticleContent {
  /** 記事ID */
  id: string;
  /** 記事タイトル */
  title: string;
  /** 記事本文（プレーンテキスト） */
  content: string;
  /** 評価（rating） */
  rating: number;
  /** タグ一覧 */
  tags: string[];
  /** 作成日時 */
  createdAt: Date;
  /** 更新日時 */
  updatedAt: Date;
  /** コンテンツハッシュ（差分検出用、オプショナル） */
  sourceHash?: string;
}

/**
 * クロール進捗
 */
export interface CrawlProgress {
  /** 現在のフェーズ */
  phase: "fetch_index" | "fetch_content" | "save_db";
  /** 現在の進捗 */
  current: number;
  /** 総数 */
  total: number;
}

/**
 * クローラー共通インターフェース
 *
 * 各言語支部のクローラーはこのインターフェースを実装する。
 * これにより、Factory経由で言語を切り替えるだけで異なる支部に対応できる。
 */
export interface BranchCrawler {
  /** 対象言語コード */
  readonly lang: string;
  /** クローラータイプ（API利用 or スクレイピング） */
  readonly crawlerType: "api" | "scraping";

  /**
   * 記事一覧を取得する
   * @returns 記事インデックスの配列
   */
  fetchArticleList(): Promise<ArticleIndex[]>;

  /**
   * 指定IDの記事コンテンツを取得する
   * @param id 記事ID（例: 'SCP-173'）
   * @returns 記事コンテンツ
   */
  fetchArticleContent(id: string): Promise<ArticleContent>;

  /**
   * 指定IDの記事の最終更新日時を取得する
   * @param id 記事ID
   * @returns 最終更新日時（存在しない場合はnull）
   */
  getLastModified(id: string): Promise<Date | null>;
}
