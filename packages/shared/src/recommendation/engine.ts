/**
 * @file 推薦エンジンコア
 * @description Embeddingベースの嗜好ベクトルを使用した推薦エンジン
 * @see specs/004-recommend/004-02-recommend-engine/004-02-01.md
 * @see specs/004-recommend/004-02-recommend-engine/004-02-02.md
 */

import type { PreferenceStorage, PreferenceProfile, ViewHistory, Feedback } from "../storage/types";
import type { VectorSearchClient } from "../search/vector-search-client";
import { calculatePreferenceVector, type PreferenceVectorInput } from "./preference-vector";
import {
  getSerendipityArticles,
  DEFAULT_SERENDIPITY_CONFIG,
  type SerendipityConfig,
} from "./serendipity";

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
  /** セレンディピティ設定（省略時はデフォルト設定を使用） */
  serendipity?: Partial<SerendipityConfig>;
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
 * 80/20の確率で好み推薦とセレンディピティ推薦を切り替える。
 */
export class RecommendationEngine {
  private readonly config: RecommendationEngineConfig;
  private readonly serendipityConfig: SerendipityConfig;

  constructor(
    private readonly storage: PreferenceStorage,
    private readonly vectorSearch: VectorSearchClient,
    config: Partial<RecommendationEngineConfig> = {}
  ) {
    this.config = { ...DEFAULT_CONFIG, ...config };
    this.serendipityConfig = {
      ...DEFAULT_SERENDIPITY_CONFIG,
      ...config.serendipity,
    };
  }

  /**
   * 推薦記事を取得
   *
   * 連続類似検出を優先し、それ以外は80/20の確率で好み推薦（Exploitation）と
   * セレンディピティ推薦（Exploration）を切り替える。
   * セレンディピティ推薦では隣接領域と未探索ジャンルをハイブリッドで提供する。
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

    // 連続類似検出（80/20判定より優先）
    const forceSerendipity = await this.shouldForceSerendipity(visitorId);
    if (forceSerendipity) {
      return this.getSerendipityRecommendations(profile, excludedIds, limit);
    }

    // 80/20 判定: explorationRateの確率でセレンディピティ推薦
    const isSerendipity = Math.random() < this.serendipityConfig.explorationRate;

    if (isSerendipity) {
      return this.getSerendipityRecommendations(profile, excludedIds, limit);
    } else {
      return this.getPreferenceRecommendations(profile, excludedIds, limit);
    }
  }

  /**
   * 連続類似検出
   *
   * 直近5件の推薦が全て "preference" の場合、冒険枠を強制する。
   *
   * @param visitorId 訪問者ID
   * @returns 冒険枠を強制すべきかどうか
   */
  private async shouldForceSerendipity(visitorId: string): Promise<boolean> {
    const recentLogs = await this.storage.getRecommendationLog(visitorId, 5);

    if (recentLogs.length < 5) {
      return false;
    }

    // 直近5件が全て "preference" かチェック
    const allPreference = recentLogs.every((log) => log.source === "preference");

    return allPreference;
  }

  /**
   * 推薦ログを記録
   *
   * @param visitorId 訪問者ID
   * @param articleId 記事ID
   * @param source 推薦ソース（preference/serendipity）
   */
  async recordRecommendation(
    visitorId: string,
    articleId: string,
    source: "preference" | "serendipity"
  ): Promise<void> {
    await this.storage.addRecommendationLog({
      id: `${visitorId}_${articleId}_${Date.now()}`,
      visitorId,
      articleId,
      recommendedAt: new Date().toISOString(),
      source,
      clicked: false,
    });
  }

  /**
   * 好み推薦（Exploitation）を取得
   *
   * @param profile ユーザープロファイル
   * @param excludedIds 除外する記事ID
   * @param limit 取得件数上限
   * @returns 好み推薦記事リスト
   */
  private async getPreferenceRecommendations(
    profile: PreferenceProfile,
    excludedIds: string[],
    limit: number
  ): Promise<RecommendedArticle[]> {
    // Embeddingベースの類似度検索
    const results = await this.vectorSearch.searchByEmbedding({
      queryVector: profile.preferenceEmbedding!,
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
   * セレンディピティ推薦（Exploration）を取得
   *
   * @param profile ユーザープロファイル
   * @param excludedIds 除外する記事ID
   * @param limit 取得件数上限
   * @returns セレンディピティ推薦記事リスト
   */
  private async getSerendipityRecommendations(
    profile: PreferenceProfile,
    excludedIds: string[],
    limit: number
  ): Promise<RecommendedArticle[]> {
    const exploredTags = await this.getExploredTags(profile.visitorId);

    return getSerendipityArticles(
      profile.preferenceEmbedding!,
      excludedIds,
      exploredTags,
      this.vectorSearch,
      this.serendipityConfig,
      limit
    );
  }

  /**
   * ユーザーが既に触れたタグを取得
   *
   * @param visitorId 訪問者ID
   * @returns ユーザーが触れたタグの配列（重複排除済み）
   */
  private async getExploredTags(visitorId: string): Promise<string[]> {
    const viewHistory = await this.storage.getViewHistory(visitorId);

    // 並列で全記事のタグを取得
    const tagArrays = await Promise.all(
      viewHistory.map((vh) => this.storage.getArticleTags(vh.articleId))
    );

    const allTags = tagArrays.flatMap((tags) => tags ?? []);
    return [...new Set(allTags)];
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
