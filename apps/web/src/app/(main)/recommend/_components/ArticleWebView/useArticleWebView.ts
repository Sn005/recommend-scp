"use client";

import { useState, useEffect, useRef, useCallback, type RefObject } from "react";

interface UseArticleWebViewOptions {
  url: string;
  onScrollEnd?: () => void;
  onScrollChange?: (percentage: number) => void;
}

interface UseArticleWebViewReturn {
  iframeRef: RefObject<HTMLIFrameElement | null>;
  isLoading: boolean;
  error: Error | null;
  scrollPercentage: number;
  handleLoad: () => void;
  handleError: () => void;
  retry: () => void;
}

const SCROLL_END_THRESHOLD = 90;
const IFRAME_LOAD_TIMEOUT_MS = 15_000;

/**
 * スクロール率を正規化（0-100の範囲に収める）
 */
function normalizePercentage(percentage: number): number {
  if (percentage < 0) return 0;
  if (percentage > 100) return 100;
  return percentage;
}

export function useArticleWebView(options: UseArticleWebViewOptions): UseArticleWebViewReturn {
  const { url, onScrollEnd, onScrollChange } = options;

  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const [scrollPercentage, setScrollPercentage] = useState(0);
  const [hasTriggeredEnd, setHasTriggeredEnd] = useState(false);

  const iframeRef = useRef<HTMLIFrameElement | null>(null);

  // コールバックのrefを保持（スクロールハンドラー内でのstale closure防止）
  const callbacksRef = useRef({ onScrollChange, onScrollEnd });
  useEffect(() => {
    callbacksRef.current = { onScrollChange, onScrollEnd };
  }, [onScrollChange, onScrollEnd]);

  const hasTriggeredEndRef = useRef(false);
  useEffect(() => {
    hasTriggeredEndRef.current = hasTriggeredEnd;
  }, [hasTriggeredEnd]);

  // URL変更時にリセット
  // React 18ではuseEffect内のsetStateはバッチ処理されるため、パフォーマンス問題は発生しない
  useEffect(() => {
    setIsLoading(true);
    setError(null);
    setScrollPercentage(0);
    setHasTriggeredEnd(false);
    hasTriggeredEndRef.current = false;

    // iframe読み込みタイムアウト: onLoadが発火しない場合（mixed content blocking等）に
    // ローディング状態を強制解除する
    const timeoutId = setTimeout(() => {
      setIsLoading(false);
    }, IFRAME_LOAD_TIMEOUT_MS);

    return () => {
      clearTimeout(timeoutId);
    };
  }, [url]);

  // iframe contentWindowのスクロールを直接検知
  // wiki-proxy経由で同一オリジン配信のため、contentWindowに直接アクセス可能
  // PC/モバイル共通: iframe内部スクロールモデルに統一
  useEffect(() => {
    if (isLoading) return;

    const iframe = iframeRef.current;
    if (!iframe) return;

    let iframeWindow: Window | null = null;
    try {
      iframeWindow = iframe.contentWindow;
    } catch {
      // Cross-origin access denied（通常はwiki-proxy経由なので発生しない）
      return;
    }
    if (!iframeWindow) return;

    let active = true;
    let ticking = false;

    const handleScroll = () => {
      if (ticking || !active) return;
      ticking = true;
      requestAnimationFrame(() => {
        ticking = false;
        if (!active) return;
        try {
          const scrollTop = iframeWindow.scrollY;
          const docHeight = iframeWindow.document.documentElement.scrollHeight;
          const viewHeight = iframeWindow.innerHeight;
          if (docHeight <= viewHeight) return;
          const raw = (scrollTop / (docHeight - viewHeight)) * 100;
          const normalized = normalizePercentage(raw);
          setScrollPercentage(normalized);
          callbacksRef.current.onScrollChange?.(normalized);
          if (!hasTriggeredEndRef.current && normalized >= SCROLL_END_THRESHOLD) {
            setHasTriggeredEnd(true);
            hasTriggeredEndRef.current = true;
            callbacksRef.current.onScrollEnd?.();
          }
        } catch {
          // contentWindow access may fail if iframe navigated away
        }
      });
    };

    iframeWindow.addEventListener("scroll", handleScroll, { passive: true });

    return () => {
      active = false;
      try {
        iframeWindow.removeEventListener("scroll", handleScroll);
      } catch {
        // iframe may have navigated away
      }
    };
  }, [isLoading, url]);

  const handleLoad = useCallback(() => {
    setIsLoading(false);
    setError(null);
  }, []);

  const handleError = useCallback(() => {
    setError(new Error("記事の読み込みに失敗しました"));
    setIsLoading(false);
  }, []);

  const retry = useCallback(() => {
    setError(null);
    setIsLoading(true);
    setScrollPercentage(0);
    setHasTriggeredEnd(false);
    hasTriggeredEndRef.current = false;
  }, []);

  return {
    iframeRef,
    isLoading,
    error,
    scrollPercentage,
    handleLoad,
    handleError,
    retry,
  };
}
