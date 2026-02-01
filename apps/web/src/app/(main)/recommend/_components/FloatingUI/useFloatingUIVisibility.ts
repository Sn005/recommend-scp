"use client";

import { useState, useRef, useEffect, useCallback, useMemo } from "react";

interface UseFloatingUIVisibilityOptions {
  /** スクロール率（0-100） */
  scrollPercentage: number;
  /** 非表示になるスクロール閾値（px） */
  hideThreshold?: number;
  /** スクロール停止後の再表示までの時間（ms） */
  showDelayMs?: number;
  /** 常時表示になるスクロール率 */
  alwaysShowThreshold?: number;
}

interface UseFloatingUIVisibilityReturn {
  /** PillNavの表示状態 */
  isPillNavVisible: boolean;
  /** スクロール位置を更新 */
  updateScrollDirection: (currentScrollY: number) => void;
}

export function useFloatingUIVisibility({
  scrollPercentage,
  hideThreshold = 50,
  showDelayMs = 2000,
  alwaysShowThreshold = 90,
}: UseFloatingUIVisibilityOptions): UseFloatingUIVisibilityReturn {
  const [scrollBasedVisibility, setScrollBasedVisibility] = useState(true);
  const lastScrollYRef = useRef(0);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);

  // 記事最下部かどうかを判定
  const isAtBottom = scrollPercentage >= alwaysShowThreshold;

  // 最終的な表示状態を計算（最下部では常に表示）
  const isPillNavVisible = useMemo(() => {
    return isAtBottom || scrollBasedVisibility;
  }, [isAtBottom, scrollBasedVisibility]);

  const updateScrollDirection = useCallback(
    (currentScrollY: number) => {
      // 最下部では何もしない
      if (isAtBottom) {
        lastScrollYRef.current = currentScrollY;
        return;
      }

      const deltaY = currentScrollY - lastScrollYRef.current;
      lastScrollYRef.current = currentScrollY;

      // タイマーをクリア
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
        timeoutRef.current = null;
      }

      if (deltaY > hideThreshold) {
        // 下スクロール: 非表示
        setScrollBasedVisibility(false);
      } else if (deltaY < 0) {
        // 上スクロール: 表示
        setScrollBasedVisibility(true);
      }

      // スクロール停止後に再表示
      timeoutRef.current = setTimeout(() => {
        setScrollBasedVisibility(true);
      }, showDelayMs);
    },
    [isAtBottom, hideThreshold, showDelayMs]
  );

  // クリーンアップ
  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, []);

  return { isPillNavVisible, updateScrollDirection };
}
