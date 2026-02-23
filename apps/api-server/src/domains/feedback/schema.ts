/**
 * @file Feedback APIスキーマ
 * @description POST /feedback のバリデーションスキーマ
 * @see specs/005-backend-api/005-06-feedback-api/005-06-02.md
 * @see specs/006-frontend/006-05-transition-ux/006-05-06.md
 */

import { z } from "zod";

/**
 * 「次へ」操作メタデータのバリデーションスキーマ
 *
 * interestLevel: 行動パターン分類
 * - low: 即通過（scrollDepth < 10 かつ dwellTime < 5秒）
 * - medium: 通常の閲覧
 * - high: 深く読んだ（scrollDepth > 50 かつ dwellTime > 30秒）
 */
const feedbackMetadataSchema = z.object({
  scrollDepth: z.number().min(0).max(100),
  dwellTime: z.number().min(0).max(86400),
  interestLevel: z.enum(["low", "medium", "high"]),
});

/**
 * POST /feedback リクエストボディのバリデーションスキーマ
 *
 * - like: レガシー互換（フロントエンドからは発火しない）
 * - next: 「次へ」操作（旧skip）。metadataで行動パターンを記録
 */
export const recordFeedbackSchema = z.object({
  visitorId: z.string().uuid(),
  articleId: z
    .string()
    .min(1)
    .max(100)
    .regex(/^[a-zA-Z0-9\-_]+$/),
  type: z.enum(["like", "next"]),
  metadata: feedbackMetadataSchema.optional(),
});

export type RecordFeedbackInput = z.infer<typeof recordFeedbackSchema>;
export type FeedbackMetadata = z.infer<typeof feedbackMetadataSchema>;
