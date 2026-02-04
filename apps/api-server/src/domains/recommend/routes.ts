/**
 * @file POST /recommend エンドポイント
 * @description 推薦取得API
 * @see specs/005-backend-api/005-05-recommend-api/005-05-02.md
 */

import { Hono } from "hono";
import { zValidator } from "@hono/zod-validator";
import type { ZodError } from "zod";
import type { SupabaseClient } from "@supabase/supabase-js";
import { getRecommendationsSchema } from "./schema";
import { RecommendService } from "./service";

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
 * Recommend routes ファクトリ
 *
 * Method chainingでルートを定義し、Hono RPC用の型推論を有効化
 *
 * @param supabase - SupabaseClient
 * @param serviceFactory - テスト用のサービスファクトリ（オプション）
 * @returns Hono router
 */
export const createRecommendRoutes = (
  supabase: SupabaseClient,
  serviceFactory?: () => RecommendService
) => {
  const service = serviceFactory ? serviceFactory() : RecommendService.create(supabase);

  /**
   * POST /recommend
   *
   * 推薦記事を取得
   *
   * @param visitorId - 訪問者ID（UUID）
   * @param limit - 取得件数上限（1-50、デフォルト: 10）
   *
   * Response:
   * - 200 OK: 推薦記事リスト
   * - 400 Bad Request: バリデーションエラー / オンボーディング未完了
   * - 404 Not Found: visitorId未登録
   */
  return new Hono().post(
    "/",
    zValidator("json", getRecommendationsSchema, throwOnValidationError),
    async (c) => {
      const { visitorId, limit } = c.req.valid("json");

      const recommendations = await service.getRecommendations(visitorId, limit);

      return c.json(
        {
          recommendations,
          count: recommendations.length,
          // limitより少ない場合は追加記事なし
          hasMore: recommendations.length >= limit,
        },
        200
      );
    }
  );
};
