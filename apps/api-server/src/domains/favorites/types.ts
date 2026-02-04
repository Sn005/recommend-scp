/**
 * @file favorites ドメイン型定義
 * @description お気に入り機能の型定義
 * @see specs/005-backend-api/005-10-favorites-api/005-10-01.md
 */

/** お気に入り（記事情報付き） */
export interface FavoriteWithArticle {
  /** お気に入りID（UUID） */
  id: string;
  /** 記事ID（SCP-173等） */
  articleId: string;
  /** 記事タイトル */
  title: string | null;
  /** オブジェクトクラス（safe, euclid, keter等） */
  objectClass: string | null;
  /** 評価スコア */
  rating: number | null;
  /** お気に入り追加日時（ISO 8601） */
  favoritedAt: string;
}

/** ObjectClass一覧 */
export const OBJECT_CLASSES = [
  "safe",
  "euclid",
  "keter",
  "thaumiel",
  "neutralized",
  "apollyon",
  "archon",
] as const;

export type ObjectClass = (typeof OBJECT_CLASSES)[number];
