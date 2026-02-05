/**
 * @file useInfiniteArticles フック
 * @description 推薦記事の無限スクロール取得を管理するフック
 * @see specs/006-frontend/006-02-article-reader/006-02-04.md
 */
"use client";

import { useState, useCallback, useEffect, useRef } from "react";
import { api } from "@/shared/lib/api-client";
import { useVisitorId } from "@/shared/hooks/useVisitorId";
import type {
  Article,
  RecommendResponse,
  UseInfiniteArticlesOptions,
  UseInfiniteArticlesResult,
} from "../_types";

const DEFAULT_INITIAL_COUNT = 3;
const DEFAULT_LOAD_MORE_COUNT = 1;
const DEFAULT_AUTO_LOAD_LIMIT = 10;
const FETCH_TIMEOUT_MS = 10_000;

/**
 * 有効なURLを持つ記事のみをフィルタする
 * 空文字列のURLは翻訳なしとみなし除外する
 */
function filterValidArticles(articles: Article[]): Article[] {
  return articles.filter((article) => article.url !== "");
}

/**
 * 推薦記事を取得・管理するフック
 *
 * @param options - フックのオプション
 * @returns UseInfiniteArticlesResult
 */
export function useInfiniteArticles(
  options: UseInfiniteArticlesOptions = {}
): UseInfiniteArticlesResult {
  const {
    initialCount = DEFAULT_INITIAL_COUNT,
    loadMoreCount = DEFAULT_LOAD_MORE_COUNT,
    autoLoadLimit = DEFAULT_AUTO_LOAD_LIMIT,
  } = options;

  const { visitorId, isLoading: isVisitorLoading } = useVisitorId();
  const [articles, setArticles] = useState<Article[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const [hasMore, setHasMore] = useState(true);
  const [isPaused, setIsPaused] = useState(false);

  const isFetchingRef = useRef(false);
  const isLoadingMoreRef = useRef(false);
  const autoLoadCountRef = useRef(0);
  const isMountedRef = useRef(true);

  // マウント状態管理
  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
    };
  }, []);

  // 初回読み込み
  const fetchArticles = useCallback(
    async (count: number) => {
      if (!visitorId || isFetchingRef.current) return;

      isFetchingRef.current = true;
      setIsLoading(true);
      setError(null);

      const controller = new AbortController();
      const timeoutId = setTimeout(() => {
        controller.abort();
      }, FETCH_TIMEOUT_MS);

      try {
        const res = await api.recommend.$post({
          json: { visitorId, limit: count },
        });

        // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition -- res.ok は実行時に false になる可能性がある
        if (!res.ok) {
          throw new Error(`API error: ${String(res.status)}`);
        }

        const data = (await res.json()) as RecommendResponse;
        const recommendations: Article[] = filterValidArticles(data.recommendations);
        const hasMoreData: boolean = data.hasMore ?? false;

        if (isMountedRef.current) {
          setArticles(recommendations);
          setHasMore(hasMoreData);
        }
      } catch (e) {
        if (isMountedRef.current) {
          const message =
            e instanceof DOMException && e.name === "AbortError"
              ? "記事の取得がタイムアウトしました"
              : undefined;
          setError(
            e instanceof Error && !message ? e : new Error(message ?? "記事の取得に失敗しました")
          );
        }
      } finally {
        clearTimeout(timeoutId);
        if (isMountedRef.current) {
          setIsLoading(false);
        }
        isFetchingRef.current = false;
      }
    },
    [visitorId]
  );

  // 初回読み込みトリガー
  useEffect(() => {
    if (isVisitorLoading) return;

    if (visitorId) {
      void fetchArticles(initialCount);
    } else {
      // visitorIdがnull（エラー等）の場合はローディングを解除
      setIsLoading(false);
      setError(new Error("Visitor IDの取得に失敗しました"));
    }
  }, [isVisitorLoading, visitorId, fetchArticles, initialCount]);

  // 追加読み込み
  const loadMore = useCallback(async () => {
    // ガード条件
    if (!visitorId || isLoadingMoreRef.current || !hasMore || isPaused) {
      return;
    }

    isLoadingMoreRef.current = true;
    setIsLoadingMore(true);

    const controller = new AbortController();
    const timeoutId = setTimeout(() => {
      controller.abort();
    }, FETCH_TIMEOUT_MS);

    try {
      const res = await api.recommend.$post({
        json: { visitorId, limit: loadMoreCount },
      });

      // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition -- res.ok は実行時に false になる可能性がある
      if (!res.ok) {
        throw new Error(`API error: ${String(res.status)}`);
      }

      const data = (await res.json()) as RecommendResponse;
      const newArticles: Article[] = filterValidArticles(data.recommendations);
      const hasMoreData: boolean = data.hasMore ?? false;

      if (isMountedRef.current) {
        setArticles((prev) => [...prev, ...newArticles]);
        setHasMore(hasMoreData);

        // 自動読み込みカウントをインクリメント
        autoLoadCountRef.current += 1;
        if (autoLoadCountRef.current >= autoLoadLimit) {
          setIsPaused(true);
        }
      }
    } catch (e) {
      if (isMountedRef.current) {
        const message =
          e instanceof DOMException && e.name === "AbortError"
            ? "記事の取得がタイムアウトしました"
            : undefined;
        setError(
          e instanceof Error && !message ? e : new Error(message ?? "記事の取得に失敗しました")
        );
      }
    } finally {
      clearTimeout(timeoutId);
      if (isMountedRef.current) {
        setIsLoadingMore(false);
      }
      isLoadingMoreRef.current = false;
    }
  }, [visitorId, hasMore, isPaused, loadMoreCount, autoLoadLimit]);

  // 次の記事に移動
  const goToNext = useCallback(() => {
    const maxIndex = articles.length - 1;

    // 現在のインデックスが最大値未満なら進める
    setCurrentIndex((prev) => {
      if (prev < maxIndex) {
        return prev + 1;
      }
      // 最大値に達している場合、loadMoreをトリガーする判定用に現在値を返す
      return prev;
    });

    // 最後の記事にいて追加読み込み可能な場合
    if (currentIndex >= maxIndex && hasMore && !isPaused) {
      void loadMore();
    }
  }, [currentIndex, articles.length, hasMore, isPaused, loadMore]);

  // 自動読み込みを再開
  const resumeAutoLoad = useCallback(() => {
    autoLoadCountRef.current = 0;
    setIsPaused(false);
  }, []);

  // リセット
  const reset = useCallback(() => {
    setArticles([]);
    setCurrentIndex(0);
    setError(null);
    setHasMore(true);
    setIsPaused(false);
    autoLoadCountRef.current = 0;
  }, []);

  // 再取得
  const refetch = useCallback(async () => {
    reset();
    isFetchingRef.current = false; // resetしたので再取得を許可
    await fetchArticles(initialCount);
  }, [reset, fetchArticles, initialCount]);

  const isEmpty = !isLoading && !error && articles.length === 0;

  return {
    articles,
    currentIndex,
    isLoading: isLoading || isVisitorLoading,
    isLoadingMore,
    error,
    isEmpty,
    hasMore,
    isPaused,
    loadMore,
    goToNext,
    resumeAutoLoad,
    reset,
    refetch,
  };
}
