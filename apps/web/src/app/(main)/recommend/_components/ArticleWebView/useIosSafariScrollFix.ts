"use client";

import { useEffect, useRef, type RefObject } from "react";

interface UseIosSafariScrollFixOptions {
  /** iframeが表示状態かどうか（プリロード→表示昇格の検知用） */
  isVisible?: boolean;
  /** 外側コンテナのRef（heightトグルによるリフロー用） */
  containerRef: RefObject<HTMLDivElement | null>;
  /** iframeのRef（width微小変更 + scrollTo用） */
  iframeRef: RefObject<HTMLIFrameElement | null>;
}

/**
 * iOS Safari/Chrome: プリロード→表示昇格時のスクロール修正フック
 *
 * pointer-events-none + opacity-0 状態で読み込まれたiframeは、
 * iOS WebKit でスクロール領域が正しく計算されない。
 * 表示に切り替わったタイミングで以下を実施:
 * 1. container の height トグルによるリフロー強制
 * 2. iframe の width を微小変更→復元でレイアウト再計算
 * 3. contentWindow の scrollTo(0,0) でスクロールエンジンの初期化
 *
 * さらに、表示昇格時のリフローだけではタイミングが合わないケースに備え、
 * ユーザーが最初にタッチした瞬間にリフローを再実行する（once: true で1回のみ）。
 */
export function useIosSafariScrollFix(options: UseIosSafariScrollFixOptions): void {
  const { isVisible, containerRef, iframeRef } = options;
  const prevVisibleRef = useRef(false);

  // Effect 1: 表示昇格時のリフロー強制
  useEffect(() => {
    if (isVisible && !prevVisibleRef.current) {
      const container = containerRef.current;
      const iframe = iframeRef.current;
      if (container) {
        container.style.height = "auto";
        requestAnimationFrame(() => {
          requestAnimationFrame(() => {
            container.style.height = "";
            if (iframe) {
              iframe.style.width = "calc(100% - 1px)";
              requestAnimationFrame(() => {
                iframe.style.width = "";
                try {
                  iframe.contentWindow?.scrollTo(0, 0);
                } catch {
                  // cross-origin fallback
                }
              });
            }
          });
        });
      }
    }
    prevVisibleRef.current = !!isVisible;
  }, [isVisible, containerRef, iframeRef]);

  // Effect 2: 初回タッチ時のリフローフォールバック
  useEffect(() => {
    if (!isVisible) return;
    const iframe = iframeRef.current;
    const container = containerRef.current;
    if (!iframe || !container) return;

    let iframeWindow: Window | null = null;
    try {
      iframeWindow = iframe.contentWindow;
    } catch {
      return;
    }
    if (!iframeWindow) return;

    const onFirstTouch = () => {
      container.style.height = "auto";
      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          container.style.height = "";
        });
      });
    };

    iframeWindow.addEventListener("touchstart", onFirstTouch, { once: true, passive: true });
    return () => {
      try {
        iframeWindow.removeEventListener("touchstart", onFirstTouch);
      } catch {
        // iframe may have navigated away
      }
    };
  }, [isVisible, containerRef, iframeRef]);
}
