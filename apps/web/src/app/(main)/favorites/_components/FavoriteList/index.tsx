/**
 * @file FavoriteList コンポーネント
 * @description お気に入り記事のリスト表示
 * @see specs/006-frontend/006-03-favorites/006-03-02.md
 */
"use client";

import { FavoriteCard } from "../FavoriteCard";
import type { FavoriteArticle } from "../../_hooks/useFavorites";

/**
 * FavoriteList Props
 */
export interface FavoriteListProps {
  /** お気に入り記事の配列 */
  favorites: FavoriteArticle[];
  /** 削除コールバック */
  onRemove: (articleId: string) => void;
  /** 削除中のarticleIdセット（フェードアウトアニメーション用） */
  removingIds?: Set<string>;
}

/**
 * お気に入りリストコンポーネント
 *
 * AC-5: リスト配置
 * - カードがspace-y-3（12px間隔）で縦に配置
 *
 * @param props - コンポーネントProps
 * @returns お気に入りリストコンポーネント
 *
 * @example
 * ```tsx
 * <FavoriteList
 *   favorites={favorites}
 *   onRemove={(articleId) => handleRemove(articleId)}
 *   removingIds={removingIds}
 * />
 * ```
 */
export function FavoriteList({ favorites, onRemove, removingIds }: FavoriteListProps) {
  return (
    <div
      data-testid="favorite-list"
      className="space-y-3 md:flex md:flex-col md:gap-3 md:space-y-0"
    >
      {favorites.map((article) => (
        <FavoriteCard
          key={article.id}
          article={article}
          onRemove={onRemove}
          isRemoving={removingIds?.has(article.articleId)}
        />
      ))}
    </div>
  );
}
