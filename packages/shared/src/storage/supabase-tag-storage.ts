/**
 * @file Supabaseタグ取得ストレージ
 * @description Supabaseからタグデータを取得する専用アダプタ
 * @see specs/004-recommend/004-01-recommend-foundation/004-01-04.md
 */

import type { SupabaseClient } from "@supabase/supabase-js";

/**
 * タグ取得専用のストレージアダプタ
 *
 * Supabaseからタグデータを取得する。
 * article_tags テーブルと tags テーブルをJOINしてタグ値を取得。
 */
export class SupabaseTagStorage {
  constructor(private supabase: SupabaseClient) {}

  /**
   * 記事のタグ情報を取得
   *
   * @param articleId 記事ID
   * @returns タグ値の配列。記事が存在しない場合は空配列
   * @throws Supabase接続エラー時
   */
  async getArticleTags(articleId: string): Promise<string[]> {
    const { data, error } = await this.supabase
      .from("article_tags")
      .select("tags(value)")
      .eq("article_id", articleId);

    if (error) {
      throw new Error(`Failed to fetch tags for article ${articleId}: ${error.message}`);
    }

    if (!data || data.length === 0) {
      return [];
    }

    // Supabaseのselect("tags(value)")はJOINされたtagsオブジェクトを返す
    // 型推論の制限により、unknown経由でキャストが必要
    type ArticleTagRow = { tags: { value: string } | null };
    return (data as unknown as ArticleTagRow[])
      .filter((row): row is { tags: { value: string } } => row.tags !== null)
      .map((row) => row.tags.value);
  }
}
