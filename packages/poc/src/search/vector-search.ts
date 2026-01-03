/**
 * Vector Search
 * Performs cosine similarity search using pgvector
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
 * Perform vector similarity search using pgvector
 * Uses cosine similarity to find articles similar to the query article
 */
export async function vectorSearch(
  params: VectorSearchParams
): Promise<VectorSearchResponse> {
  const { queryId, limit = 5 } = params;
  const startTime = performance.now();

  const supabase = getSupabaseAdmin();

  // Get the query article's title
  const { data: queryArticle, error: articleError } = await supabase
    .from("scp_articles")
    .select("title")
    .eq("id", queryId)
    .single();

  if (articleError || !queryArticle) {
    throw new Error(`Article not found: ${queryId}`);
  }

  // Call the RPC function for similarity search
  const { data: searchResults, error: searchError } = await supabase.rpc(
    "search_similar_articles",
    {
      query_id: queryId,
      match_count: limit,
    }
  );

  if (searchError) {
    throw new Error(`Search failed: ${searchError.message}`);
  }

  const endTime = performance.now();
  const searchTimeMs = Math.round(endTime - startTime);

  // Map the results to our interface
  const results: VectorSearchResult[] = (searchResults || []).map(
    (row: { id: string; title: string; similarity_score: number }) => ({
      articleId: row.id,
      title: row.title,
      similarityScore: row.similarity_score,
    })
  );

  // Log search time to console (AC requirement)
  console.log(`🔍 Vector search completed in ${searchTimeMs}ms`);

  return {
    queryId,
    queryTitle: queryArticle.title,
    results,
    searchTimeMs,
  };
}
