/**
 * @file 記事閲覧ページ
 * @description /recommend ページのメインコンポーネント
 * @see specs/006-frontend/006-02-article-reader/006-02-07.md
 */
"use client";

import { useState, useCallback, useRef, useEffect } from "react";
import { useInfiniteArticles } from "./_hooks/useInfiniteArticles";
import { useFeedback } from "./_hooks/useFeedback";
import { useArticleFavorite } from "./_hooks/useArticleFavorite";
import { useHistory } from "@/app/(main)/history/_hooks/useHistory";
import { ArticleWebView, type ArticleContent } from "./_components/ArticleWebView";
import { FloatingUI } from "./_components/FloatingUI";
import { EmptyState } from "./_components/EmptyState";
import { ErrorState } from "./_components/ErrorState";
import { SkeletonLoader } from "./_components/SkeletonLoader";

/** 遷移アニメーションの持続時間（ms） */
const TRANSITION_DURATION_MS = 500;

/**
 * 推薦記事閲覧ページ
 *
 * AC-1: ページ初期表示（POST /recommend APIで10件取得）
 * AC-2: 記事表示レイアウト（デュアルWebView + FloatingUI）
 * AC-3: 推薦切れ表示（EmptyState）
 * AC-4: エラー表示（ErrorState）
 * AC-5: 再試行処理
 *
 * 006-02-07 追加:
 * AC-4 (007): デュアルWebView + スムーストランジション
 * AC-5 (007): 「次へ」ボタンの即座遷移（既存挙動維持）
 * AC-6 (007): 下部到達時のLike記録 + 自動遷移
 * AC-8 (007): 過去記事のメモリ解放（最大2 iframe）
 * AC-9 (007): 遷移中の操作制御（連打防止）
 */
export default function RecommendPage() {
  const { articles, currentIndex, isLoading, error, isEmpty, goToNext, refetch } =
    useInfiniteArticles();

  const { recordLike, recordDislike } = useFeedback();
  const currentArticle = articles[currentIndex] as (typeof articles)[number] | undefined;
  const nextArticle = articles[currentIndex + 1] as (typeof articles)[number] | undefined;
  const { isFavorited, toggleFavorite } = useArticleFavorite({
    articleId: currentArticle?.id,
  });
  const { add: addToHistory } = useHistory();

  const [isRetrying, setIsRetrying] = useState(false);
  const [isTransitioning, setIsTransitioning] = useState(false);
  const transitioningRef = useRef(false);

  // 再試行ハンドラー
  const handleRetry = useCallback(() => {
    setIsRetrying(true);
    void refetch().finally(() => {
      setIsRetrying(false);
    });
  }, [refetch]);

  // 遷移完了処理
  const completeTransition = useCallback(() => {
    if (!transitioningRef.current) return;
    transitioningRef.current = false;
    goToNext();
    setIsTransitioning(false);
  }, [goToNext]);

  // AC-4 (007): 遷移開始処理（スクロール連動の滑らかな遷移）
  const startTransition = useCallback(() => {
    if (transitioningRef.current || !nextArticle) return;
    transitioningRef.current = true;
    setIsTransitioning(true);
  }, [nextArticle]);

  // 遷移アニメーション完了検知
  useEffect(() => {
    if (!isTransitioning) return;
    const timerId = setTimeout(completeTransition, TRANSITION_DURATION_MS);
    return () => {
      clearTimeout(timerId);
    };
  }, [isTransitioning, completeTransition]);

  // AC-5 (007): 次へボタンハンドラー（即座に遷移 + AC-9: 遷移中ブロック）
  const handleNext = useCallback(() => {
    if (transitioningRef.current) return; // AC-9: 遷移中は操作をブロック
    if (currentArticle) {
      void recordDislike(currentArticle.id);
    }
    goToNext(); // AC-5: 即座に遷移（既存挙動維持）
  }, [currentArticle, recordDislike, goToNext]);

  // お気に入りボタンハンドラー
  const handleFavorite = useCallback(() => {
    if (currentArticle) {
      void recordLike(currentArticle.id);
    }
    void toggleFavorite();
  }, [currentArticle, recordLike, toggleFavorite]);

  // AC-6 (007): スクロール完了ハンドラー（Like記録 + 自動遷移開始）
  const handleScrollEnd = useCallback(() => {
    if (currentArticle) {
      void recordLike(currentArticle.id);
    }
    startTransition(); // AC-4: 次の記事への遷移開始
  }, [currentArticle, recordLike, startTransition]);

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

  // AC-2 + AC-4 (007): デュアルWebView + スムーストランジション
  return (
    <div className="relative h-screen overflow-hidden" data-testid="article-viewer">
      {/* AC-4 (007): スライドコンテナ */}
      <div
        className="transition-transform duration-500 ease-in-out"
        style={{
          transform: isTransitioning ? "translateY(calc(-100vh + 100px))" : "translateY(0)",
        }}
      >
        {/* AC-8 (007): 現在の記事 */}
        <ArticleWebView
          url={currentArticle.url}
          articleId={currentArticle.id}
          onScrollEnd={handleScrollEnd}
          onSkip={goToNext}
          onContentLoaded={handleContentLoaded}
        />
        {/* AC-8 (007): 次の記事（プリレンダリング） - onScrollEndは渡さない */}
        {nextArticle && <ArticleWebView url={nextArticle.url} articleId={nextArticle.id} />}
      </div>
      <FloatingUI isFavorited={isFavorited} onFavorite={handleFavorite} onNext={handleNext} />
    </div>
  );
}
