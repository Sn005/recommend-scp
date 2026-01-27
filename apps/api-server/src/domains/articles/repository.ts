/**
 * @file ArticlesRepository
 * @description articlesドメインのDB操作層
 * @see specs/005-backend-api/005-04-articles-api/005-04-01.md
 */

import type { SupabaseClient } from "@supabase/supabase-js";
import type { VectorSearchClientResult } from "@recommend-scp/shared/search";

/**
 * Supabaseエラー型
 */
interface SupabaseError extends Error {
  code?: string;
}

/**
 * Supabase RPC/クエリ戻り値の型定義
 */
interface SupabaseResponse<T> {
  data: T | null;
  error: SupabaseError | null;
}

/**
 * 記事詳細
 */
export interface ArticleDetail {
  /** 記事ID */
  id: string;
  /** タイトル */
  title: string;
  /** URL */
  url: string;
  /** タグ一覧 */
  tags: string[];
  /** 評価スコア */
  rating: number | null;
}

/**
 * 検索オプション
 */
export interface SearchOptions {
  /** 取得件数上限（デフォルト: 10） */
  limit?: number;
  /** 除外する記事ID */
  excludeIds?: string[];
}

/**
 * ArticlesRepository
 *
 * 記事のDB操作を担当する。
 * pgvector RPC関数を使用したセマンティック検索を提供。
 */
export class ArticlesRepository {
  constructor(private readonly supabase: SupabaseClient) {}

  /**
   * ベクトル類似度検索
   *
   * クエリベクトルとのコサイン類似度が高い記事を検索する。
   * 結果は類似度降順でソートされる。
   *
   * @param queryVector - クエリベクトル
   * @param options - 検索オプション
   * @returns 検索結果（類似度降順）
   */
  searchByEmbedding = async (
    queryVector: number[],
    options: SearchOptions = {}
  ): Promise<VectorSearchClientResult[]> => {
    const response = (await this.supabase.rpc("search_articles_by_embedding", {
      query_vector: queryVector,
      exclude_ids: options.excludeIds ?? [],
      match_count: options.limit ?? 10,
    })) as unknown as SupabaseResponse<VectorSearchClientResult[]>;

    if (response.error !== null) throw response.error;
    return response.data ?? [];
  };

  /**
   * 記事IDで記事詳細を取得
   *
   * @param id - 記事ID
   * @returns 記事詳細。存在しない場合はnull
   */
  getArticleById = async (id: string): Promise<ArticleDetail | null> => {
    const response = (await this.supabase
      .from("scp_articles")
      .select("id, title, url, tags, rating")
      .eq("id", id)
      .single()) as unknown as SupabaseResponse<ArticleDetail>;

    // PGRST116: 行が見つからない場合のエラーコード
    if (response.error?.code === "PGRST116") return null;
    if (response.error !== null) throw response.error;
    return response.data;
  };
}
