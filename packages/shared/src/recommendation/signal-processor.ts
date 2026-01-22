/**
 * @file シグナル処理
 * @description Like/Dislikeフィードバックの記録とプロファイル更新を行う
 * @see specs/004-recommend/004-04-signal-processing/004-04-01.md
 */

import type { PreferenceStorage, PreferenceProfile, Feedback } from "../storage/types";
import type { PreferenceProfiler } from "./profiler";

/**
 * シグナル処理クラス
 *
 * ユーザーのLike/Dislikeフィードバックを処理し、
 * ストレージへの保存と嗜好プロファイルの更新を行う。
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
}
