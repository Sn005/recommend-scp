/**
 * @file FeedbackService
 * @description feedbackドメインのビジネスロジック層
 * @see specs/005-backend-api/005-06-feedback-api/005-06-01.md
 */

import type { FeedbackRepository } from "./repository";
import type { VisitorsRepository } from "../visitors/repository";
import { NotFoundError } from "../../lib/errors";

/**
 * FeedbackService
 *
 * フィードバックの記録に関するビジネスロジックを提供。
 * visitorIdの存在確認後、フィードバックを保存する。
 */
export class FeedbackService {
  constructor(
    private readonly feedbackRepo: FeedbackRepository,
    private readonly visitorsRepo: VisitorsRepository
  ) {}

  /**
   * フィードバックを記録
   *
   * 1. visitorIdの存在確認
   * 2. フィードバックを保存
   * 3. 嗜好ベクトルの再計算は次回推薦時に実行（遅延評価）
   *
   * @param visitorId - 訪問者ID
   * @param articleId - 記事ID
   * @param type - フィードバック種別（like/dislike/skip）
   * @throws NotFoundError visitorIdが未登録の場合
   */
  recordFeedback = async (
    visitorId: string,
    articleId: string,
    type: "like" | "dislike" | "skip"
  ): Promise<void> => {
    // visitorIdの存在確認
    const visitor = await this.visitorsRepo.findByVisitorId(visitorId);
    if (!visitor) {
      throw new NotFoundError("Visitor", visitorId);
    }

    // フィードバックを保存
    await this.feedbackRepo.save({
      visitorId,
      articleId,
      type,
      createdAt: new Date().toISOString(),
    });

    // 嗜好ベクトル再計算は次回推薦時に実行（遅延評価）
  };
}
