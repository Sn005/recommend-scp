/**
 * @file Feedback APIスキーマ
 * @description POST /feedback のバリデーションスキーマ
 * @see specs/005-backend-api/005-06-feedback-api/005-06-02.md
 */

import { z } from "zod";

/**
 * POST /feedback リクエストボディのバリデーションスキーマ
 */
export const recordFeedbackSchema = z.object({
  visitorId: z.string().uuid(),
  articleId: z.string().min(1),
  type: z.enum(["like", "dislike"]),
});

export type RecordFeedbackInput = z.infer<typeof recordFeedbackSchema>;
