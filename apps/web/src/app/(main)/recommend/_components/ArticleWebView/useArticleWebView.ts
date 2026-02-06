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

/**
 * postMessageで受信するスクロールメッセージの型
 */
interface ScrollMessage {
  type: "scroll";
  percentage: number;
}

/**
 * データがScrollMessage型かどうかを判定する型ガード
 */
function isScrollMessage(data: unknown): data is ScrollMessage {
  return (
    typeof data === "object" &&
    data !== null &&
    "type" in data &&
    data.type === "scroll" &&
    "percentage" in data &&
    typeof data.percentage === "number"
  );
}

/**
 * 許可するorigin（SCP Wikiサイト）
 * セキュリティ: 信頼できるサイトからのpostMessageのみ受け付ける
 *
 * 注意: wiki-proxyを経由したコンテンツはアプリと同一オリジンで配信されるため、
 * 同一オリジンからのpostMessageも isAllowedOrigin() で許可する。
 */
const ALLOWED_ORIGINS = [
  "https://scp-jp.wikidot.com",
  "https://scp-wiki.wikidot.com",
  "https://fondazionescp.wikidot.com",
  "https://scp-wiki-cn.wikidot.com",
  "https://scp-kr.wikidot.com",
  "https://scp-wiki.net",
];

/**
 * メッセージのoriginが許可されているかを判定
 * - ALLOWED_ORIGINSリスト内のSCP Wikiドメイン
 * - wiki-proxy経由の同一オリジン（window.location.origin）
 */
function isAllowedOrigin(origin: string): boolean {
  if (ALLOWED_ORIGINS.includes(origin)) return true;
  if (typeof window !== "undefined" && origin === window.location.origin) return true;
  return false;
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

  // URL変更時にリセット
  // React 18ではuseEffect内のsetStateはバッチ処理されるため、パフォーマンス問題は発生しない
  useEffect(() => {
    setIsLoading(true);
    setError(null);
    setScrollPercentage(0);
    setHasTriggeredEnd(false);

    // iframe読み込みタイムアウト: onLoadが発火しない場合（mixed content blocking等）に
    // ローディング状態を強制解除する
    const timeoutId = setTimeout(() => {
      setIsLoading(false);
    }, IFRAME_LOAD_TIMEOUT_MS);

    return () => {
      clearTimeout(timeoutId);
    };
  }, [url]);

  // スクロール検知（postMessage経由）
  useEffect(() => {
    const handleMessage = (event: MessageEvent<unknown>) => {
      // セキュリティ: 信頼できるoriginからのメッセージのみ処理
      if (!isAllowedOrigin(event.origin)) {
        return;
      }

      // 型安全: ScrollMessage型ガードで検証
      if (!isScrollMessage(event.data)) {
        return;
      }

      const normalized = normalizePercentage(event.data.percentage);
      setScrollPercentage(normalized);
      onScrollChange?.(normalized);

      if (normalized >= SCROLL_END_THRESHOLD && !hasTriggeredEnd) {
        setHasTriggeredEnd(true);
        onScrollEnd?.();
      }
    };

    window.addEventListener("message", handleMessage);
    return () => {
      window.removeEventListener("message", handleMessage);
    };
  }, [onScrollChange, onScrollEnd, hasTriggeredEnd]);

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
