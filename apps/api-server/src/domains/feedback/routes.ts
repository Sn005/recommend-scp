/**
 * @file POST /feedback エンドポイント
 * @description フィードバック記録API
 * @see specs/005-backend-api/005-06-feedback-api/005-06-02.md
 */

import { Hono } from "hono";
import { zValidator } from "@hono/zod-validator";
import type { ZodError } from "zod";
import type { SupabaseClient } from "@supabase/supabase-js";
import { recordFeedbackSchema } from "./schema";
import { FeedbackService } from "./service";
import { FeedbackRepository } from "./repository";
import { VisitorsRepository } from "../visitors/repository";

/**
 * zValidatorのバリデーションエラー時にZodErrorをスロー
 *
 * これによりapp.onErrorでRFC 7807形式のエラーレスポンスを返す
 */
const throwOnValidationError = <T>(result: { success: boolean; error?: ZodError<T> }) => {
  if (!result.success && result.error) {
    throw result.error;
  }
};

/**
 * Feedback routes ファクトリ
 *
 * Method chainingでルートを定義し、Hono RPC用の型推論を有効化
 *
 * @param supabase - SupabaseClient
 * @param serviceFactory - テスト用のサービスファクトリ（オプション）
 * @returns Hono router
 */
export const createFeedbackRoutes = (
  supabase: SupabaseClient,
  serviceFactory?: () => FeedbackService
) => {
  const feedbackRepo = new FeedbackRepository(supabase);
  const visitorsRepo = new VisitorsRepository(supabase);
  const service = serviceFactory
    ? serviceFactory()
    : new FeedbackService(feedbackRepo, visitorsRepo, supabase);

  /**
   * POST /feedback
   *
   * フィードバック（Like/Next）を記録
   *
   * @param visitorId - 訪問者ID（UUID）
   * @param articleId - 記事ID
   * @param type - フィードバック種別（like/next）
   * @param metadata - 「次へ」操作メタデータ（オプション）
   *
   * Response:
   * - 200 OK: フィードバック記録成功
   * - 400 Bad Request: バリデーションエラー
   * - 404 Not Found: visitorId未登録
   */
  return new Hono().post(
    "/",
    zValidator("json", recordFeedbackSchema, throwOnValidationError),
    async (c) => {
      const { visitorId, articleId, type, metadata } = c.req.valid("json");
      await service.recordFeedback(visitorId, articleId, type, metadata);

      return c.json(
        {
          success: true,
          visitorId,
          articleId,
          type,
        },
        200
      );
    }
  );
};
