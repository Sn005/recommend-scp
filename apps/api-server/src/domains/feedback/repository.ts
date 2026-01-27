/**
 * @file FeedbackRepository
 * @description feedbackテーブルのDB操作層
 * @see specs/005-backend-api/005-06-feedback-api/005-06-01.md
 */

import type { SupabaseClient } from "@supabase/supabase-js";
import type { Feedback } from "@recommend-scp/shared/storage";

/** DB行の型（snake_case） */
interface FeedbackRow {
  id: string;
  visitor_id: string;
  article_id: string;
  type: "like" | "dislike";
  created_at: string;
}

/**
 * FeedbackRepository
 *
 * feedbackテーブルのCRUD操作を提供。
 * snake_case（DB）↔ camelCase（アプリ）の変換を行う。
 */
export class FeedbackRepository {
  constructor(private readonly supabase: SupabaseClient) {}

  /**
   * フィードバックを保存（upsert）
   *
   * 同じvisitorId+articleIdの組み合わせが存在する場合は上書きする。
   *
   * @param feedback - 保存するフィードバック（idを除く）
   * @returns 保存されたフィードバック
   */
  save = async (feedback: Omit<Feedback, "id">): Promise<Feedback> => {
    const { data, error } = await this.supabase
      .from("feedback")
      .upsert(
        {
          visitor_id: feedback.visitorId,
          article_id: feedback.articleId,
          type: feedback.type,
          created_at: feedback.createdAt,
        },
        {
          onConflict: "visitor_id,article_id",
        }
      )
      .select("id, visitor_id, article_id, type, created_at")
      .single();

    if (error) throw error;

    return this.toFeedback(data as unknown as FeedbackRow);
  };

  /**
   * visitorIdに紐づくフィードバック一覧を取得
   *
   * @param visitorId - 訪問者ID
   * @returns フィードバックの配列
   */
  getByVisitorId = async (visitorId: string): Promise<Feedback[]> => {
    const { data, error } = await this.supabase
      .from("feedback")
      .select("id, visitor_id, article_id, type, created_at")
      .eq("visitor_id", visitorId);

    if (error) throw error;

    return (data as unknown as FeedbackRow[]).map(this.toFeedback);
  };

  // ============================================
  // Private: DB row → Domain model 変換
  // ============================================

  private toFeedback = (row: FeedbackRow): Feedback => ({
    id: row.id,
    visitorId: row.visitor_id,
    articleId: row.article_id,
    type: row.type,
    createdAt: row.created_at,
  });
}
