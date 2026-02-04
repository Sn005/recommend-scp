/**
 * @file useArticleFavorite フック
 * @description 記事のお気に入り状態を管理するフック
 * @see specs/006-frontend/006-02-article-reader/006-02-06.md
 */
"use client";

import { useState, useCallback, useEffect, useRef } from "react";
// NOTE: favorites API は 006-03 で実装予定。現在は削除操作をスキップ
// import { api } from "@/shared/lib/api-client";
import type { UseArticleFavoriteOptions, UseArticleFavoriteResult } from "../_types";
import { useFeedback } from "./useFeedback";

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
  const { recordFavorite } = useFeedback();
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
      // フィードバック記録（favorite）
      await recordFavorite(articleId);
    } catch {
      // ロールバック
      setIsFavorited(false);
      favoriteCache.set(articleId, false);
    } finally {
      isProcessingRef.current = false;
      setIsProcessing(false);
    }
  }, [articleId, isFavorited, recordFavorite]);

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
      // TODO: 006-03 で favorites API 実装後に有効化
      // await api.favorites[":articleId"].$delete({
      //   param: { articleId },
      // });

      // 暫定: 常に成功とみなす
      await Promise.resolve();
    } catch {
      // ロールバック
      setIsFavorited(true);
      favoriteCache.set(articleId, true);
    } finally {
      isProcessingRef.current = false;
      setIsProcessing(false);
    }
  }, [articleId, isFavorited]);

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
