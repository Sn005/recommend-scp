/**
 * ベクトル検索
 * pgvectorを使用したコサイン類似度検索
 */

import { getSupabaseAdmin } from "../lib/supabase";

export interface VectorSearchParams {
  queryId: string;
  limit?: number;
}

export interface VectorSearchResult {
  articleId: string;
  title: string;
  similarityScore: number;
}

export interface VectorSearchResponse {
  queryId: string;
  queryTitle: string;
  results: VectorSearchResult[];
  searchTimeMs: number;
}

/**
 * pgvectorを使用したベクトル類似度検索を実行
 * コサイン類似度でクエリ記事に類似した記事を検索
 */
export async function vectorSearch(params: VectorSearchParams): Promise<VectorSearchResponse> {
  const { queryId, limit = 5 } = params;
  const startTime = performance.now();

  const supabase = getSupabaseAdmin();

  // クエリ記事のタイトルを取得
  const { data: queryArticle, error: articleError } = await supabase
    .from("scp_articles")
    .select("title")
    .eq("id", queryId)
    .single();

  if (articleError || !queryArticle) {
    throw new Error(`記事が見つかりません: ${queryId}`);
  }

  // 類似度検索のRPC関数を呼び出し
  const { data: searchResults, error: searchError } = await supabase.rpc(
    "search_similar_articles",
    {
      query_id: queryId,
      match_count: limit,
    }
  );

  if (searchError) {
    throw new Error(`検索失敗: ${searchError.message}`);
  }

  const endTime = performance.now();
  const searchTimeMs = Math.round(endTime - startTime);

  // 結果をインターフェースにマッピング
  const results: VectorSearchResult[] = (searchResults || []).map(
    (row: { id: string; title: string; similarity_score: number }) => ({
      articleId: row.id,
      title: row.title,
      similarityScore: row.similarity_score,
    })
  );

  // 検索時間をコンソールに出力（AC要件）
  console.log(`🔍 ベクトル検索完了: ${searchTimeMs}ms`);

  return {
    queryId,
    queryTitle: queryArticle.title,
    results,
    searchTimeMs,
  };
}
