/**
 * @file シグナル処理
 * @description Like/Dislikeフィードバックの記録とプロファイル更新を行う
 * @see specs/004-recommend/004-04-signal-processing/004-04-01.md
 * @see specs/004-recommend/004-04-signal-processing/004-04-02.md
 */

import type { PreferenceStorage, PreferenceProfile, Feedback, ViewHistory } from "../storage/types";
import type { PreferenceProfiler } from "./profiler";

/**
 * シグナル処理クラス
 *
 * ユーザーのLike/Dislikeフィードバックを処理し、
 * ストレージへの保存と嗜好プロファイルの更新を行う。
 * 閲覧履歴の記録と読了シグナル処理も担当する。
 */
export class SignalProcessor {
  constructor(
    private storage: PreferenceStorage,
    private profiler: PreferenceProfiler
  ) {}

  /**
   * フィードバックを記録
   *
   * 1. フィードバックをストレージに保存
   * 2. 嗜好プロファイルを再計算
   * 3. プロファイルをストレージに保存
   *
   * @param visitorId 訪問者ID
   * @param articleId 記事ID
   * @param type フィードバック種別（like/dislike）
   * @returns 更新後の嗜好プロファイル
   * @throws visitorIdまたはarticleIdが空の場合
   */
  async recordFeedback(
    visitorId: string,
    articleId: string,
    type: "like" | "dislike"
  ): Promise<PreferenceProfile> {
    // バリデーション
    if (!visitorId) {
      throw new Error("visitorId is required");
    }
    if (!articleId) {
      throw new Error("articleId is required");
    }

    // フィードバックを作成
    const feedback: Feedback = {
      id: `${visitorId}_${articleId}`,
      visitorId,
      articleId,
      type,
      createdAt: new Date().toISOString(),
    };

    // ストレージに保存（同じ記事への既存フィードバックは上書き）
    await this.storage.addFeedback(feedback);

    // プロファイルを再計算
    const profile = await this.profiler.recalculateProfile(visitorId);

    // プロファイルをストレージに保存
    await this.storage.saveProfile(profile);

    return profile;
  }

  /**
   * 閲覧を記録
   *
   * ユーザーが記事を開いた際にViewHistoryレコードを保存する。
   *
   * @param visitorId 訪問者ID
   * @param articleId 記事ID
   * @param duration 滞在時間（秒）。記録可能な場合に指定
   * @throws visitorIdまたはarticleIdが空の場合
   */
  async recordView(visitorId: string, articleId: string, duration?: number): Promise<void> {
    // バリデーション
    if (!visitorId) {
      throw new Error("visitorId is required");
    }
    if (!articleId) {
      throw new Error("articleId is required");
    }

    const now = Date.now();
    const viewHistory: ViewHistory = {
      id: `${visitorId}_${articleId}_${now}`,
      visitorId,
      articleId,
      viewedAt: new Date(now).toISOString(),
      duration,
    };

    await this.storage.addViewHistory(viewHistory);
  }

  /**
   * 読了を記録
   *
   * ユーザーが記事を最後まで読んだ（Likeなし）際にプロファイルを再計算する。
   * Like/Dislike済みの記事の場合は追加の重みは付かない。
   *
   * @param visitorId 訪問者ID
   * @param articleId 記事ID
   * @returns 更新後の嗜好プロファイル
   * @throws visitorIdまたはarticleIdが空の場合
   */
  async recordReadComplete(visitorId: string, articleId: string): Promise<PreferenceProfile> {
    // バリデーション
    if (!visitorId) {
      throw new Error("visitorId is required");
    }
    if (!articleId) {
      throw new Error("articleId is required");
    }

    // プロファイルを再計算（Profilerが閲覧履歴からタグ重みを計算）
    const profile = await this.profiler.recalculateProfile(visitorId);

    // プロファイルをストレージに保存
    await this.storage.saveProfile(profile);

    return profile;
  }

  /**
   * 閲覧履歴を取得
   *
   * 指定したvisitorIdの閲覧履歴を日付順（新しい順）で取得する。
   *
   * @param visitorId 訪問者ID
   * @param limit 取得件数上限（省略時は全件）
   * @returns 閲覧履歴の配列（日付降順）
   */
  async getViewHistory(visitorId: string, limit?: number): Promise<ViewHistory[]> {
    // ストレージから全件取得してソート
    const histories = await this.storage.getViewHistory(visitorId);
    // 日付降順でソート（新しい順）
    const sorted = histories.sort(
      (a, b) => new Date(b.viewedAt).getTime() - new Date(a.viewedAt).getTime()
    );
    // limitがある場合は件数制限
    return limit !== undefined ? sorted.slice(0, limit) : sorted;
  }

  /**
   * 閲覧時間を更新
   *
   * 既存の閲覧履歴のdurationを後から更新する。
   * 最新の閲覧履歴（同一記事）を更新する。
   *
   * @param visitorId 訪問者ID
   * @param articleId 記事ID
   * @param duration 滞在時間（秒）
   */
  async updateViewDuration(visitorId: string, articleId: string, duration: number): Promise<void> {
    const histories = await this.storage.getViewHistory(visitorId);

    // 該当記事の最新の閲覧履歴を見つける
    const targetHistory = histories
      .filter((h) => h.articleId === articleId)
      .sort((a, b) => new Date(b.viewedAt).getTime() - new Date(a.viewedAt).getTime())[0];

    if (targetHistory) {
      // durationを更新した新しい履歴を保存
      const updatedHistory: ViewHistory = {
        ...targetHistory,
        duration,
      };
      await this.storage.addViewHistory(updatedHistory);
    }
  }
}
