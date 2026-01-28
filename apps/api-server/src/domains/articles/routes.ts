/**
 * @file GET /articles/search エンドポイント
 * @description ベクトル検索API
 * @see specs/005-backend-api/005-04-articles-api/005-04-02.md
 */

import { Hono } from "hono";
import { zValidator } from "@hono/zod-validator";
import type { ZodError } from "zod";
import type { SupabaseClient } from "@supabase/supabase-js";
import { searchArticlesSchema } from "./schema";
import { ArticlesService } from "./service";
import { ArticlesRepository } from "./repository";

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
 * Articles routes ファクトリ
 *
 * Method chainingでルートを定義し、Hono RPC用の型推論を有効化
 *
 * @param supabase - SupabaseClient
 * @param serviceFactory - テスト用のサービスファクトリ（オプション）
 * @returns Hono router
 */
export const createArticlesRoutes = (
  supabase: SupabaseClient,
  serviceFactory?: (repo: ArticlesRepository) => ArticlesService
) => {
  const repository = new ArticlesRepository(supabase);
  const service = serviceFactory ? serviceFactory(repository) : new ArticlesService(repository);

  /**
   * GET /articles/search
   *
   * テキストクエリによるベクトル検索
   *
   * @param q - 検索クエリ（2文字以上）
   * @param limit - 取得件数上限（1〜50、デフォルト10）
   * @returns SearchArticlesResult
   *
   * Response:
   * - 200 OK: 検索成功
   * - 400 Bad Request: バリデーションエラー（クエリなし、1文字クエリ等）
   */
  return new Hono().get(
    "/search",
    zValidator("query", searchArticlesSchema, throwOnValidationError),
    async (c) => {
      const { q, limit } = c.req.valid("query");
      const result = await service.searchArticles(q, { limit });
      return c.json(result, 200);
    }
  );
};
