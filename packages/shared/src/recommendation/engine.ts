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
  DEFAULT_ADJACENT_RELAXATION,
  type SerendipityConfig,
  type AdjacentRelaxationConfig,
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
  /** 日本語版URL（article_translationsから取得） */
  url: string;
  /** オブジェクトクラス（SAFE, EUCLID, KETER等）。該当なしの場合はnull */
  objectClass: string | null;
  /** 記事のrating。該当なしの場合はnull */
  rating: number | null;
}

/**
 * 段階的類似度緩和設定
 *
 * 検索結果が不足した場合、段階的にパラメータを緩和して再検索する。
 */
export interface SimilarityRelaxationConfig {
  /** 最大緩和レベル（デフォルト: 3） */
  maxRelaxationLevels: number;
  /** プール倍率の1レベルあたりの増分（デフォルト: 2） */
  poolMultiplierStep: number;
  /** 隣接領域: 最小類似度の緩和幅（デフォルト: 0.1） */
  adjacentMinSimilarityStep: number;
  /** 隣接領域: 最大類似度の緩和幅（デフォルト: 0.1） */
  adjacentMaxSimilarityStep: number;
  /** 隣接領域: 最小類似度の下限（デフォルト: 0.1） */
  adjacentMinSimilarityFloor: number;
  /** 隣接領域: 最大類似度の上限（デフォルト: 0.95） */
  adjacentMaxSimilarityCeiling: number;
}

/**
 * デフォルトの段階的緩和設定
 */
const DEFAULT_RELAXATION_CONFIG: SimilarityRelaxationConfig = {
  maxRelaxationLevels: 3,
  poolMultiplierStep: 2,
  adjacentMinSimilarityStep: 0.1,
  adjacentMaxSimilarityStep: 0.1,
  adjacentMinSimilarityFloor: 0.1,
  adjacentMaxSimilarityCeiling: 0.95,
};

/**
 * 推薦エンジン設定
 */
export interface RecommendationEngineConfig {
  /** 推薦取得時に嗜好ベクトルを再計算するか（デフォルト: true） */
  recalculateOnRequest: boolean;
  /** セレンディピティ設定（省略時はデフォルト設定を使用） */
  serendipity?: Partial<SerendipityConfig>;
  /** 候補プール倍率（デフォルト: 3）。limitのN倍の候補を取得し、ランダムサンプリングで多様性を確保する */
  candidatePoolMultiplier?: number;
  /** 段階的緩和設定（省略時はデフォルト設定を使用） */
  relaxation?: Partial<SimilarityRelaxationConfig>;
}

/**
 * デフォルトの候補プール倍率
 */
const DEFAULT_CANDIDATE_POOL_MULTIPLIER = 3;

/**
 * getExcludedIds で取得する閲覧履歴の上限
 * ヘビーユーザーで除外リストが肥大化するのを防ぐ
 */
const DEFAULT_EXCLUDE_VIEW_HISTORY_LIMIT = 200;

/**
 * getExploredTags で取得する閲覧履歴の上限
 * N+1クエリ（getArticleTags × N）の軽減
 */
const DEFAULT_EXPLORED_TAGS_VIEW_HISTORY_LIMIT = 50;

/**
 * デフォルト設定
 */
const DEFAULT_CONFIG: RecommendationEngineConfig = {
  recalculateOnRequest: true,
  candidatePoolMultiplier: DEFAULT_CANDIDATE_POOL_MULTIPLIER,
};

/**
 * 推薦エンジン
 *
 * ユーザーの嗜好ベクトル（preferenceEmbedding）に基づいて
 * コサイン類似度で推薦候補を取得し、既読記事を除外する。
 * 80/20の確率で好み推薦とセレンディピティ推薦を切り替える。
 */
