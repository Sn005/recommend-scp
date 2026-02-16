/**
 * @file Feedback APIスキーマ
 * @description POST /feedback のバリデーションスキーマ
 * @see specs/005-backend-api/005-06-feedback-api/005-06-02.md
 * @see specs/006-frontend/006-05-transition-ux/006-05-06.md
 */

import { z } from "zod";

/**
 * スキップメタデータのバリデーションスキーマ
 */
const feedbackMetadataSchema = z.object({
  scrollDepth: z.number().min(0).max(100),
  dwellTime: z.number().min(0).max(86400),
  interestLevel: z.enum(["skip", "neutral", "like"]),
});

/**
 * POST /feedback リクエストボディのバリデーションスキーマ
 *
 * AC-9: "skip"型を追加、メタデータをオプショナルで受付
 * 後方互換性: "dislike"も引き続き受け付ける
 */
export const recordFeedbackSchema = z.object({
  visitorId: z.string().uuid(),
  articleId: z
    .string()
    .min(1)
    .max(100)
    .regex(/^[a-zA-Z0-9\-_]+$/),
  type: z.enum(["like", "dislike", "skip"]),
  metadata: feedbackMetadataSchema.optional(),
});

export type RecordFeedbackInput = z.infer<typeof recordFeedbackSchema>;
export type FeedbackMetadata = z.infer<typeof feedbackMetadataSchema>;
