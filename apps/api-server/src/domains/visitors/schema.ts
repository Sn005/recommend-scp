/**
 * @file visitors ドメインのZodスキーマ
 * @description リクエストバリデーション定義
 * @see specs/005-backend-api/005-03-visitors-api/005-03-02.md
 */

import { z } from "zod";

/**
 * POST /visitors リクエストボディスキーマ
 *
 * visitorIdはUUID形式であること。
 */
export const registerVisitorSchema = z.object({
  visitorId: z.string().uuid("visitorId must be a valid UUID"),
});

/**
 * POST /visitors リクエストボディの型
 */
export type RegisterVisitorInput = z.infer<typeof registerVisitorSchema>;

/**
 * POST /visitors/reset リクエストボディスキーマ
 *
 * visitorIdはUUID形式であること。
 */
export const resetPreferenceSchema = z.object({
  visitorId: z.string().uuid("visitorIdはUUID形式である必要があります"),
});

/**
 * POST /visitors/reset リクエストボディの型
 */
export type ResetPreferenceInput = z.infer<typeof resetPreferenceSchema>;
