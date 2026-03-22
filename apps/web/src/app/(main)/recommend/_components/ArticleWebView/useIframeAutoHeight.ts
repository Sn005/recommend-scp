"use client";

import { useEffect, type RefObject } from "react";

const MD_BREAKPOINT = 768;

/**
 * PC版（md以上）でiframeの高さをコンテンツに合わせて自動調整
 *
 * iframeの内部スクロールバーを排除し、bodyスクロールに統一する。
 * ResizeObserverでコンテンツ高さの変化（画像読み込み等）を追跡し、
 * iframe高さを動的に更新する。
 */
export function useIframeAutoHeight(
  iframeRef: RefObject<HTMLIFrameElement | null>,
  containerRef: RefObject<HTMLDivElement | null>,
  isLoading: boolean
) {
  useEffect(() => {
    if (isLoading) return;
    if (typeof window === "undefined" || window.innerWidth < MD_BREAKPOINT) return;

    const iframe = iframeRef.current;
    if (!iframe || !containerRef.current) return;

    let doc: Document | null = null;
    try {
      doc = iframe.contentDocument;
    } catch {
      return;
    }
    if (!doc) return;

    // iframe内部のスクロールを無効化（bodyスクロールに統一）
    try {
      doc.documentElement.style.overflow = "hidden";
      doc.body.style.overflow = "hidden";
    } catch {
      // cross-origin fallback
    }

    const updateHeight = () => {
      try {
        const height = doc.documentElement.scrollHeight;
        iframe.style.height = `${String(height)}px`;
      } catch {
        // cross-origin fallback
      }
    };

    // 初期高さ設定
    updateHeight();

    // コンテンツサイズ変更を追跡（画像読み込み、動的コンテンツ等）
    const observer = new ResizeObserver(updateHeight);
    observer.observe(doc.documentElement);

    // ウィンドウリサイズ対応（ブレークポイント切り替え）
    const handleResize = () => {
      if (window.innerWidth < MD_BREAKPOINT) {
        iframe.style.height = "";
        try {
          doc.documentElement.style.overflow = "";
          doc.body.style.overflow = "";
        } catch {
          // cross-origin fallback
        }
      } else {
        try {
          doc.documentElement.style.overflow = "hidden";
          doc.body.style.overflow = "hidden";
        } catch {
          // cross-origin fallback
        }
        updateHeight();
      }
    };
    window.addEventListener("resize", handleResize);

    return () => {
      observer.disconnect();
      window.removeEventListener("resize", handleResize);
      iframe.style.height = "";
      try {
        doc.documentElement.style.overflow = "";
        doc.body.style.overflow = "";
      } catch {
        // cross-origin fallback
      }
    };
  }, [isLoading, iframeRef, containerRef]);
}