export class RecommendationEngine {
  private readonly config: RecommendationEngineConfig;
  private readonly serendipityConfig: SerendipityConfig;
  private readonly relaxationConfig: SimilarityRelaxationConfig;

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
    this.relaxationConfig = {
      ...DEFAULT_RELAXATION_CONFIG,
      ...config.relaxation,
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
  async getRecommendations(
    visitorId: string,
    limit: number = 10,
    additionalExcludeIds: string[] = []
  ): Promise<RecommendedArticle[]> {
    // 嗜好ベクトルを再計算（即時反映）
    if (this.config.recalculateOnRequest) {
      await this.recalculatePreferenceVector(visitorId);
    }

    const profile = await this.storage.getProfile(visitorId);
    if (!profile?.preferenceEmbedding) {
      throw new Error("Onboarding not completed: preferenceEmbedding is missing");
    }

    // 除外対象を取得（DB上の履歴 + フロントエンドから渡された既取得記事ID）
    const baseExcludedIds = await this.getExcludedIds(visitorId);
    const excludedIds = [...new Set([...baseExcludedIds, ...additionalExcludeIds])];

    // 連続類似検出（80/20判定より優先）
    const forceSerendipity = await this.shouldForceSerendipity(visitorId);

    // 80/20 判定: explorationRateの確率でセレンディピティ推薦
    const isSerendipity =
      forceSerendipity || Math.random() < this.serendipityConfig.explorationRate;

    // プライマリパスで取得
    const primaryResults = isSerendipity
      ? await this.getSerendipityRecommendations(profile, excludedIds, limit)
      : await this.getPreferenceRecommendations(profile, excludedIds, limit);

    // フォールバック: プライマリがlimit未満の場合、代替パスで不足分を補充
    if (primaryResults.length < limit) {
      const primaryIds = primaryResults.map((r) => r.id);
      const fallbackExcludedIds = [...excludedIds, ...primaryIds];
      const remaining = limit - primaryResults.length;

      const fallbackResults = isSerendipity
        ? await this.getPreferenceRecommendations(profile, fallbackExcludedIds, remaining)
        : await this.getSerendipityRecommendations(profile, fallbackExcludedIds, remaining);

      return [...primaryResults, ...fallbackResults];
    }

    return primaryResults;
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
   * 候補プール倍率（candidatePoolMultiplier）に基づいてlimitより多めの候補を取得し、
   * シャッフルしてからlimit件を返却する。これにより毎回異なる組み合わせが提供される。
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
    const baseMultiplier = this.config.candidatePoolMultiplier ?? DEFAULT_CANDIDATE_POOL_MULTIPLIER;
    const { maxRelaxationLevels, poolMultiplierStep } = this.relaxationConfig;

    const collectedIds = new Set<string>();
    const allResults: RecommendedArticle[] = [];

    for (let level = 0; level <= maxRelaxationLevels; level++) {
      const currentMultiplier = baseMultiplier + level * poolMultiplierStep;
      const poolSize = limit * currentMultiplier;

      const results = await this.vectorSearch.searchByEmbedding({
        queryVector: profile.preferenceEmbedding!,
        excludeIds: [...excludedIds, ...collectedIds],
        limit: poolSize,
      });

      for (const r of results) {
        if (!collectedIds.has(r.id)) {
          collectedIds.add(r.id);
          allResults.push({
            id: r.id,
            title: r.title,
            similarityScore: r.similarity,
            source: "preference" as const,
            url: r.url,
            objectClass: r.objectClass ?? null,
            rating: r.rating ?? null,
          });
        }
      }

      if (allResults.length >= limit) {
        return this.shuffleArray(allResults).slice(0, limit);
      }

      // 緩和しても0件の場合はこれ以上拡大しても無駄
      if (results.length === 0 && level > 0) {
        break;
      }
    }

    // 取得可能分のみ返却
    return this.shuffleArray(allResults).slice(0, limit);
  }

  /**
   * 配列をFisher-Yatesアルゴリズムでシャッフル
   *
   * 元の配列は変更せず、新しい配列を返す。
   *
   * @param array シャッフル対象の配列
   * @returns シャッフルされた新しい配列
   */
  private shuffleArray<T>(array: readonly T[]): T[] {
    const shuffled = [...array];
    for (let i = shuffled.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    return shuffled;
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

    const adjacentRelaxation: AdjacentRelaxationConfig = {
      maxRelaxationLevels: this.relaxationConfig.maxRelaxationLevels,
      minSimilarityStep: this.relaxationConfig.adjacentMinSimilarityStep,
      maxSimilarityStep: this.relaxationConfig.adjacentMaxSimilarityStep,
      minSimilarityFloor: this.relaxationConfig.adjacentMinSimilarityFloor,
      maxSimilarityCeiling: this.relaxationConfig.adjacentMaxSimilarityCeiling,
    };

    return getSerendipityArticles(
      profile.preferenceEmbedding!,
      excludedIds,
      exploredTags,
      this.vectorSearch,
      this.serendipityConfig,
      limit,
      adjacentRelaxation
    );
  }

  /**
   * ユーザーが既に触れたタグを取得
   *
   * @param visitorId 訪問者ID
   * @returns ユーザーが触れたタグの配列（重複排除済み）
   */
  private async getExploredTags(visitorId: string): Promise<string[]> {
    const viewHistory = await this.storage.getViewHistory(
      visitorId,
      DEFAULT_EXPLORED_TAGS_VIEW_HISTORY_LIMIT
    );

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
   * 除外対象のIDを取得
   *
   * 既読・フィードバック済み・お気に入り済みの記事IDを収集する。
   *
   * @param visitorId 訪問者ID
   * @returns 除外対象の記事ID配列
   */
  private async getExcludedIds(visitorId: string): Promise<string[]> {
    const [viewHistory, feedbacks, favorites] = await Promise.all([
      this.storage.getViewHistory(visitorId, DEFAULT_EXCLUDE_VIEW_HISTORY_LIMIT),
      this.storage.getFeedback(visitorId),
      this.storage.getFavorites(visitorId),
    ]);

    const viewedIds = viewHistory.map((h) => h.articleId);
    const feedbackIds = feedbacks.map((f) => f.articleId);
    const favoriteIds = favorites.map((f) => f.articleId);

    return [...new Set([...viewedIds, ...feedbackIds, ...favoriteIds])];
  }

  /**
   * 嗜好ベクトルを再計算
   *
   * 最新の行動履歴（お気に入り/Like/閲覧/Next）に基づいて
   * 嗜好ベクトルを再計算し、プロファイルを更新する。
   *
   * Next操作のinterestLevelに応じて重みを分配:
   * - high: 深く読んだ → 重み0.3（弱いポジティブ）
   * - medium: 通常の閲覧 → 重み0（影響なし、ベクトル計算に含まない）
   * - low: 即通過 → 重み-0.2（弱いネガティブ）
   *
   * @param visitorId 訪問者ID
   */
  private async recalculatePreferenceVector(visitorId: string): Promise<void> {
    const [feedbacks, viewHistories, favorites] = await Promise.all([
      this.storage.getFeedback(visitorId),
      this.storage.getViewHistory(visitorId),
      this.storage.getFavorites(visitorId),
    ]);

    // Next操作をinterestLevelで分類
    const nextFeedbacks = feedbacks.filter((f) => f.type === "next");
    const nextHighArticleIds = nextFeedbacks
      .filter((f) => f.metadata?.interestLevel === "high")
      .map((f) => f.articleId);
    const nextLowArticleIds = nextFeedbacks
      .filter((f) => f.metadata?.interestLevel === "low")
      .map((f) => f.articleId);

    const input: PreferenceVectorInput = {
      favoriteArticleIds: favorites.map((f) => f.articleId),
      likedArticleIds: feedbacks.filter((f) => f.type === "like").map((f) => f.articleId),
      viewedArticleIds: this.getViewedOnlyArticleIds(feedbacks, viewHistories),
      nextHighArticleIds,
      nextLowArticleIds,
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
   * フィードバックなしの読了記事IDを取得
   *
   * フィードバック（Like/Next）がなく、閲覧のみの記事を抽出する。
   *
   * @param feedbacks フィードバック配列
   * @param viewHistories 閲覧履歴配列
   * @returns フィードバックなしの閲覧記事ID配列
   */
  private getViewedOnlyArticleIds(feedbacks: Feedback[], viewHistories: ViewHistory[]): string[] {
    const feedbackArticleIds = new Set(feedbacks.map((f) => f.articleId));
    const viewedArticleIds = new Set(viewHistories.map((v) => v.articleId));

    return [...viewedArticleIds].filter((id) => !feedbackArticleIds.has(id));
  }
}
