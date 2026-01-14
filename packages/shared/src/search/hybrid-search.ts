/**
 * ハイブリッド検索
 * Embedding類似度とタグ一致度を組み合わせた検索
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
 * ジャッカード類似度を計算
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
 * クエリとターゲットのタグ類似度スコアを計算
 * 以下の平均を返す:
 * - object_class: 完全一致 (1.0 or 0.0)
 * - genre: ジャッカード類似度
 * - theme: ジャッカード類似度
 * - format: 完全一致 (1.0 or 0.0)
 */
export function calculateTagScore(queryTags: ExtractedTags, targetTags: ExtractedTags): number {
  const scores: number[] = [];

  // object_class: 完全一致
  scores.push(queryTags.object_class === targetTags.object_class ? 1.0 : 0.0);

  // genre: ジャッカード類似度
  scores.push(jaccardSimilarity(queryTags.genre, targetTags.genre));

  // theme: ジャッカード類似度
  scores.push(jaccardSimilarity(queryTags.theme, targetTags.theme));

  // format: 完全一致
  scores.push(queryTags.format === targetTags.format ? 1.0 : 0.0);

  // 平均を返す
  return scores.reduce((a, b) => a + b, 0) / scores.length;
}

/**
 * データベースから記事のタグを取得
 */
async function getArticleTags(articleId: string): Promise<ExtractedTags> {
  const supabase = getSupabaseAdmin();

  const { data, error } = await supabase
    .from("article_tags")
    .select("tags(category, value)")
    .eq("article_id", articleId);

  if (error) {
    console.warn(`タグ取得失敗 (${articleId}): ${error.message}`);
    return {
      object_class: "Other",
      genre: [],
      theme: [],
      format: "standard",
    };
  }

  // 結合データからタグをパース
  const tags: ExtractedTags = {
    object_class: "Other",
    genre: [],
    theme: [],
    format: "standard",
  };

  for (const row of data || []) {
    const tagData = row.tags as unknown as { category: string; value: string } | null;
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
 * クエリとターゲット間で一致したタグを検出
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
 * Embedding類似度とタグ一致度を組み合わせたハイブリッド検索を実行
 */
export async function hybridSearch(params: HybridSearchParams): Promise<HybridSearchResult[]> {
  const { query_id, embedding_weight, tag_weight, limit } = params;

  console.log(`🔀 ハイブリッド検索開始: ${query_id}`);

  // 1. ベクトル検索で候補を取得（リランキング用に limit の 3 倍）
  const vectorResults = await vectorSearch({
    queryId: query_id,
    limit: limit * 3,
  });

  // 2. クエリ記事のタグを取得
  const queryTags = await getArticleTags(query_id);

  // 3. 各候補のハイブリッドスコアを計算
  const scoredResults = await Promise.all(
    vectorResults.results.map(async (candidate) => {
      const targetTags = await getArticleTags(candidate.articleId);
      const tagScore = calculateTagScore(queryTags, targetTags);
      const finalScore = embedding_weight * candidate.similarityScore + tag_weight * tagScore;

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

  // 4. 最終スコアでソートして上位を返す
  return scoredResults.sort((a, b) => b.similarity_score - a.similarity_score).slice(0, limit);
}
