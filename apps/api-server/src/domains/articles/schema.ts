/**
 * @file articles ドメインのZodスキーマ
 * @description リクエストバリデーション定義
 * @see specs/005-backend-api/005-04-articles-api/005-04-02.md
 */

import { z } from "zod";

/**
 * GET /articles/search クエリパラメータスキーマ
 *
 * - q: 検索クエリ（2文字以上必須）
 * - limit: 取得件数上限（1〜50、デフォルト10）
 */
export const searchArticlesSchema = z.object({
  q: z.string().min(2, "Query must be at least 2 characters"),
  limit: z.coerce.number().int().min(1).max(50).optional().default(10),
});

/**
 * GET /articles/search クエリパラメータの型
 */
export type SearchArticlesInput = z.infer<typeof searchArticlesSchema>;
