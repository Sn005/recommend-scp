/**
 * @file 記事閲覧ページ
 * @description /recommend ページのメインコンポーネント
 * @see specs/006-frontend/006-05-transition-ux/006-05-07.md
 *
 * 006-05-07: 遷移UX統合
 * - useIframePool: 3スロットCascade Prefetchプール
 * - TransitionCard: 遷移ヘッダーカード（フェードイン/アウト）
 * - useFeedback: recordSkip + メタデータ（scrollDepth, dwellTime）
 * - FloatingUI: ProgressBarなし
 */
"use client";

import { useState, useCallback, useRef, useEffect } from "react";
import { useInfiniteArticles } from "./_hooks/useInfiniteArticles";
import { useFeedback, calculateInterestLevel } from "./_hooks/useFeedback";
import { useArticleFavorite } from "@/shared/hooks/useArticleFavorite";
import { useIframePool } from "./_hooks/useIframePool";
import { useHistory } from "@/app/(main)/history/_hooks/useHistory";
import type { HistoryEntry } from "@/app/(main)/history/_types";
import { ArticleWebView, type ArticleContent } from "./_components/ArticleWebView";
import { FloatingUI } from "./_components/FloatingUI";
import { TransitionCard } from "./_components/TransitionCard";
import { EmptyState } from "./_components/EmptyState";
import { ErrorState } from "./_components/ErrorState";
import { SkeletonLoader } from "@/shared/components/ui/SkeletonLoader";
import { AttributionFooter } from "@/shared/components/ui/AttributionFooter";

/**
 * 推薦記事閲覧ページ
 *
 * 006-05-07: 遷移UX統合
 * AC-1: フルフロー遷移（フェードアウト → TransitionCard → フェードイン）
 * AC-2: iframeプール統合（3スロット）
 * AC-3: TransitionCardとiframePoolの連携
 * AC-4: フィードバック統合（recordSkip + metadata）
 * AC-5: ProgressBar非表示
 * AC-6: 連打防止
 * AC-7: （削除: 読了自動遷移はStory specで不採用）
 * AC-8: お気に入りボタン正常動作
 * AC-9: 推薦切れ・エラー時の挙動
 * AC-10: prefers-reduced-motion対応
 */
