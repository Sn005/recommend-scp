/**
 * @file セレンディピティ推薦
 * @description 80/20の比率で「好み推薦」と「セレンディピティ枠」を切り替える機能
 * @see specs/004-recommend/004-02-recommend-engine/004-02-02.md
 */

import type { VectorSearchClient, VectorSearchResult } from "../search/vector-search-client";
import type { RecommendedArticle } from "./engine";

/**
 * セレンディピティ設定
 */
export interface SerendipityConfig {
  /** セレンディピティ比率（デフォルト: 0.2 = 20%） */
  explorationRate: number;

  /** 隣接領域の最小類似度（デフォルト: 0.4） */
  adjacentMinSimilarity: number;

  /** 隣接領域の最大類似度（デフォルト: 0.7） */
  adjacentMaxSimilarity: number;

  /** 隣接領域 vs 未探索ジャンルの比率（デフォルト: 0.5 = 50:50） */
  adjacentRatio: number;
}

/**
 * デフォルトセレンディピティ設定
 */
export const DEFAULT_SERENDIPITY_CONFIG: SerendipityConfig = {
  explorationRate: 0.2,
  adjacentMinSimilarity: 0.4,
  adjacentMaxSimilarity: 0.7,
  adjacentRatio: 0.5,
};

/**
 * セレンディピティ記事を取得
 *
 * 隣接領域と未探索ジャンルのハイブリッドでセレンディピティ推薦を提供する。
 *
 * @param preferenceEmbedding 嗜好ベクトル
 * @param excludeIds 除外する記事ID
 * @param exploredTags ユーザーが既に触れたタグ
 * @param vectorSearch ベクトル検索クライアント
 * @param config セレンディピティ設定
 * @param limit 取得件数上限
 * @returns セレンディピティ推薦記事
 */
export async function getSerendipityArticles(
  preferenceEmbedding: number[],
  excludeIds: string[],
  exploredTags: string[],
  vectorSearch: VectorSearchClient,
  config: SerendipityConfig = DEFAULT_SERENDIPITY_CONFIG,
  limit: number = 10
): Promise<RecommendedArticle[]> {
  const adjacentCount = Math.ceil(limit * config.adjacentRatio);
  const unexploredCount = limit - adjacentCount;

  const [adjacentArticles, unexploredArticles] = await Promise.all([
    getAdjacentArticles(preferenceEmbedding, excludeIds, vectorSearch, config, adjacentCount),
    getUnexploredArticles(exploredTags, excludeIds, vectorSearch, unexploredCount),
  ]);

  // 重複を除去してマージ
  const seen = new Set<string>();
  const results: RecommendedArticle[] = [];

  for (const article of [...adjacentArticles, ...unexploredArticles]) {
    if (!seen.has(article.id)) {
      seen.add(article.id);
      results.push({
        ...article,
        source: "serendipity" as const,
      });
    }
  }

  return results.slice(0, limit);
}

/**
 * 隣接領域から記事を取得
 *
 * 嗜好ベクトルから「少し離れた」記事を検索。
 * 完全に異質ではないが、普段とは違う記事を提供。
 *
 * @param preferenceEmbedding 嗜好ベクトル
 * @param excludeIds 除外する記事ID
 * @param vectorSearch ベクトル検索クライアント
 * @param config セレンディピティ設定
 * @param limit 取得件数上限
 * @returns 隣接領域記事
 */
export async function getAdjacentArticles(
  preferenceEmbedding: number[],
  excludeIds: string[],
  vectorSearch: VectorSearchClient,
  config: SerendipityConfig,
  limit: number
): Promise<RecommendedArticle[]> {
  const results = await vectorSearch.searchByEmbedding({
    queryVector: preferenceEmbedding,
    excludeIds,
    limit: limit * 2, // 余裕を持って取得
    minSimilarity: config.adjacentMinSimilarity,
    maxSimilarity: config.adjacentMaxSimilarity,
  });

  return results.slice(0, limit).map((r) => ({
    id: r.id,
    title: r.title,
    similarityScore: r.similarity,
    source: "serendipity" as const,
    url: r.url,
  }));
}

/**
 * 未探索ジャンルから記事を取得
 *
 * ユーザーがまだ読んでいないタグを持つ記事を検索。
 * 完全に新しいジャンルへの入口を提供。
 *
 * @param exploredTags ユーザーが既に触れたタグ
 * @param excludeIds 除外する記事ID
 * @param vectorSearch ベクトル検索クライアント
 * @param limit 取得件数上限
 * @returns 未探索ジャンル記事
 */
export async function getUnexploredArticles(
  exploredTags: string[],
  excludeIds: string[],
  vectorSearch: VectorSearchClient,
  limit: number
): Promise<RecommendedArticle[]> {
  // 未探索タグを持つ記事を人気順で取得
  const results = await vectorSearch.searchByUnexploredTags({
    exploredTags,
    excludeIds,
    limit,
    orderBy: "rating",
  });

  return results.map((r) => ({
    id: r.id,
    title: r.title,
    similarityScore: 0, // 未探索なので類似度は0
    source: "serendipity" as const,
    url: r.url,
  }));
}
