/**
 * @file 3スロットiframeプール管理Hook
 * @description Cascade Prefetch方式でCurrent/Next/Prefetchの3段階iframeを管理
 * @see specs/006-frontend/006-05-transition-ux/006-05-04.md
 */

import { useState, useCallback, useEffect } from "react";

import type { Article } from "../_types";

export interface IframeSlot {
  articleIndex: number;
  url: string;
  isLoaded: boolean;
}

export interface UseIframePoolOptions {
  articles: Article[];
  currentIndex: number;
}

type Slots = [IframeSlot, IframeSlot | null, IframeSlot | null];

/** 記事が空の場合のプレースホルダースロット */
const EMPTY_SLOT: IframeSlot = { articleIndex: -1, url: "", isLoaded: false };

export interface UseIframePoolReturn {
  slots: Slots;
  isNextReady: boolean;
  advance: () => void;
  handleIframeLoad: (articleIndex: number) => void;
}

/** 記事インデックスからスロットを生成（範囲外の場合はnull） */
const createSlot = (articles: Article[], articleIndex: number): IframeSlot | null => {
  if (articleIndex < 0 || articleIndex >= articles.length) return null;
  return { articleIndex, url: articles[articleIndex].url, isLoaded: false };
};

/** 次のスロットが作成可能か判定し、作成する */
const tryCreateNextSlot = (
  articles: Article[],
  afterIndex: number,
  existing: IframeSlot | null
): IframeSlot | null => {
  if (existing !== null) return existing;
  const nextIndex = afterIndex + 1;
  if (nextIndex >= articles.length) return null;
  return createSlot(articles, nextIndex);
};

export const useIframePool = ({
  articles,
  currentIndex,
}: UseIframePoolOptions): UseIframePoolReturn => {
  const [slots, setSlots] = useState<Slots>(() => [
    createSlot(articles, currentIndex) ?? EMPTY_SLOT,
    null,
    null,
  ]);

  // articles取得完了時にEMPTY_SLOTを実データで再初期化
  // useState初期化子は最初の1回しか実行されないため、
  // 初回レンダリング時にarticlesが空だとEMPTY_SLOTのまま固定される問題を解消
  useEffect(() => {
    setSlots((prev) => {
      if (prev[0].articleIndex === -1 && articles.length > 0) {
        return [createSlot(articles, currentIndex) ?? EMPTY_SLOT, null, null];
      }
      return prev;
    });
  }, [articles, currentIndex]);

  // Cascade読み込み: loadイベントでisLoadedを更新し、次のスロットを作成
  const handleIframeLoad = useCallback(
    (articleIndex: number) => {
      setSlots(([current, next, prefetch]) => {
        // Current読み込み完了 → Cascade: Next作成
        if (current.articleIndex === articleIndex) {
          if (current.isLoaded) return [current, next, prefetch];
          const loaded: IframeSlot = { ...current, isLoaded: true };
          return [loaded, tryCreateNextSlot(articles, loaded.articleIndex, next), prefetch];
        }

        // Next読み込み完了 → Cascade: Prefetch作成
        if (next?.articleIndex === articleIndex) {
          if (next.isLoaded) return [current, next, prefetch];
          const loaded: IframeSlot = { ...next, isLoaded: true };
          return [current, loaded, tryCreateNextSlot(articles, loaded.articleIndex, prefetch)];
        }

        // Prefetch読み込み完了
        if (prefetch?.articleIndex === articleIndex) {
          if (prefetch.isLoaded) return [current, next, prefetch];
          return [current, next, { ...prefetch, isLoaded: true }];
        }

        // 対象スロットなし（不明なarticleIndex）、無視
        return [current, next, prefetch];
      });
    },
    [articles]
  );

  // スロットローテーション: Current破棄、Next→Current、Prefetch→Next
  const advance = useCallback(() => {
    setSlots(([current, next, prefetch]) => {
      if (next === null) return [current, next, prefetch];

      const newNext = prefetch;
      // Cascade: 新Nextが読み込み済みなら新Prefetch作成
      const newPrefetch = newNext?.isLoaded
        ? tryCreateNextSlot(articles, newNext.articleIndex, null)
        : null;

      return [next, newNext, newPrefetch];
    });
  }, [articles]);

  const isNextReady = slots[1]?.isLoaded ?? false;

  return { slots, isNextReady, advance, handleIframeLoad };
};
