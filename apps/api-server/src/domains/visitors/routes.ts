/**
 * @file POST /visitors エンドポイント
 * @description visitorId登録API
 * @see specs/005-backend-api/005-03-visitors-api/005-03-02.md
 */

import { Hono } from "hono";
import { zValidator } from "@hono/zod-validator";
import type { ZodError } from "zod";
import type { SupabaseClient } from "@supabase/supabase-js";
import { registerVisitorSchema, resetPreferenceSchema } from "./schema";
import { VisitorsService } from "./service";
import { VisitorsRepository } from "./repository";
import { SupabasePreferenceStorage } from "../../lib/storage/supabase-preference-storage";

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
 * Visitors routes ファクトリ
 *
 * Method chainingでルートを定義し、Hono RPC用の型推論を有効化
 *
 * @param supabase - SupabaseClient
 * @param serviceFactory - テスト用のサービスファクトリ（オプション）
 * @returns Hono router
 */
export const createVisitorsRoutes = (
  supabase: SupabaseClient,
  serviceFactory?: (repo: VisitorsRepository) => VisitorsService
) => {
  const repository = new VisitorsRepository(supabase);
  const storage = new SupabasePreferenceStorage(supabase);
  const service = serviceFactory
    ? serviceFactory(repository)
    : new VisitorsService(repository, storage);

  /**
   * POST /visitors
   *
   * visitorIdを登録または既存取得
   *
   * @param visitorId - クライアント生成UUID
   * @returns RegisterVisitorResult
   *
   * Response:
   * - 201 Created: 新規登録成功
   * - 200 OK: 既存visitorId取得
   * - 400 Bad Request: バリデーションエラー
   */
  return new Hono()
    .post("/", zValidator("json", registerVisitorSchema, throwOnValidationError), async (c) => {
      const { visitorId } = c.req.valid("json");
      const result = await service.registerVisitor(visitorId);

      const status = result.isNew ? 201 : 200;
      return c.json(result, status);
    })
    .post(
      "/reset",
      zValidator("json", resetPreferenceSchema, throwOnValidationError),
      async (c) => {
        const { visitorId } = c.req.valid("json");
        await service.resetPreference(visitorId);
        return c.json({ success: true, visitorId }, 200);
      }
    );
};
