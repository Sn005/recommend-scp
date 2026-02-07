/**
 * @file ベクトル検索クライアントインターフェース
 * @description 推薦エンジンで使用するベクトル類似度検索の抽象化レイヤー
 * @see specs/004-recommend/004-02-recommend-engine/004-02-01.md
 */

/**
 * ベクトル検索結果
 */
export interface VectorSearchResult {
  /** 記事ID */
  id: string;
  /** 記事タイトル */
  title: string;
  /** コサイン類似度スコア（0〜1） */
  similarity: number;
  /** 日本語版URL（article_translationsから取得） */
  url: string;
  /** オブジェクトクラス（SAFE, EUCLID, KETER等）。該当なしの場合はundefined */
  objectClass?: string;
  /** 記事のrating。該当なしの場合はundefined */
  rating?: number;
}

/**
 * ベクトル検索パラメータ
 */
export interface VectorSearchParams {
  /** クエリベクトル（嗜好ベクトル等） */
  queryVector: number[];
  /** 除外する記事ID */
  excludeIds?: string[];
  /** 取得件数上限 */
  limit: number;
  /** 最小類似度閾値（省略時は制限なし） */
  minSimilarity?: number;
  /** 最大類似度閾値（省略時は制限なし） */
  maxSimilarity?: number;
}

/**
 * 未探索タグ検索パラメータ
 */
export interface UnexploredTagsSearchParams {
  /** ユーザーが既に触れたタグ */
  exploredTags: string[];
  /** 除外する記事ID */
  excludeIds?: string[];
  /** 取得件数上限 */
  limit: number;
  /** ソート基準 */
  orderBy: "rating" | "random";
}

/**
 * ベクトル検索クライアントインターフェース
 *
 * 推薦エンジンがベクトル類似度検索を実行するための抽象化レイヤー。
 * 具体的な実装（Supabase pgvector等）に依存しない設計を実現する。
 */
export interface VectorSearchClient {
  /**
   * ベクトル類似度検索
   *
   * クエリベクトルとのコサイン類似度が高い記事を検索する。
   * 結果は類似度降順でソートされる。
   *
   * @param params 検索パラメータ
   * @returns 検索結果（類似度降順）
   */
  searchByEmbedding(params: VectorSearchParams): Promise<VectorSearchResult[]>;

  /**
   * 記事のEmbeddingを取得
   *
   * @param articleId 記事ID
   * @returns Embeddingベクトル。記事が存在しないまたはEmbeddingがない場合はnull
   */
  getEmbedding(articleId: string): Promise<number[] | null>;

  /**
   * 未探索タグを持つ記事を検索
   *
   * ユーザーがまだ触れていないタグを持つ記事を、
   * 人気度（rating）またはランダム順で取得する。
   *
   * @param params 検索パラメータ
   * @returns 検索結果
   */
  searchByUnexploredTags(params: UnexploredTagsSearchParams): Promise<VectorSearchResult[]>;
}
