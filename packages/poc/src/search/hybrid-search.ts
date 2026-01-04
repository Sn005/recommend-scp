/**
 * Hybrid Search
 * Combines embedding similarity and tag matching
 */

import type { HybridSearchParams, SearchResult, ExtractedTags } from "../types";
import { getSupabaseAdmin } from "../lib/supabase";
import { vectorSearch } from "./vector-search";

export { HybridSearchParams };

export interface HybridSearchResult extends SearchResult {
  matchedTags: {
    object_class: boolean;
    genre: string[];
    theme: string[];
    format: boolean;
  };
}

/**
 * Calculate Jaccard similarity between two arrays
 * Jaccard = |A ∩ B| / |A ∪ B|
 */
export function jaccardSimilarity(a: string[], b: string[]): number {
  if (a.length === 0 && b.length === 0) {
    return 0;
  }

  const setA = new Set(a);
  const setB = new Set(b);
  const intersection = [...setA].filter((x) => setB.has(x));
  const union = new Set([...setA, ...setB]);

  return union.size === 0 ? 0 : intersection.length / union.size;
}

/**
 * Calculate tag similarity score between query and target tags
 * Returns average of:
 * - object_class: exact match (1.0 or 0.0)
 * - genre: Jaccard similarity
 * - theme: Jaccard similarity
 * - format: exact match (1.0 or 0.0)
 */
export function calculateTagScore(
  queryTags: ExtractedTags,
  targetTags: ExtractedTags
): number {
  const scores: number[] = [];

  // object_class: exact match
  scores.push(queryTags.object_class === targetTags.object_class ? 1.0 : 0.0);

  // genre: Jaccard similarity
  scores.push(jaccardSimilarity(queryTags.genre, targetTags.genre));

  // theme: Jaccard similarity
  scores.push(jaccardSimilarity(queryTags.theme, targetTags.theme));

  // format: exact match
  scores.push(queryTags.format === targetTags.format ? 1.0 : 0.0);

  // Return average
  return scores.reduce((a, b) => a + b, 0) / scores.length;
}

/**
 * Get article tags from database
 */
async function getArticleTags(articleId: string): Promise<ExtractedTags> {
  const supabase = getSupabaseAdmin();

  const { data, error } = await supabase
    .from("article_tags")
    .select("tags(category, value)")
    .eq("article_id", articleId);

  if (error) {
    console.warn(`Failed to get tags for ${articleId}: ${error.message}`);
    return {
      object_class: "Other",
      genre: [],
      theme: [],
      format: "standard",
    };
  }

  // Parse tags from joined data
  const tags: ExtractedTags = {
    object_class: "Other",
    genre: [],
    theme: [],
    format: "standard",
  };

  for (const row of data || []) {
    const tagData = row.tags as { category: string; value: string } | null;
    if (!tagData) continue;

    switch (tagData.category) {
      case "object_class":
        tags.object_class = tagData.value;
        break;
      case "genre":
        tags.genre.push(tagData.value);
        break;
      case "theme":
        tags.theme.push(tagData.value);
        break;
      case "format":
        tags.format = tagData.value;
        break;
    }
  }

  return tags;
}

/**
 * Find matched tags between query and target
 */
function findMatchedTags(
  queryTags: ExtractedTags,
  targetTags: ExtractedTags
): HybridSearchResult["matchedTags"] {
  return {
    object_class: queryTags.object_class === targetTags.object_class,
    genre: queryTags.genre.filter((g) => targetTags.genre.includes(g)),
    theme: queryTags.theme.filter((t) => targetTags.theme.includes(t)),
    format: queryTags.format === targetTags.format,
  };
}

/**
 * Perform hybrid search combining embedding similarity and tag matching
 */
export async function hybridSearch(
  params: HybridSearchParams
): Promise<HybridSearchResult[]> {
  const {
    query_id,
    embedding_weight = 0.7,
    tag_weight = 0.3,
    limit = 5,
  } = params;

  console.log(`Hybrid search for ${query_id}...`);

  // 1. Get vector search candidates (3x limit for reranking)
  const vectorResults = await vectorSearch({
    queryId: query_id,
    limit: limit * 3,
  });

  // 2. Get query article tags
  const queryTags = await getArticleTags(query_id);

  // 3. Calculate hybrid scores for each candidate
  const scoredResults = await Promise.all(
    vectorResults.results.map(async (candidate) => {
      const targetTags = await getArticleTags(candidate.articleId);
      const tagScore = calculateTagScore(queryTags, targetTags);
      const finalScore =
        embedding_weight * candidate.similarityScore + tag_weight * tagScore;

      return {
        id: candidate.articleId,
        title: candidate.title,
        similarity_score: finalScore,
        embedding_score: candidate.similarityScore,
        tag_score: tagScore,
        matchedTags: findMatchedTags(queryTags, targetTags),
      };
    })
  );

  // 4. Sort by final score and return top results
  return scoredResults
    .sort((a, b) => b.similarity_score - a.similarity_score)
    .slice(0, limit);
}
