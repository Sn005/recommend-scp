/**
 * @file useArticleFavorite フック（スタブ実装）
 * @description 記事のお気に入り状態を管理するフック
 * @see specs/006-frontend/006-02-article-reader/006-02-06.md
 *
 * TODO: 006-02-06 で本実装に置き換え
 */
"use client";

import { useState, useCallback } from "react";
import type { UseArticleFavoriteResult } from "../_types";

/**
 * 記事のお気に入り状態を管理するフック
 *
 * @param _articleId - 記事ID
 * @returns UseArticleFavoriteResult
 */
export function useArticleFavorite(articleId?: string): UseArticleFavoriteResult {
  // TODO: 006-02-06 で articleId を使用
  void articleId;
  const [isFavorited, setIsFavorited] = useState(false);

  const toggleFavorite = useCallback(() => {
    // TODO: 006-02-06 で async 実装に変更
    // await api.favorites.$post({ json: { visitorId, articleId } });
    setIsFavorited((prev) => !prev);
    return Promise.resolve();
  }, []);

  return {
    isFavorited,
    toggleFavorite,
  };
}
