/**
 * @file 3スロットiframeプール管理Hook
 * @description 即座に3スロットを作成し、Current/Next/Prefetchの3段階iframeを管理
 * @see specs/006-frontend/006-05-transition-ux/006-05-04.md
 */

import { useState, useCallback, useEffect } from "react";

import type { Article } from "../_types";

export interface IframeSlot {
  articleIndex: number;
  url: string;
  /** iframe onLoad 発火済み */
  isLoaded: boolean;
  /** 画像含む全サブリソース読み込み完了（表示切替用） */
  isFullyLoaded: boolean;
}

export interface UseIframePoolOptions {
  articles: Article[];
  currentIndex: number;
}

type Slots = [IframeSlot, IframeSlot | null, IframeSlot | null];

/** 記事が空の場合のプレースホルダースロット */
const EMPTY_SLOT: IframeSlot = { articleIndex: -1, url: "", isLoaded: false, isFullyLoaded: false };

export interface UseIframePoolReturn {
  slots: Slots;
  isNextReady: boolean;
  advance: () => void;
  handleIframeLoad: (articleIndex: number) => void;
  handleIframeFullyLoaded: (articleIndex: number) => void;
}

/** 記事インデックスからスロットを生成（範囲外の場合はnull） */
const createSlot = (articles: Article[], articleIndex: number): IframeSlot | null => {
  if (articleIndex < 0 || articleIndex >= articles.length) return null;
  return { articleIndex, url: articles[articleIndex].url, isLoaded: false, isFullyLoaded: false };
};

export const useIframePool = ({
  articles,
  currentIndex,
}: UseIframePoolOptions): UseIframePoolReturn => {
  // 初期化: 記事がある限り全3スロットを即座に作成
  const [slots, setSlots] = useState<Slots>(() => [
    createSlot(articles, currentIndex) ?? EMPTY_SLOT,
    createSlot(articles, currentIndex + 1),
    createSlot(articles, currentIndex + 2),
  ]);

  // EMPTY_SLOT→実データの初期化（articles取得完了時のみ）
  // advance() がスロット管理を担うため、
  // currentIndex変更時の再構築は行わない（プリロード済みiframeを破棄しない）
  useEffect(() => {
    if (articles.length === 0) return;

    setSlots((prev) => {
      // 初期化済み（EMPTY_SLOTでない）の場合は何もしない
      if (prev[0].articleIndex !== -1) return prev;

      return [
        createSlot(articles, currentIndex) ?? EMPTY_SLOT,
        createSlot(articles, currentIndex + 1),
        createSlot(articles, currentIndex + 2),
      ];
    });
  }, [articles, currentIndex]);

  // articles配列が拡張された時にnullスロットを即座に埋める（loadMore対応）
  useEffect(() => {
    if (articles.length === 0) return;

    setSlots(([current, next, prefetch]) => {
      // 初期化前（EMPTY_SLOT状態）は初期化effectに任せる
      if (current.articleIndex === -1) return [current, next, prefetch];

      // nullスロットを即座に埋める（Cascade制約なし）
      const newNext = next ?? createSlot(articles, current.articleIndex + 1);
      const newPrefetch =
        prefetch ?? createSlot(articles, (newNext?.articleIndex ?? current.articleIndex) + 1);

      // 変更がなければ再レンダリングを避ける
      if (newNext === next && newPrefetch === prefetch) {
        return [current, next, prefetch];
      }

      return [current, newNext, newPrefetch];
    });
  }, [articles]);

  // iframe onLoad完了: isLoadedフラグ更新のみ（スロットは初期化時に作成済み）
  const handleIframeLoad = useCallback(
    (articleIndex: number) => {
      setSlots(([current, next, prefetch]) => {
        if (current.articleIndex === articleIndex) {
          if (current.isLoaded) return [current, next, prefetch];
          return [{ ...current, isLoaded: true }, next, prefetch];
        }

        if (next?.articleIndex === articleIndex) {
          if (next.isLoaded) return [current, next, prefetch];
          return [current, { ...next, isLoaded: true }, prefetch];
        }

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

  // 画像含む全サブリソース読み込み完了: isFullyLoadedをtrueに更新
  const handleIframeFullyLoaded = useCallback((articleIndex: number) => {
    setSlots(([current, next, prefetch]) => {
      const markFully = (slot: IframeSlot): IframeSlot =>
        slot.articleIndex === articleIndex && !slot.isFullyLoaded
          ? { ...slot, isFullyLoaded: true }
          : slot;
      const markFullyNullable = (slot: IframeSlot | null): IframeSlot | null =>
        slot ? markFully(slot) : null;

      return [markFully(current), markFullyNullable(next), markFullyNullable(prefetch)];
    });
  }, []);

  // スロットローテーション: Current破棄、Next→Current、Prefetch→Next、新Prefetch即座作成
  const advance = useCallback(() => {
    setSlots(([current, next, prefetch]) => {
      if (next === null) return [current, next, prefetch];

      const newNext = prefetch;
      // 即座に新Prefetchスロット作成（Cascade制約なし）
      const lastIndex = newNext?.articleIndex ?? next.articleIndex;
      const newPrefetch = createSlot(articles, lastIndex + 1);

      return [next, newNext, newPrefetch];
    });
  }, [articles]);

  const isNextReady = slots[1]?.isLoaded ?? false;

  return { slots, isNextReady, advance, handleIframeLoad, handleIframeFullyLoaded };
};
