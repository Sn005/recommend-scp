/**
 * @file GET/DELETE /favorites エンドポイント
 * @description お気に入り一覧取得・削除API
 * @see specs/005-backend-api/005-10-favorites-api/005-10-02.md
 */

import { Hono } from "hono";
import { zValidator } from "@hono/zod-validator";
import type { ZodError } from "zod";
import type { SupabaseClient } from "@supabase/supabase-js";
import { getFavoritesQuerySchema, deleteFavoriteBodySchema } from "./schema";
import { FavoritesService } from "./service";
import { FavoritesRepository } from "./repository";
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
 * Favorites routes ファクトリ
 *
 * Method chainingでルートを定義し、Hono RPC用の型推論を有効化
 *
 * @param supabase - SupabaseClient
 * @param serviceFactory - テスト用のサービスファクトリ（オプション）
 * @returns Hono router
 */
export const createFavoritesRoutes = (
  supabase: SupabaseClient,
  serviceFactory?: () => FavoritesService
) => {
  const favoritesRepo = new FavoritesRepository(supabase);
  const visitorsRepo = new VisitorsRepository(supabase);
  const service = serviceFactory
    ? serviceFactory()
    : new FavoritesService(favoritesRepo, visitorsRepo);

  return (
    new Hono()
      /**
       * GET /favorites
       *
       * お気に入り一覧を取得
       *
       * @param visitorId - 訪問者ID（UUID）- クエリパラメータ
       *
       * Response:
       * - 200 OK: { favorites: FavoriteWithArticle[], total: number }
       * - 400 Bad Request: バリデーションエラー
       * - 404 Not Found: visitorId未登録
       */
      .get("/", zValidator("query", getFavoritesQuerySchema, throwOnValidationError), async (c) => {
        const { visitorId } = c.req.valid("query");
        const favorites = await service.getFavorites(visitorId);

        return c.json({
          favorites,
          total: favorites.length,
        });
      })
      /**
       * DELETE /favorites/:articleId
       *
       * お気に入りを削除
       *
       * @param articleId - 記事ID - パスパラメータ
       * @param visitorId - 訪問者ID（UUID）- リクエストボディ
       *
       * Response:
       * - 204 No Content: 削除成功
       * - 400 Bad Request: バリデーションエラー
       * - 404 Not Found: visitorId未登録 or お気に入り未登録
       */
      .delete(
        "/:articleId",
        zValidator("json", deleteFavoriteBodySchema, throwOnValidationError),
        async (c) => {
          const articleId = c.req.param("articleId");
          const { visitorId } = c.req.valid("json");

          await service.removeFavorite(visitorId, articleId);

          return c.body(null, 204);
        }
      )
  );
};
