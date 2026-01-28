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
});

export type GetRecommendationsInput = z.infer<typeof getRecommendationsSchema>;
