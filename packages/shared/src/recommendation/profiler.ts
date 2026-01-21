/**
 * @file 嗜好プロファイル計算
 * @description ユーザーの閲覧履歴・フィードバックから嗜好プロファイルを計算する
 * @see specs/004-recommend/004-01-recommend-foundation/004-01-03.md
 */

import type { PreferenceStorage, PreferenceProfile, StarterPackType } from "../storage/types";

/** 重み計算の定数 */
const WEIGHTS = {
  /** Like時の重み増分 */
  LIKE: 1.0,
  /** 読了（Likeなし）時の重み増分 */
  VIEW_COMPLETE: 0.3,
  /** 読了とみなす最小閲覧時間（秒） */
  MIN_VIEW_DURATION: 60,
} as const;

/**
 * スターターパック別の初期タグ重み定義
 */
const STARTER_PACK_TAGS: Record<Exclude<StarterPackType, "custom">, Record<string, number>> = {
  horror: {
    horror: 1.0,
    keter: 0.8,
    cognitohazard: 0.6,
  },
  surreal: {
    surreal: 1.0,
    euclid: 0.8,
    narrative: 0.6,
  },
  scientific: {
    scientific: 1.0,
    safe: 0.8,
    technology: 0.6,
  },
  heartwarming: {
    heartwarming: 1.0,
    safe: 0.8,
    emotional: 0.6,
  },
  mystery: {
    mystery: 1.0,
    euclid: 0.8,
    unexplained: 0.6,
  },
};

/**
 * 嗜好プロファイル計算クラス
 *
 * ユーザーの行動履歴（Like/Dislike/閲覧）から嗜好プロファイルを計算する。
 */
export class PreferenceProfiler {
  constructor(private storage: PreferenceStorage) {}

  /**
   * 嗜好プロファイルを再計算
   *
   * フィードバック（Like/Dislike）と閲覧履歴から嗜好プロファイルを計算する。
   * - Like: +1.0
   * - 読了（Likeなし）: +0.3
   * - Dislike: 0（タグ重みに影響しない）
   *
   * @param visitorId 訪問者ID
   * @returns 計算された嗜好プロファイル
   * @throws visitorIdが空の場合
   */
  async recalculateProfile(visitorId: string): Promise<PreferenceProfile> {
    if (!visitorId) {
      throw new Error("visitorId is required");
    }

    const [feedbacks, viewHistories] = await Promise.all([
      this.storage.getFeedback(visitorId),
      this.storage.getViewHistory(visitorId),
    ]);

    // タグ重みを計算
    const rawWeights = await this.calculateTagWeights(feedbacks, viewHistories);

    // 正規化
    const tagWeights = this.normalizeWeights(rawWeights);

    const now = new Date().toISOString();

    return {
      visitorId,
      tagWeights,
      objectClassPreference: {},
      createdAt: now,
      updatedAt: now,
    };
  }

  /**
   * スターターパックから初期プロファイルを生成
   *
   * オンボーディング時に選択されたスターターパックに基づいて
   * 初期の嗜好プロファイルを設定する。
   *
   * @param visitorId 訪問者ID
   * @param starterPack スターターパック種別
   * @param customTags customの場合の選択タグ
   * @returns 初期化された嗜好プロファイル
   */
  async initializeFromStarterPack(
    visitorId: string,
    starterPack: StarterPackType,
    customTags?: string[]
  ): Promise<PreferenceProfile> {
    if (!visitorId) {
      throw new Error("visitorId is required");
    }

    let tagWeights: Record<string, number>;

    if (starterPack === "custom" && customTags) {
      // customの場合は指定されたタグを均等に重み付け
      tagWeights = Object.fromEntries(customTags.map((tag) => [tag, 1.0]));
    } else if (starterPack !== "custom") {
      tagWeights = { ...STARTER_PACK_TAGS[starterPack] };
    } else {
      tagWeights = {};
    }

    const now = new Date().toISOString();

    const profile: PreferenceProfile = {
      visitorId,
      tagWeights,
      objectClassPreference: {},
      starterPack,
      onboardingCompletedAt: now,
      createdAt: now,
      updatedAt: now,
    };

    await this.storage.saveProfile(profile);

    return profile;
  }

  /**
   * フィードバックと閲覧履歴からタグ重みを計算
   *
   * @param feedbacks フィードバック一覧
   * @param viewHistories 閲覧履歴一覧
   * @returns タグ名 → 重み値のマップ
   */
  private async calculateTagWeights(
    feedbacks: { articleId: string; type: "like" | "dislike" }[],
    viewHistories: { articleId: string; duration?: number }[]
  ): Promise<Record<string, number>> {
    const weights: Record<string, number> = {};

    // Like記事のIDセット（重複排除用）
    const likedArticleIds = new Set(
      feedbacks.filter((f) => f.type === "like").map((f) => f.articleId)
    );

    // Dislike記事のIDセット
    const dislikedArticleIds = new Set(
      feedbacks.filter((f) => f.type === "dislike").map((f) => f.articleId)
    );

    // Like記事のタグに+1.0
    for (const articleId of likedArticleIds) {
      const tags = await this.storage.getArticleTags(articleId);
      if (!tags) continue;

      for (const tag of tags) {
        weights[tag] = (weights[tag] ?? 0) + WEIGHTS.LIKE;
      }
    }

    // 読了記事（LikeもDislikeもない）のタグに+0.3
    const completedViews = viewHistories.filter(
      (vh) =>
        vh.duration !== undefined &&
        vh.duration >= WEIGHTS.MIN_VIEW_DURATION &&
        !likedArticleIds.has(vh.articleId) &&
        !dislikedArticleIds.has(vh.articleId)
    );

    // 記事ごとに1回だけカウント（重複除去）
    const completedArticleIds = new Set(completedViews.map((vh) => vh.articleId));

    for (const articleId of completedArticleIds) {
      const tags = await this.storage.getArticleTags(articleId);
      if (!tags) continue;

      for (const tag of tags) {
        weights[tag] = (weights[tag] ?? 0) + WEIGHTS.VIEW_COMPLETE;
      }
    }

    return weights;
  }

  /**
   * 重みを0〜1の範囲に正規化
   *
   * 最大値を1.0として正規化する。全ての重みが0の場合は空オブジェクトを返す。
   *
   * @param weights 正規化前の重み
   * @returns 正規化後の重み
   */
  private normalizeWeights(weights: Record<string, number>): Record<string, number> {
    const values = Object.values(weights);
    if (values.length === 0) return {};

    const max = Math.max(...values);
    if (max === 0) return {};

    return Object.fromEntries(Object.entries(weights).map(([tag, weight]) => [tag, weight / max]));
  }
}
