/**
 * @file SupabaseVectorSearch - VectorSearchClientのSupabase実装
 * @description pgvector RPC関数を使用したベクトル類似度検索
 * @see specs/005-backend-api/005-02-server-storage/005-02-03.md
 */

import type { SupabaseClient } from "@supabase/supabase-js";
import type {
  VectorSearchClient,
  VectorSearchClientParams,
  VectorSearchClientResult,
  UnexploredTagsSearchParams,
} from "@recommend-scp/shared/search";
import { parseVectorField } from "./parse-vector";

/**
 * RPC関数からの検索結果行
 */
interface SearchResultRow {
  id: string;
  title: string;
  similarity?: number;
  url?: string;
}

/**
 * Supabase RPC/クエリ戻り値の型定義
 */
interface SupabaseResponse<T> {
  data: T | null;
  error: Error | null;
}

/**
 * 記事テーブルの行（embedding取得用）
 */
interface ArticleRow {
  embedding: number[] | null;
}

/**
 * searchByEmbedding RPC関数のパラメータ
 */
interface SearchByEmbeddingParams {
  query_vector: number[];
  exclude_ids: string[];
  match_count: number;
  min_similarity: number;
  max_similarity: number;
}

/**
 * searchByUnexploredTags RPC関数のパラメータ
 */
interface SearchByUnexploredTagsParams {
  explored_tags: string[];
  exclude_ids: string[];
  match_count: number;
  order_by: "rating" | "random";
}

/**
 * SupabaseVectorSearch
 *
 * VectorSearchClientインターフェースのSupabase実装。
 * pgvector RPC関数を使用してコサイン類似度検索を実行する。
 */
export class SupabaseVectorSearch implements VectorSearchClient {
  constructor(private readonly supabase: SupabaseClient) {}

  /**
   * ベクトル類似度検索
   *
   * クエリベクトルとのコサイン類似度が高い記事を検索する。
   * 結果は類似度降順でソートされる。
   *
   * @param params 検索パラメータ
   * @returns 検索結果（類似度降順）
   */
  searchByEmbedding = async (
    params: VectorSearchClientParams
  ): Promise<VectorSearchClientResult[]> => {
    const rpcParams: SearchByEmbeddingParams = {
      query_vector: params.queryVector,
      exclude_ids: params.excludeIds ?? [],
      match_count: params.limit,
      min_similarity: params.minSimilarity ?? 0,
      max_similarity: params.maxSimilarity ?? 1,
    };

    const response = (await this.supabase.rpc(
      "search_articles_by_embedding",
      rpcParams
    )) as unknown as SupabaseResponse<SearchResultRow[]>;

    if (response.error !== null) {
      throw response.error;
    }

    const rows = response.data ?? [];
    return rows.map((row) => ({
      id: row.id,
      title: row.title,
      similarity: row.similarity ?? 0,
      url: row.url ?? "",
    }));
  };

  /**
   * 記事のEmbeddingを取得
   *
   * @param articleId 記事ID
   * @returns Embeddingベクトル。記事が存在しないまたはEmbeddingがない場合はnull
   */
  getEmbedding = async (articleId: string): Promise<number[] | null> => {
    const response = (await this.supabase
      .from("scp_articles")
      .select("embedding")
      .eq("article_id", articleId)
      .single()) as unknown as SupabaseResponse<ArticleRow>;

    if (response.error !== null) {
      return null;
    }

    if (response.data === null) {
      return null;
    }

    // pgvectorカラムは文字列 "[0.1,0.2,...]" として返される場合がある
    return parseVectorField(response.data.embedding);
  };

  /**
   * 未探索タグを持つ記事を検索
   *
   * ユーザーがまだ触れていないタグを持つ記事を、
   * 人気度（rating）またはランダム順で取得する。
   *
   * @param params 検索パラメータ
   * @returns 検索結果（similarityは固定値0.5）
   */
  searchByUnexploredTags = async (
    params: UnexploredTagsSearchParams
  ): Promise<VectorSearchClientResult[]> => {
    const rpcParams: SearchByUnexploredTagsParams = {
      explored_tags: params.exploredTags,
      exclude_ids: params.excludeIds ?? [],
      match_count: params.limit,
      order_by: params.orderBy,
    };

    const response = (await this.supabase.rpc(
      "search_articles_by_unexplored_tags",
      rpcParams
    )) as unknown as SupabaseResponse<SearchResultRow[]>;

    if (response.error !== null) {
      throw response.error;
    }

    const rows = response.data ?? [];
    return rows.map((row) => ({
      id: row.id,
      title: row.title,
      similarity: 0.5, // 未探索タグ検索では固定値
      url: row.url ?? "",
    }));
  };
}
