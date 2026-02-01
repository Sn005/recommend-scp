/**
 * @file useInfiniteArticles フック（スタブ実装）
 * @description 推薦記事の無限スクロール取得を管理するフック
 * @see specs/006-frontend/006-02-article-reader/006-02-04.md
 *
 * TODO: 006-02-04 で本実装に置き換え
 */
"use client";

import { useState, useCallback, useEffect, useRef } from "react";
import { api } from "@/shared/lib/api-client";
import { useVisitorId } from "@/shared/hooks/useVisitorId";
import type { Article, UseInfiniteArticlesResult } from "../_types";

/**
 * 推薦記事を取得・管理するフック
 *
 * @returns UseInfiniteArticlesResult
 */
export function useInfiniteArticles(): UseInfiniteArticlesResult {
  const { visitorId, isLoading: isVisitorLoading } = useVisitorId();
  const [articles, setArticles] = useState<Article[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const isFetchingRef = useRef(false);

  const fetchArticles = useCallback(async () => {
    if (!visitorId || isFetchingRef.current) return;

    isFetchingRef.current = true;
    setIsLoading(true);
    setError(null);

    try {
      const res = await api.recommend.$post({
        json: { visitorId, limit: 10 },
      });

      // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition -- res.ok は実行時に false になる可能性がある
      if (!res.ok) {
        throw new Error(`API error: ${String(res.status)}`);
      }

      const data = await res.json();
      const recommendations = data.recommendations;
      setArticles(recommendations);
    } catch (e) {
      setError(e instanceof Error ? e : new Error("記事の取得に失敗しました"));
    } finally {
      setIsLoading(false);
      isFetchingRef.current = false;
    }
  }, [visitorId]);

  useEffect(() => {
    if (!isVisitorLoading && visitorId) {
      void fetchArticles();
    }
  }, [isVisitorLoading, visitorId, fetchArticles]);

  const loadMore = useCallback(() => {
    // TODO: 006-02-04 で async 実装に変更
    return Promise.resolve();
  }, []);

  const goToNext = useCallback(() => {
    setCurrentIndex((prev) => Math.min(prev + 1, articles.length - 1));
  }, [articles.length]);

  const refetch = useCallback(async () => {
    setCurrentIndex(0);
    await fetchArticles();
  }, [fetchArticles]);

  const isEmpty = !isLoading && !error && articles.length === 0;

  return {
    articles,
    currentIndex,
    isLoading: isLoading || isVisitorLoading,
    error,
    isEmpty,
    loadMore,
    goToNext,
    refetch,
  };
}
