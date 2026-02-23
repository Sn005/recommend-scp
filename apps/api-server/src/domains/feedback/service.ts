/**
 * @file FeedbackService
 * @description feedbackドメインのビジネスロジック層
 * @see specs/005-backend-api/005-06-feedback-api/005-06-01.md
 */

import type { FeedbackRepository } from "./repository";
import type { VisitorsRepository } from "../visitors/repository";
import type { FeedbackMetadata } from "./schema";
import type { SupabaseClient } from "@supabase/supabase-js";
import { NotFoundError } from "../../lib/errors";
import { logger } from "../../lib/logger";

/**
 * FeedbackService
 *
 * フィードバックの記録に関するビジネスロジックを提供。
 * visitorIdの存在確認後、フィードバックを保存する。
 * next操作時はview_historyにも自動記録する。
 */
export class FeedbackService {
  constructor(
    private readonly feedbackRepo: FeedbackRepository,
    private readonly visitorsRepo: VisitorsRepository,
    private readonly supabase: SupabaseClient
  ) {}

  /**
   * フィードバックを記録
   *
   * 1. visitorIdの存在確認
   * 2. フィードバックを保存（metadata含む）
   * 3. next操作時はview_historyにも自動記録
   * 4. 嗜好ベクトルの再計算は次回推薦時に実行（遅延評価）
   *
   * @param visitorId - 訪問者ID
   * @param articleId - 記事ID
   * @param type - フィードバック種別（like/next）
   * @param metadata - 「次へ」操作メタデータ（オプション）
   * @throws NotFoundError visitorIdが未登録の場合
   */
  recordFeedback = async (
    visitorId: string,
    articleId: string,
    type: "like" | "next",
    metadata?: FeedbackMetadata
  ): Promise<void> => {
    // visitorIdの存在確認
    const visitor = await this.visitorsRepo.findByVisitorId(visitorId);
    if (!visitor) {
      throw new NotFoundError("Visitor", visitorId);
    }

    // フィードバックを保存（metadata含む）
    await this.feedbackRepo.save({
      visitorId,
      articleId,
      type,
      metadata,
      createdAt: new Date().toISOString(),
    });

    // next操作時はview_historyにも自動記録（GAP-4解消）
    if (type === "next") {
      await this.recordViewHistory(visitorId, articleId, metadata?.dwellTime);
    }

    // 嗜好ベクトル再計算は次回推薦時に実行（遅延評価）
  };

  /**
   * view_historyに閲覧記録を追加
   *
   * @param visitorId - 訪問者ID
   * @param articleId - 記事ID
   * @param duration - 滞在時間（秒）
   */
  private recordViewHistory = async (
    visitorId: string,
    articleId: string,
    duration?: number
  ): Promise<void> => {
    const { error } = await this.supabase.from("view_history").insert({
      visitor_id: visitorId,
      article_id: articleId,
      viewed_at: new Date().toISOString(),
      duration: duration !== undefined ? Math.round(duration) : null,
    });

    if (error) {
      // view_history記録の失敗はフィードバック記録自体を失敗させない
      logger.warn({ error, visitorId, articleId }, "view_history記録に失敗");
    }
  };
}
