/**
 * @file 記事閲覧ページ
 * @description /recommend ページのメインコンポーネント
 *
 * 記事を縦に積み重ねて配置し、ページスクロールで自然に次の記事へ遷移する。
 * iframeはコンテンツの全高に合わせて表示され、内部スクロールは発生しない。
 */
"use client";

import { useState, useCallback, useRef, useEffect, useMemo } from "react";
import { useInfiniteArticles } from "./_hooks/useInfiniteArticles";
import { useFeedback } from "./_hooks/useFeedback";
import { useArticleFavorite } from "./_hooks/useArticleFavorite";
import { useHistory } from "@/app/(main)/history/_hooks/useHistory";
import { ArticleWebView, type ArticleContent } from "./_components/ArticleWebView";
import { FloatingUI } from "./_components/FloatingUI";
import { EmptyState } from "./_components/EmptyState";
import { ErrorState } from "./_components/ErrorState";
import { SkeletonLoader } from "./_components/SkeletonLoader";

/** 記事の読了とみなすスクロール率（%） */
const SCROLL_END_THRESHOLD = 90;

/**
 * 推薦記事閲覧ページ
 *
 * 縦積みスクロール方式:
 * - 記事を縦に積み重ねて配置し、ページスクロールで連続閲覧
 * - iframeはコンテンツの全高に合わせて表示（内部スクロールなし）
 * - 親ページのスクロール位置から各記事の閲覧進捗を計算
 * - 90%到達でLike記録、次記事領域に入ったらcurrentIndexを進める
 */
export default function RecommendPage() {
  const { articles, currentIndex, isLoading, error, isEmpty, goToNext, refetch } =
    useInfiniteArticles();

  const { recordLike, recordDislike } = useFeedback();
  const currentArticle = articles[currentIndex] as (typeof articles)[number] | undefined;
  const { isFavorited, toggleFavorite } = useArticleFavorite({
    articleId: currentArticle?.id,
  });
  const { add: addToHistory } = useHistory();

  const [isRetrying, setIsRetrying] = useState(false);
  const [scrollPercentage, setScrollPercentage] = useState(0);

  // 各記事のDOM要素を参照するためのMap
  const articleRefsMap = useRef<Map<number, HTMLDivElement>>(new Map());
  // 読了済み記事のインデックスを記録（二重Like防止）
  const scrollEndTriggeredRef = useRef<Set<number>>(new Set());

  // 表示する記事の範囲: 0 〜 currentIndex + 1（現在 + 次）
  const renderRange = useMemo(() => {
    return articles.slice(0, currentIndex + 2);
  }, [articles, currentIndex]);

  // 再試行ハンドラー
  const handleRetry = useCallback(() => {
    setIsRetrying(true);
    void refetch().finally(() => {
      setIsRetrying(false);
    });
  }, [refetch]);

  // お気に入りボタンハンドラー
  const handleFavorite = useCallback(() => {
    if (currentArticle) {
      void recordLike(currentArticle.id);
    }
    void toggleFavorite();
  }, [currentArticle, recordLike, toggleFavorite]);

  // 次へボタンハンドラー: dislike記録 + 次の記事の位置までスクロール
  const handleNext = useCallback(() => {
    if (currentArticle) {
      void recordDislike(currentArticle.id);
    }
    // 次の記事のDOM要素の位置までスムーズスクロール
    const nextRef = articleRefsMap.current.get(currentIndex + 1);
    if (nextRef) {
      nextRef.scrollIntoView({ behavior: "smooth" });
    }
    goToNext();
  }, [currentArticle, currentIndex, recordDislike, goToNext]);

  // コンテンツ読み込み完了ハンドラー（履歴保存）
  const handleContentLoaded = useCallback(
    (content: ArticleContent) => {
      if (currentArticle) {
        addToHistory({
          scpNumber: currentArticle.id,
          title: content.title || currentArticle.title,
          excerpt: content.excerpt,
        });
      }
    },
    [currentArticle, addToHistory]
  );

  // 親ページスクロールで記事の閲覧進捗を検知
  useEffect(() => {
    const handleScroll = () => {
      const currentRef = articleRefsMap.current.get(currentIndex);
      if (!currentRef) return;

      const rect = currentRef.getBoundingClientRect();
      const viewportHeight = window.innerHeight;
      const articleHeight = currentRef.offsetHeight;

      // 記事のスクロール進捗を計算
      // rect.top=0 → 記事の先頭がビューポート上端にある
      // rect.bottom=viewportHeight → 記事の末尾がビューポート下端にある
      const scrolled = -rect.top;
      const scrollableHeight = articleHeight - viewportHeight;
      const pct = scrollableHeight > 0 ? Math.round((scrolled / scrollableHeight) * 100) : 0;
      const clamped = Math.max(0, Math.min(100, pct));
      setScrollPercentage(clamped);

      // 90%到達でLike記録（1記事につき1回のみ）
      if (clamped >= SCROLL_END_THRESHOLD && !scrollEndTriggeredRef.current.has(currentIndex)) {
        scrollEndTriggeredRef.current.add(currentIndex);
        const article = articles[currentIndex] as (typeof articles)[number] | undefined;
        if (article) {
          void recordLike(article.id);
        }
      }

      // 次の記事が画面の半分以上を占めたらcurrentIndexを進める
      const nextRef = articleRefsMap.current.get(currentIndex + 1);
      if (nextRef) {
        const nextRect = nextRef.getBoundingClientRect();
        if (nextRect.top < viewportHeight * 0.5) {
          goToNext();
        }
      }
    };

    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => {
      window.removeEventListener("scroll", handleScroll);
    };
  }, [currentIndex, articles, goToNext, recordLike]);

  // ローディング中はスケルトンUIを表示
  if (isLoading) {
    return <SkeletonLoader />;
  }

  // エラー時はErrorStateを表示
  if (error) {
    return <ErrorState error={error} onRetry={handleRetry} isRetrying={isRetrying} />;
  }

  // 推薦切れ時はEmptyStateを表示
  if (isEmpty || !currentArticle) {
    return <EmptyState />;
  }

  // 進捗計算
  const progress = ((currentIndex + 1) / articles.length) * 100;

  return (
    <div data-testid="article-viewer">
      {/* 記事を縦に積み重ねて配置 */}
      {renderRange.map((article, idx) => (
        <div
          key={article.id}
          ref={(el) => {
            if (el) {
              articleRefsMap.current.set(idx, el);
            }
          }}
        >
          <ArticleWebView
            url={article.url}
            articleId={article.id}
            onSkip={idx === currentIndex ? goToNext : undefined}
            onContentLoaded={idx === currentIndex ? handleContentLoaded : undefined}
          />
        </div>
      ))}
      <FloatingUI
        progress={progress}
        scrollPercentage={scrollPercentage}
        isFavorited={isFavorited}
        onFavorite={handleFavorite}
        onNext={handleNext}
      />
    </div>
  );
}
