/**
 * @file favorites ドメイン Zodスキーマ
 * @description お気に入りAPI のリクエストバリデーション
 * @see specs/005-backend-api/005-10-favorites-api/005-10-02.md
 */

import { z } from "zod";

/**
 * GET /favorites クエリパラメータ
 */
export const getFavoritesQuerySchema = z.object({
  visitorId: z.string().uuid(),
});

/**
 * POST /favorites/:articleId リクエストボディ
 */
export const addFavoriteBodySchema = z.object({
  visitorId: z.string().uuid(),
});

/**
 * DELETE /favorites/:articleId リクエストボディ
 */
export const deleteFavoriteBodySchema = z.object({
  visitorId: z.string().uuid(),
});
