/**
 * @file useFavorites フック
 * @description お気に入りAPI連携フック
 * @see specs/006-frontend/006-03-favorites/006-03-03.md
 */
"use client";

import { useState, useCallback, useEffect, useRef } from "react";
import { api } from "@/shared/lib/api-client";
import { useVisitorId } from "@/shared/hooks/useVisitorId";

/**
 * お気に入り記事の型
 */
export interface FavoriteArticle {
  /** お気に入りレコードID */
  id: string;
  /** 記事ID（scp-173等） */
  articleId: string;
  /** 記事タイトル */
  title: string | null;
  /** 概要（100文字程度） */
  excerpt?: string | null;
  /** オブジェクトクラス */
  objectClass: string | null;
  /** 評価スコア */
  rating: number | null;
  /** お気に入り追加日時（ISO 8601） */
  favoritedAt: string;
}

/**
 * useFavoritesの戻り値の型
 */
export interface UseFavoritesResult {
  /** お気に入り一覧 */
  favorites: FavoriteArticle[];
  /** ローディング中フラグ */
  isLoading: boolean;
  /** エラー情報 */
  error: Error | null;
  /** お気に入りを削除 */
  removeFavorite: (articleId: string) => Promise<void>;
  /** 一覧を再取得 */
  refresh: () => Promise<void>;
}

/**
 * APIレスポンスの型
 */
interface FavoritesApiResponse {
  favorites: FavoriteArticle[];
  total: number;
}

/**
 * お気に入りAPI連携フック
 *
 * - GET /favorites でお気に入り一覧を取得
 * - DELETE /favorites/:articleId でお気に入りを削除
 * - 楽観的更新による即時UI反映
 * - API失敗時のロールバック
 *
 * @returns UseFavoritesResult
 *
 * @example
 * ```tsx
 * const { favorites, isLoading, error, removeFavorite, refresh } = useFavorites();
 *
 * if (isLoading) return <LoadingSpinner />;
 * if (error) return <ErrorMessage error={error} />;
 *
 * return (
 *   <FavoriteList
 *     favorites={favorites}
 *     onRemove={removeFavorite}
 *   />
 * );
 * ```
 */
export function useFavorites(): UseFavoritesResult {
  const { visitorId } = useVisitorId();
  const [favorites, setFavorites] = useState<FavoriteArticle[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  // アンマウント検知用
  const isMountedRef = useRef(true);

  /**
   * お気に入り一覧を取得
   */
  const fetchFavorites = useCallback(async () => {
    if (!visitorId) {
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const res = await api.favorites.$get({
        query: { visitorId },
      });

      if (!res.ok) {
        throw new Error("Failed to fetch favorites");
      }

      const data: FavoritesApiResponse = await res.json();

      if (isMountedRef.current) {
        setFavorites(data.favorites);
      }
    } catch (e) {
      if (isMountedRef.current) {
        setError(e instanceof Error ? e : new Error("Unknown error"));
      }
    } finally {
      if (isMountedRef.current) {
        setIsLoading(false);
      }
    }
  }, [visitorId]);

  /**
   * お気に入りを削除（楽観的更新）
   */
  const removeFavorite = useCallback(
    async (articleId: string) => {
      // バリデーション
      if (!articleId || !visitorId) {
        return;
      }

      // 楽観的更新: 即座にUIから削除
      const prevFavorites = favorites;
      setFavorites((prev) => prev.filter((f) => f.articleId !== articleId));

      try {
        // 204 No Content - エラー時はcatchブロックで処理
        await api.favorites[":articleId"].$delete({
          param: { articleId },
          json: { visitorId },
        });
      } catch {
        // ロールバック
        if (isMountedRef.current) {
          setFavorites(prevFavorites);
        }
      }
    },
    [favorites, visitorId]
  );

  /**
   * 一覧を再取得
   */
  const refresh = useCallback(async () => {
    await fetchFavorites();
  }, [fetchFavorites]);

  // 初回マウント時に取得
  useEffect(() => {
    isMountedRef.current = true;
    void fetchFavorites();

    return () => {
      isMountedRef.current = false;
    };
  }, [fetchFavorites]);

  return {
    favorites,
    isLoading,
    error,
    removeFavorite,
    refresh,
  };
}
