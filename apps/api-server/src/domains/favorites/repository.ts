/**
 * @file FavoritesRepository
 * @description favoritesテーブルのDB操作層
 * @see specs/005-backend-api/005-10-favorites-api/005-10-01.md
 */

import type { SupabaseClient } from "@supabase/supabase-js";
import type { FavoriteWithArticle } from "./types";
import { OBJECT_CLASSES } from "./types";

/** DB行の型（JOIN後のsnake_case） */
interface FavoriteRow {
  id: string;
  article_id: string;
  added_at: string;
  scp_articles: {
    title: string | null;
    rating: number | null;
    tags: string[] | null;
  } | null;
}

/**
 * tags配列からオブジェクトクラスを抽出
 *
 * @param tags - 記事のタグ配列（例: ["safe", "horror", "科学"]）
 * @returns オブジェクトクラス（見つからない場合はnull）
 */
const extractObjectClass = (tags: string[] | null): string | null => {
  if (!tags || tags.length === 0) return null;

  const found = tags.find((tag) =>
    OBJECT_CLASSES.includes(tag.toLowerCase() as (typeof OBJECT_CLASSES)[number])
  );
  return found ? found.toLowerCase() : null;
};

/**
 * FavoritesRepository
 *
 * favoritesテーブルのCRUD操作を提供。
 * snake_case（DB）↔ camelCase（アプリ）の変換を行う。
 */
export class FavoritesRepository {
  constructor(private readonly supabase: SupabaseClient) {}

  /**
   * visitorIdに紐づくお気に入り一覧を取得
   *
   * @param visitorId - クライアント生成UUID
   * @returns FavoriteWithArticle[]
   */
  getByVisitorId = async (visitorId: string): Promise<FavoriteWithArticle[]> => {
    const { data, error } = await this.supabase
      .from("favorites")
      .select(
        `
        id,
        article_id,
        added_at,
        scp_articles (
          title,
          rating,
          tags
        )
      `
      )
      .eq("visitor_id", visitorId)
      .order("added_at", { ascending: false });

    if (error) throw error;

    return (data as unknown as FavoriteRow[]).map((row) => this.toFavoriteWithArticle(row));
  };

  /**
   * お気に入りを削除
   *
   * @param visitorId - クライアント生成UUID
   * @param articleId - 記事ID
   * @returns 削除成功: true, 該当なし: false
   */
  remove = async (visitorId: string, articleId: string): Promise<boolean> => {
    const { count, error } = await this.supabase
      .from("favorites")
      .delete({ count: "exact" })
      .eq("visitor_id", visitorId)
      .eq("article_id", articleId);

    if (error) throw error;

    return (count ?? 0) > 0;
  };

  // ============================================
  // Private: DB row → Domain model 変換
  // ============================================

  private toFavoriteWithArticle = (row: FavoriteRow): FavoriteWithArticle => ({
    id: row.id,
    articleId: row.article_id,
    title: row.scp_articles?.title ?? null,
    objectClass: extractObjectClass(row.scp_articles?.tags ?? null),
    rating: row.scp_articles?.rating ?? null,
    favoritedAt: row.added_at,
  });
}
