/**
 * @file Recommend APIスキーマ
 * @description POST /recommend のバリデーションスキーマ
 * @see specs/005-backend-api/005-05-recommend-api/005-05-02.md
 */

import { z } from "zod";

/**
 * POST /recommend リクエストボディのバリデーションスキーマ
 */
export const getRecommendationsSchema = z.object({
  visitorId: z.string().uuid(),
  limit: z.number().int().min(1).max(50).optional().default(10),
  /** 除外する記事IDリスト（既に取得済みの記事を除外するために使用） */
  excludeIds: z.array(z.string()).optional().default([]),
});

export type GetRecommendationsInput = z.infer<typeof getRecommendationsSchema>;
