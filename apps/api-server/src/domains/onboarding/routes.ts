/**
 * @file Onboarding API エンドポイント
 * @description GET /onboarding/packs, POST /onboarding/select, POST /onboarding/select/custom
 * @see specs/005-backend-api/005-07-onboarding-api/005-07-02.md
 */

import { Hono } from "hono";
import { zValidator } from "@hono/zod-validator";
import type { ZodError } from "zod";
import type { SupabaseClient } from "@supabase/supabase-js";
import { selectPackSchema, selectCustomSchema } from "./schema";
import { createOnboardingApiService, type OnboardingApiService } from "./service";

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
 * Onboarding routes ファクトリ
 *
 * Method chainingでルートを定義し、Hono RPC用の型推論を有効化
 *
 * @param supabase - SupabaseClient
 * @param serviceFactory - テスト用のサービスファクトリ（オプション）
 * @returns Hono router
 */
export const createOnboardingRoutes = (
  supabase: SupabaseClient,
  serviceFactory?: () => OnboardingApiService
) => {
  const service = serviceFactory ? serviceFactory() : createOnboardingApiService(supabase);

  /**
   * GET /onboarding/packs - スターターパック一覧を取得
   * POST /onboarding/select - スターターパックを選択
   * POST /onboarding/select/custom - カスタム記事選択
   */
  return new Hono()
    .get("/packs", (c) => {
      const packs = service.getStarterPacks();

      // CDNキャッシュ可能に設定
      c.header("Cache-Control", "public, max-age=3600");

      return c.json({ packs }, 200);
    })
    .post("/select", zValidator("json", selectPackSchema, throwOnValidationError), async (c) => {
      const { visitorId, packType } = c.req.valid("json");
      await service.selectPack(visitorId, packType);

      return c.json(
        {
          success: true,
          visitorId,
          packType,
        },
        200
      );
    })
    .post(
      "/select/custom",
      zValidator("json", selectCustomSchema, throwOnValidationError),
      async (c) => {
        const { visitorId, articleIds } = c.req.valid("json");
        await service.selectCustom(visitorId, articleIds);

        return c.json(
          {
            success: true,
            visitorId,
            articleCount: articleIds.length,
          },
          200
        );
      }
    );
};
