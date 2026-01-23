/**
 * @file 推薦エンジンコア
 * @description Embeddingベースの嗜好ベクトルを使用した推薦エンジン
 * @see specs/004-recommend/004-02-recommend-engine/004-02-01.md
 */

import type { PreferenceStorage, PreferenceProfile, ViewHistory, Feedback } from "../storage/types";
import type { VectorSearchClient } from "../search/vector-search-client";
import { calculatePreferenceVector, type PreferenceVectorInput } from "./preference-vector";

/**
 * 推薦記事
 */
export interface RecommendedArticle {
  /** 記事ID */
  id: string;
  /** 記事タイトル */
  title: string;
  /** コサイン類似度スコア */
  similarityScore: number;
  /** 推薦ソース */
  source: "preference" | "serendipity";
}

/**
 * 推薦エンジン設定
 */
export interface RecommendationEngineConfig {
  /** 推薦取得時に嗜好ベクトルを再計算するか（デフォルト: true） */
  recalculateOnRequest: boolean;
}

/**
 * デフォルト設定
 */
const DEFAULT_CONFIG: RecommendationEngineConfig = {
  recalculateOnRequest: true,
};

/**
 * 推薦エンジン
 *
 * ユーザーの嗜好ベクトル（preferenceEmbedding）に基づいて
 * コサイン類似度で推薦候補を取得し、既読・Dislike済み記事を除外する。
 */
export class RecommendationEngine {
  private readonly config: RecommendationEngineConfig;

  constructor(
    private readonly storage: PreferenceStorage,
    private readonly vectorSearch: VectorSearchClient,
    config: Partial<RecommendationEngineConfig> = {}
  ) {
    this.config = { ...DEFAULT_CONFIG, ...config };
  }

  /**
   * 推薦記事を取得
   *
   * @param visitorId 訪問者ID
   * @param limit 取得件数上限（デフォルト: 10）
   * @returns 推薦記事リスト（類似度降順）
   * @throws オンボーディング未完了の場合
   */
  async getRecommendations(visitorId: string, limit: number = 10): Promise<RecommendedArticle[]> {
    // 嗜好ベクトルを再計算（即時反映）
    if (this.config.recalculateOnRequest) {
      await this.recalculatePreferenceVector(visitorId);
    }

    const profile = await this.storage.getProfile(visitorId);
    if (!profile?.preferenceEmbedding) {
      throw new Error("Onboarding not completed: preferenceEmbedding is missing");
    }

    // 除外対象を取得
    const excludedIds = await this.getExcludedIds(visitorId);

    // Embeddingベースの類似度検索
    const results = await this.vectorSearch.searchByEmbedding({
      queryVector: profile.preferenceEmbedding,
      excludeIds: excludedIds,
      limit,
    });

    return results.map((r) => ({
      id: r.id,
      title: r.title,
      similarityScore: r.similarity,
      source: "preference" as const,
    }));
  }

  /**
   * 閲覧を記録
   *
   * @param visitorId 訪問者ID
   * @param articleId 記事ID
   */
  async recordView(visitorId: string, articleId: string): Promise<void> {
    await this.storage.addViewHistory({
      id: `${visitorId}_${articleId}_${Date.now()}`,
      visitorId,
      articleId,
      viewedAt: new Date().toISOString(),
    });
  }

  /**
   * フィードバックを記録
   *
   * @param visitorId 訪問者ID
   * @param articleId 記事ID
   * @param type フィードバック種別（like/dislike）
   */
  async recordFeedback(
    visitorId: string,
    articleId: string,
    type: "like" | "dislike"
  ): Promise<void> {
    await this.storage.addFeedback({
      id: `${visitorId}_${articleId}`,
      visitorId,
      articleId,
      type,
      createdAt: new Date().toISOString(),
    });
  }

  /**
   * 除外対象のIDを取得
   *
   * 既読・Dislike済み・お気に入り済みの記事IDを収集する。
   *
   * @param visitorId 訪問者ID
   * @returns 除外対象の記事ID配列
   */
  private async getExcludedIds(visitorId: string): Promise<string[]> {
    const [viewHistory, disliked, favorites] = await Promise.all([
      this.storage.getViewHistory(visitorId),
      this.storage.getDislikedArticleIds(visitorId),
      this.storage.getFavorites(visitorId),
    ]);

    const viewedIds = viewHistory.map((h) => h.articleId);
    const favoriteIds = favorites.map((f) => f.articleId);

    return [...new Set([...viewedIds, ...disliked, ...favoriteIds])];
  }

  /**
   * 嗜好ベクトルを再計算
   *
   * 最新の行動履歴（Like/Dislike/お気に入り/閲覧）に基づいて
   * 嗜好ベクトルを再計算し、プロファイルを更新する。
   *
   * @param visitorId 訪問者ID
   */
  private async recalculatePreferenceVector(visitorId: string): Promise<void> {
    const [feedbacks, viewHistories, favorites] = await Promise.all([
      this.storage.getFeedback(visitorId),
      this.storage.getViewHistory(visitorId),
      this.storage.getFavorites(visitorId),
    ]);

    const input: PreferenceVectorInput = {
      favoriteArticleIds: favorites.map((f) => f.articleId),
      likedArticleIds: feedbacks.filter((f) => f.type === "like").map((f) => f.articleId),
      viewedArticleIds: this.getViewedOnlyArticleIds(feedbacks, viewHistories),
      dislikedArticleIds: feedbacks.filter((f) => f.type === "dislike").map((f) => f.articleId),
    };

    const preferenceEmbedding = await calculatePreferenceVector(input, (id) =>
      this.vectorSearch.getEmbedding(id)
    );

    if (preferenceEmbedding) {
      const profile = await this.storage.getProfile(visitorId);
      if (profile) {
        await this.storage.saveProfile({
          ...profile,
          preferenceEmbedding,
          updatedAt: new Date().toISOString(),
        });
      }
    }
  }

  /**
   * Like/Dislikeなしの読了記事IDを取得
   *
   * フィードバック（Like/Dislike）がなく、閲覧のみの記事を抽出する。
   *
   * @param feedbacks フィードバック配列
   * @param viewHistories 閲覧履歴配列
   * @returns Like/Dislikeなしの閲覧記事ID配列
   */
  private getViewedOnlyArticleIds(feedbacks: Feedback[], viewHistories: ViewHistory[]): string[] {
    const feedbackArticleIds = new Set(feedbacks.map((f) => f.articleId));
    const viewedArticleIds = new Set(viewHistories.map((v) => v.articleId));

    return [...viewedArticleIds].filter((id) => !feedbackArticleIds.has(id));
  }
}
