/**
 * @file Onboardingエンドポイントのバリデーションスキーマ
 * @see specs/005-backend-api/005-07-onboarding-api/005-07-02.md
 */

import { z } from "zod";

/**
 * スターターパック選択スキーマ
 *
 * POST /onboarding/select で使用。
 * 複数パック選択をサポート（タグを統合）。
 * customは別エンドポイント（/select/custom）で使用するため除外。
 */
export const selectPackSchema = z.object({
  visitorId: z.string().uuid(),
  packTypes: z
    .array(z.enum(["classic", "horror", "scifi", "heartwarming", "mystery", "jp"]))
    .min(1, "At least 1 pack must be selected"),
});

/**
 * カスタム記事選択スキーマ
 *
 * POST /onboarding/select/custom で使用。
 * 最低3件の記事IDが必要。
 */
export const selectCustomSchema = z.object({
  visitorId: z.string().uuid(),
  articleIds: z
    .array(
      z
        .string()
        .min(1)
        .max(100)
        .regex(/^[a-zA-Z0-9\-_]+$/)
    )
    .min(3, "At least 3 articles must be selected"),
});

/** スターターパック選択入力型 */
export type SelectPackInput = z.infer<typeof selectPackSchema>;

/** カスタム記事選択入力型 */
export type SelectCustomInput = z.infer<typeof selectCustomSchema>;
