/**
 * @file 推薦エンジンコア
 * @description Embeddingベースの嗜好ベクトルを使用した推薦エンジン
 * @see specs/004-recommend/004-02-recommend-engine/004-02-01.md
 * @see specs/004-recommend/004-02-recommend-engine/004-02-02.md
 */

import type {
  PreferenceStorage,
  PreferenceProfile,
  ViewHistory,
  Feedback,
  Favorite,
  RecommendationLog,
} from "../storage/types";
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
 *
 * recalculateOnRequest は既定で false。
 * 嗜好ベクトル再計算は `/recommend` の critical path に載ると
 * saveProfile UPDATE と追加の getProfile/getEmbeddings が発生し、体感速度を悪化させるため、
 * 非同期ジョブ（バッチ or 別エンドポイント）で実施する運用に寄せる。
 * 明示的に true を指定した呼び出し側（テスト等）では従来通りの振る舞い。
 *
 * TODO: バッチ再計算エンドポイント（例: /internal/recalculate-preferences）を
 *   実装するまでは、フィードバック後の推薦精度更新は onboarding 完了時の
 *   初期ベクトルに依存する。運用上の暫定状態。
 */
const DEFAULT_CONFIG: RecommendationEngineConfig = {
  recalculateOnRequest: false,
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
   * @param additionalExcludeIds 追加で除外する記事ID
   * @param preloadedProfile 呼び出し側で事前取得済みの profile。
   *        渡された場合、recalculate off のときは storage.getProfile の再呼び出しを省略する
   *        （サービス層の onboarding チェックなどで取得済みの profile を再利用）。
   *        recalculate on のときは saveProfile 後の値を得るため再取得される。
   * @returns 推薦記事リスト（類似度降順）
   * @throws オンボーディング未完了の場合
   */
  async getRecommendations(
    visitorId: string,
    limit: number = 10,
    additionalExcludeIds: string[] = [],
    preloadedProfile: PreferenceProfile | null = null
  ): Promise<RecommendedArticle[]> {
    // 全行動データを1回だけ並列取得（recalculate + excludeIds + shouldForceSerendipity で共用）
    const [feedbacks, viewHistories, favorites, recentLogs] = await Promise.all([
      this.storage.getFeedback(visitorId),
      this.storage.getViewHistory(visitorId, DEFAULT_EXCLUDE_VIEW_HISTORY_LIMIT),
      this.storage.getFavorites(visitorId),
      this.storage.getRecommendationLog(visitorId, 5),
    ]);

    // 嗜好ベクトルを再計算（バッチEmbedding取得で高速化）
    let profile: PreferenceProfile | null = preloadedProfile;
    if (this.config.recalculateOnRequest) {
      await this.recalculatePreferenceVector(visitorId, feedbacks, viewHistories, favorites);
      // recalculate 後は saveProfile による更新後の profile を使うため必ず再取得
      profile = await this.storage.getProfile(visitorId);
    } else if (!profile) {
      profile = await this.storage.getProfile(visitorId);
    }

    if (!profile?.preferenceEmbedding) {
      throw new Error("Onboarding not completed: preferenceEmbedding is missing");
    }

    // 除外対象をキャッシュデータから導出（追加DBクエリなし）
    const baseExcludedIds = this.deriveExcludedIds(viewHistories, feedbacks, favorites);
    const excludedIds = [...new Set([...baseExcludedIds, ...additionalExcludeIds])];

    // 連続類似検出（キャッシュデータから判定、追加クエリなし）
    const forceSerendipity = this.checkForceSerendipity(recentLogs);

    // 80/20 判定: explorationRateの確率でセレンディピティ推薦
    const isSerendipity =
      forceSerendipity || Math.random() < this.serendipityConfig.explorationRate;

    // プライマリパスで取得
    const primaryResults = isSerendipity
      ? await this.getSerendipityRecommendations(profile, excludedIds, limit, viewHistories)
      : await this.getPreferenceRecommendations(profile, excludedIds, limit);

    // フォールバック: プライマリがlimit未満の場合、代替パスで不足分を補充
    if (primaryResults.length < limit) {
      const primaryIds = primaryResults.map((r) => r.id);
      const fallbackExcludedIds = [...excludedIds, ...primaryIds];
      const remaining = limit - primaryResults.length;

      const fallbackResults = isSerendipity
        ? await this.getPreferenceRecommendations(profile, fallbackExcludedIds, remaining)
        : await this.getSerendipityRecommendations(
            profile,
            fallbackExcludedIds,
            remaining,
            viewHistories
          );

      return [...primaryResults, ...fallbackResults];
    }

    return primaryResults;
  }

  /**
   * 連続類似検出
   *
   * 直近5件の推薦が全て "preference" の場合、冒険枠を強制する。
   *
   * @param recentLogs 直近の推薦ログ（事前取得済み）
   * @returns 冒険枠を強制すべきかどうか
   */
  private checkForceSerendipity(recentLogs: RecommendationLog[]): boolean {
    if (recentLogs.length < 5) {
      return false;
    }

    return recentLogs.every((log) => log.source === "preference");
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
   * @param viewHistories 閲覧履歴（事前取得済み、タグ取得に使用）
   * @returns セレンディピティ推薦記事リスト
   */
  private async getSerendipityRecommendations(
    profile: PreferenceProfile,
    excludedIds: string[],
    limit: number,
    viewHistories: ViewHistory[]
  ): Promise<RecommendedArticle[]> {
    const exploredTags = await this.getExploredTags(viewHistories);

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
   * 事前取得済みの閲覧履歴からタグをバッチ取得する。
   * N+1クエリ（getArticleTags × N）をバッチ取得（1クエリ）に最適化。
   *
   * @param viewHistories 閲覧履歴（事前取得済み）
   * @returns ユーザーが触れたタグの配列（重複排除済み）
   */
  private async getExploredTags(viewHistories: ViewHistory[]): Promise<string[]> {
    // タグ取得用の閲覧履歴は上限50件（事前取得済みの200件からスライス）
    const limitedHistory = viewHistories.slice(0, DEFAULT_EXPLORED_TAGS_VIEW_HISTORY_LIMIT);
    const articleIds = limitedHistory.map((vh) => vh.articleId);

    // バッチ取得（N+1 → 1クエリ）
    const tagMap = await this.storage.getArticleTagsBatch(articleIds);

    const allTags = [...tagMap.values()].flat();
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
   * 除外対象のIDを導出
   *
   * 事前取得済みの行動データから除外対象記事IDを導出する。
   * 追加のDBクエリは不要。
   *
   * @param viewHistories 閲覧履歴（事前取得済み）
   * @param feedbacks フィードバック（事前取得済み）
   * @param favorites お気に入り（事前取得済み）
   * @returns 除外対象の記事ID配列
   */
  private deriveExcludedIds(
    viewHistories: ViewHistory[],
    feedbacks: Feedback[],
    favorites: Favorite[]
  ): string[] {
    const viewedIds = viewHistories.map((h) => h.articleId);
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
   * バッチEmbedding取得により、N+1クエリ問題を回避。
   * 全記事IDを集約して1回のクエリで全Embeddingを取得する。
   *
   * Next操作のinterestLevelに応じて重みを分配:
   * - high: 深く読んだ → 重み0.3（弱いポジティブ）
   * - medium: 通常の閲覧 → 重み0（影響なし、ベクトル計算に含まない）
   * - low: 即通過 → 重み-0.2（弱いネガティブ）
   *
   * @param visitorId 訪問者ID
   * @param feedbacks フィードバック（事前取得済み）
   * @param viewHistories 閲覧履歴（事前取得済み）
   * @param favorites お気に入り（事前取得済み）
   */
  private async recalculatePreferenceVector(
    visitorId: string,
    feedbacks: Feedback[],
    viewHistories: ViewHistory[],
    favorites: Favorite[]
  ): Promise<void> {
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

    // 全記事IDを集約してバッチ取得（N+1 → 1クエリ）
    const allArticleIds = [
      ...new Set([
        ...input.favoriteArticleIds,
        ...input.likedArticleIds,
        ...input.viewedArticleIds,
        ...input.nextHighArticleIds,
        ...input.nextLowArticleIds,
      ]),
    ];

    const embeddingMap = await this.vectorSearch.getEmbeddings(allArticleIds);

    // マップルックアップをコールバックとして渡す（DBアクセスなし）
    const preferenceEmbedding = await calculatePreferenceVector(
      input,
      async (id) => embeddingMap.get(id) ?? null
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
