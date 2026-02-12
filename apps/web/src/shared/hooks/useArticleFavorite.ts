/**
 * @file useArticleFavorite フック
 * @description 記事のお気に入り状態を管理する共有フック
 */
"use client";

import { useState, useCallback, useEffect, useRef } from "react";
import { api } from "@/shared/lib/api-client";
import { useVisitorId } from "@/shared/hooks/useVisitorId";

/** useArticleFavorite フックのオプション */
export interface UseArticleFavoriteOptions {
  /** 記事ID */
  articleId: string | undefined;
  /** 初期お気に入り状態 */
  initialFavorited?: boolean;
}

/** useArticleFavorite フックの戻り値 */
export interface UseArticleFavoriteResult {
  /** お気に入り状態 */
  isFavorited: boolean;
  /** 処理中フラグ */
  isProcessing: boolean;
  /** お気に入りをトグル */
  toggleFavorite: () => Promise<void>;
  /** お気に入りを追加 */
  addFavorite: () => Promise<void>;
  /** お気に入りを解除 */
  removeFavorite: () => Promise<void>;
}

/**
 * ローカルキャッシュ（セッション中のお気に入り状態を保持）
 * テストからもアクセスできるようexport
 */
export const favoriteCache = new Map<string, boolean>();

/**
 * 記事のお気に入り状態を管理するフック
 *
 * @param options - フックオプション
 * @returns UseArticleFavoriteResult
 */
export function useArticleFavorite({
  articleId,
  initialFavorited = false,
}: UseArticleFavoriteOptions): UseArticleFavoriteResult {
  // 初期状態: キャッシュ優先、なければinitialFavorited
  const [isFavorited, setIsFavorited] = useState(() => {
    if (!articleId) return false;
    const cached = favoriteCache.get(articleId);
    return cached ?? initialFavorited;
  });

  const [isProcessing, setIsProcessing] = useState(false);
  // 同期的なチェック用（連打防止）
  const isProcessingRef = useRef(false);
  const { visitorId } = useVisitorId();
  const abortControllerRef = useRef<AbortController | null>(null);

  // 記事切り替え時に状態を更新
  useEffect(() => {
    if (!articleId) {
      setIsFavorited(false);
      return;
    }

    const cachedState = favoriteCache.get(articleId);
    if (cachedState !== undefined) {
      setIsFavorited(cachedState);
    } else {
      setIsFavorited(initialFavorited);
    }
  }, [articleId, initialFavorited]);

  // お気に入り追加
  const addFavorite = useCallback(async () => {
    // 連打防止: refで同期的にチェック
    if (!articleId || isProcessingRef.current || isFavorited) return;

    // 進行中のリクエストをキャンセル
    abortControllerRef.current?.abort();
    abortControllerRef.current = new AbortController();

    // 楽観的更新
    setIsFavorited(true);
    favoriteCache.set(articleId, true);
    isProcessingRef.current = true;
    setIsProcessing(true);

    try {
      if (visitorId) {
        await api.favorites[":articleId"].$post({
          param: { articleId },
          json: { visitorId },
        });
      }
    } catch {
      // ロールバック
      setIsFavorited(false);
      favoriteCache.set(articleId, false);
    } finally {
      isProcessingRef.current = false;
      setIsProcessing(false);
    }
  }, [articleId, isFavorited, visitorId]);

  // お気に入り解除
  const removeFavorite = useCallback(async () => {
    // 連打防止: refで同期的にチェック
    if (!articleId || isProcessingRef.current || !isFavorited) return;

    // 進行中のリクエストをキャンセル
    abortControllerRef.current?.abort();
    abortControllerRef.current = new AbortController();

    // 楽観的更新
    setIsFavorited(false);
    favoriteCache.set(articleId, false);
    isProcessingRef.current = true;
    setIsProcessing(true);

    try {
      if (visitorId) {
        await api.favorites[":articleId"].$delete({
          param: { articleId },
          json: { visitorId },
        });
      }
    } catch {
      // ロールバック
      setIsFavorited(true);
      favoriteCache.set(articleId, true);
    } finally {
      isProcessingRef.current = false;
      setIsProcessing(false);
    }
  }, [articleId, isFavorited, visitorId]);

  // トグル
  const toggleFavorite = useCallback(async () => {
    if (isFavorited) {
      await removeFavorite();
    } else {
      await addFavorite();
    }
  }, [isFavorited, addFavorite, removeFavorite]);

  return {
    isFavorited,
    isProcessing,
    toggleFavorite,
    addFavorite,
    removeFavorite,
  };
}
