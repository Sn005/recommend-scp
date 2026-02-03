/**
 * @file 記事閲覧ページ
 * @description /recommend ページのメインコンポーネント
 * @see specs/006-frontend/006-02-article-reader/006-02-01.md
 */
"use client";

import { useState, useCallback } from "react";
import { useInfiniteArticles } from "./_hooks/useInfiniteArticles";
import { useFeedback } from "./_hooks/useFeedback";
import { useArticleFavorite } from "./_hooks/useArticleFavorite";
import { useHistory } from "@/app/(main)/history/_hooks/useHistory";
import { ArticleWebView, type ArticleContent } from "./_components/ArticleWebView";
import { FloatingUI } from "./_components/FloatingUI";
import { EmptyState } from "./_components/EmptyState";
import { ErrorState } from "./_components/ErrorState";
import { SkeletonLoader } from "./_components/SkeletonLoader";

/**
 * 推薦記事閲覧ページ
 *
 * AC-1: ページ初期表示
 * - /recommend アクセス時に記事閲覧ページを表示
 * - POST /recommend API で推薦記事を取得
 * - ローディング中はスケルトンUIを表示
 *
 * AC-2: 記事表示レイアウト
 * - ArticleWebView に記事URL を渡す
 * - 画面下部に PillNav と ProgressBar を表示
 *
 * AC-3: 推薦切れ表示
 * - 空配列時に EmptyState を表示
 *
 * AC-4: エラー表示
 * - エラー時に ErrorState を表示
 *
 * AC-5: 再試行処理
 * - 再試行ボタンで API 再実行
 */
export default function RecommendPage() {
  const { articles, currentIndex, isLoading, error, isEmpty, goToNext, refetch } =
    useInfiniteArticles();

  const { recordLike, recordDislike } = useFeedback();
  const currentArticle = articles[currentIndex] as (typeof articles)[number] | undefined;
  const { isFavorited, toggleFavorite } = useArticleFavorite(currentArticle?.id);
  const { add: addToHistory } = useHistory();

  const [isRetrying, setIsRetrying] = useState(false);

  // 再試行ハンドラー
  const handleRetry = useCallback(() => {
    setIsRetrying(true);
    void refetch().finally(() => {
      setIsRetrying(false);
    });
  }, [refetch]);

  // 次へボタンハンドラー
  const handleNext = useCallback(() => {
    if (currentArticle) {
      void recordDislike(currentArticle.id);
    }
    goToNext();
  }, [currentArticle, recordDislike, goToNext]);

  // お気に入りボタンハンドラー
  const handleFavorite = useCallback(() => {
    if (currentArticle) {
      void recordLike(currentArticle.id);
    }
    void toggleFavorite();
  }, [currentArticle, recordLike, toggleFavorite]);

  // スクロール完了ハンドラー（Like記録）
  const handleScrollEnd = useCallback(() => {
    if (currentArticle) {
      void recordLike(currentArticle.id);
    }
  }, [currentArticle, recordLike]);

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

  // AC-1: ローディング中はスケルトンUIを表示
  if (isLoading) {
    return <SkeletonLoader />;
  }

  // AC-4: エラー時はErrorStateを表示
  if (error) {
    return <ErrorState error={error} onRetry={handleRetry} isRetrying={isRetrying} />;
  }

  // AC-3: 推薦切れ時はEmptyStateを表示
  if (isEmpty || !currentArticle) {
    return <EmptyState />;
  }

  // 進捗計算（1件目で0%、最後で100%ではなく、現在の位置を表示）
  const progress = ((currentIndex + 1) / articles.length) * 100;

  // AC-2: 記事表示レイアウト
  return (
    <div className="relative h-screen" data-testid="article-viewer">
      <ArticleWebView
        url={currentArticle.url}
        articleId={currentArticle.id}
        onScrollEnd={handleScrollEnd}
        onSkip={goToNext}
        onContentLoaded={handleContentLoaded}
      />
      <FloatingUI
        progress={progress}
        isFavorited={isFavorited}
        onFavorite={handleFavorite}
        onNext={handleNext}
      />
    </div>
  );
}