export default function RecommendPage() {
  const { articles, currentIndex, isLoading, error, isEmpty, goToNext, refetch } =
    useInfiniteArticles();

  const { recordLike, recordSkip } = useFeedback();
  const currentArticle = articles[currentIndex] as (typeof articles)[number] | undefined;
  const { isFavorited, toggleFavorite } = useArticleFavorite({
    articleId: currentArticle?.id,
  });
  const { add: addToHistory } = useHistory();

  // AC-2: iframeプール（3スロット）
  const {
    slots,
    advance,
    handleIframeLoad: poolHandleIframeLoad,
    handleIframeFullyLoaded: poolHandleFullyLoaded,
  } = useIframePool({
    articles,
    currentIndex,
  });

  const [isRetrying, setIsRetrying] = useState(false);

  // AC-6: 連打防止 - 遷移中フラグ（useRefで同期的にチェック）
  const transitioningRef = useRef(false);

  // AC-1: TransitionCard表示制御
  const [showCard, setShowCard] = useState(false);
  const [nextArticleForCard, setNextArticleForCard] = useState<(typeof articles)[number] | null>(
    null
  );

  // iframe読み込み待ち（初回表示 + 遷移後の旧記事フラッシュ防止）
  // 初期値false: iframeのonLoad完了まで非表示にし、コンテンツ未描画状態の表示を防ぐ
  const [isSlotReady, setIsSlotReady] = useState(false);

  // プリロード済みスロットがcurrentに昇格した場合、isFullyLoadedを確認してからisSlotReadyをtrueにする
  // isLoaded（onLoad発火）ではなくisFullyLoaded（画像含む全リソース完了）を使用し、
  // 記事の部分表示状態でのTransitionCard非表示を防止する
  const currentSlotArticleIndex = slots[0].articleIndex;
  const currentSlotFullyLoaded = slots[0].isFullyLoaded;
  const prevSlotIndexRef = useRef(currentSlotArticleIndex);
  useEffect(() => {
    if (currentSlotArticleIndex !== prevSlotIndexRef.current && currentSlotFullyLoaded) {
      setIsSlotReady(true);
    }
    prevSlotIndexRef.current = currentSlotArticleIndex;
  }, [currentSlotArticleIndex, currentSlotFullyLoaded]);

  // AC-4: スクロール深度の追跡（最大到達深度を保持）
  const maxScrollDepthRef = useRef(0);

  // AC-4: 滞在時間の計測
  const articleStartTimeRef = useRef(0);

  // 記事が変わったらスクロール深度・滞在時間をリセット
  useEffect(() => {
    maxScrollDepthRef.current = 0;
    articleStartTimeRef.current = Date.now();
  }, [currentIndex]);

  // スクロール深度の変更ハンドラー
  const handleScrollChange = useCallback((percentage: number) => {
    if (percentage > maxScrollDepthRef.current) {
      maxScrollDepthRef.current = percentage;
    }
  }, []);

  // 再試行ハンドラー
  const handleRetry = useCallback(() => {
    setIsRetrying(true);
    void refetch().finally(() => {
      setIsRetrying(false);
    });
  }, [refetch]);

  // AC-1: 遷移開始（即座にスロットローテーション + TransitionCard表示）
  // iframeの読み込みをTransitionCard表示中にバックグラウンドで実行し、
  // カード非表示後の待ち時間を最小化する
  const startTransitionWithCard = useCallback(() => {
    const nextArticle = articles[currentIndex + 1] as (typeof articles)[number] | undefined;
    if (transitioningRef.current || !nextArticle) return;

    transitioningRef.current = true;
    setIsSlotReady(false);

    // 即座にスロットローテーション（iframeのバックグラウンド読み込み開始）
    advance();
    goToNext();

    // TransitionCard表示（iframe読み込み完了まで表示し続ける）
    setNextArticleForCard(nextArticle);
    setShowCard(true);
  }, [articles, currentIndex, advance, goToNext]);

  // AC-1: TransitionCard dismiss完了ハンドラー
  // advance/goToNextは遷移開始時に実行済み。カード非表示のみ行う
  const handleCardDismissed = useCallback(() => {
    setShowCard(false);
    transitioningRef.current = false;
  }, []);

  // Current スロットのiframe読み込み完了ハンドラー
  const handleCurrentIframeLoad = useCallback(() => {
    setIsSlotReady(true);
  }, []);

  // 初回記事表示: 記事到着時にTransitionCardを表示してiframe読み込みを待つ
  const initialCardShownRef = useRef(false);
  useEffect(() => {
    if (currentArticle && !initialCardShownRef.current) {
      initialCardShownRef.current = true;
      setNextArticleForCard(currentArticle);
      setShowCard(true);
      transitioningRef.current = true;
    }
  }, [currentArticle]);

  // AC-4 + AC-6: 次へボタンハンドラー（recordSkip + TransitionCard遷移）
  const handleNext = useCallback(() => {
    if (transitioningRef.current) return; // AC-6: 遷移中は操作をブロック

    const nextArticle = articles[currentIndex + 1] as (typeof articles)[number] | undefined;
    if (!nextArticle) return;

    // AC-4: 暗黙的フィードバック（Skip + メタデータ）
    if (currentArticle) {
      const dwellTime = (Date.now() - articleStartTimeRef.current) / 1000;
      const currentScrollDepth = maxScrollDepthRef.current;
      const interestLevel = calculateInterestLevel(currentScrollDepth, dwellTime);
      void recordSkip(currentArticle.id, {
        scrollDepth: currentScrollDepth,
        dwellTime,
        interestLevel,
      });
    }

    // AC-1: TransitionCard経由の遷移
    startTransitionWithCard();
  }, [currentArticle, articles, currentIndex, recordSkip, startTransitionWithCard]);

  // AC-8: お気に入りボタンハンドラー（遷移に影響しない）
  const handleFavorite = useCallback(() => {
    if (currentArticle) {
      void recordLike(currentArticle.id);
    }
    void toggleFavorite();
  }, [currentArticle, recordLike, toggleFavorite]);

  // コンテンツ読み込み完了ハンドラー（履歴保存）
  const handleContentLoaded = useCallback(
    (content: ArticleContent) => {
      if (currentArticle) {
        addToHistory({
          scpNumber: currentArticle.id,
          title: content.title || currentArticle.title,
          excerpt: content.excerpt,
          objectClass: (currentArticle.objectClass as HistoryEntry["objectClass"]) ?? undefined,
          rating: currentArticle.rating,
        });
      }
    },
    [currentArticle, addToHistory]
  );

  // AC-9: ローディング中はスケルトンUIを表示
  // API応答後にTransitionCard（記事情報付き）でiframe読み込みを待つ
  if (isLoading) {
    return <SkeletonLoader />;
  }

  // AC-9: エラー時はErrorStateを表示
  if (error) {
    return <ErrorState error={error} onRetry={handleRetry} isRetrying={isRetrying} />;
  }

  // AC-9: 推薦切れ時はEmptyStateを表示
  if (isEmpty || !currentArticle) {
    return <EmptyState />;
  }

  // AC-2: iframeプールに基づくレンダリング
  return (
    <div className="relative h-screen overflow-clip" data-testid="article-viewer">
      {/* AC-2: iframeプール（key付きでDOM保持 → プリロード有効化） */}
      {slots.map((slot, i) => {
        if (!slot) return null;
        const isCurrent = i === 0;
        const isVisible = isCurrent && !showCard && isSlotReady;

        return (
          <ArticleWebView
            key={`slot-${String(slot.articleIndex)}`}
            url={slot.url}
            articleId={articles[slot.articleIndex]?.id}
            isVisible={isVisible}
            onScrollChange={isCurrent ? handleScrollChange : undefined}
            onSkip={isCurrent ? goToNext : undefined}
            onContentLoaded={isCurrent ? handleContentLoaded : undefined}
            onIframeLoad={() => {
              poolHandleIframeLoad(slot.articleIndex);
            }}
            onContentFullyReady={() => {
              poolHandleFullyLoaded(slot.articleIndex);
              if (isCurrent) {
                handleCurrentIframeLoad();
              }
            }}
            className={
              isVisible
                ? "absolute inset-0 opacity-100 z-10"
                : isCurrent
                  ? "absolute inset-0 opacity-0 z-10"
                  : "absolute inset-0 opacity-0 z-0 pointer-events-none"
            }
          />
        );
      })}

      {/* AC-1/AC-3: TransitionCard */}
      {nextArticleForCard && (
        <TransitionCard
          scpNumber={nextArticleForCard.id}
          objectClass={nextArticleForCard.objectClass}
          rating={nextArticleForCard.rating}
          isVisible={showCard}
          isContentReady={isSlotReady}
          onDismissed={handleCardDismissed}
        />
      )}

      {/* AC-5: FloatingUI（ProgressBarなし） */}
      <FloatingUI isFavorited={isFavorited} onFavorite={handleFavorite} onNext={handleNext} />

      {/* ライセンス帰属表示フッター（画面最下部に固定表示） */}
      <AttributionFooter
        articleId={currentArticle.id}
        className="fixed bottom-0 left-0 right-0 z-20 border-t border-gray-200 bg-gray-50/95 px-4 py-1.5 text-center text-xs text-gray-500 backdrop-blur-sm"
      />
    </div>
  );
}
