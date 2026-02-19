"use client";

import { useState, useCallback, useRef, useMemo, useEffect } from "react";
import { cn } from "@/shared/lib/utils";
import { useArticleWebView } from "./useArticleWebView";
import { use404Detection } from "./use404Detection";
import { useArticleContent } from "./useArticleContent";
import { TranslationNotFound } from "../TranslationNotFound";
import type { ArticleWebViewProps } from "./index";

/**
 * SCP Wiki URLをHTMLプロキシエンドポイント経由のパスに変換
 * HTTPS環境でのmixed content回避のため、iframeのsrcにはプロキシURLを使用。
 * /api/wiki-proxy はHTML内のHTTP URLも書き換えるため、CSS/JS/画像も正常に読み込まれる。
 */
const SCP_JP_HTTP_ORIGIN = "http://scp-jp.wikidot.com";

function toProxyUrl(url: string): string {
  if (url.startsWith(SCP_JP_HTTP_ORIGIN)) {
    return "/api/wiki-proxy" + url.slice(SCP_JP_HTTP_ORIGIN.length);
  }
  return url;
}

/** iframe内画像の読み込みタイムアウト（個別画像ごと） */
const IMAGE_LOAD_TIMEOUT_MS = 10_000;

/**
 * iframe内の全画像が読み込み完了するまで待機
 *
 * wiki-proxy経由の同一オリジンiframeなので contentDocument にアクセス可能。
 * 各imgの .complete を確認し、未完了のものは load/error イベントで完了を待つ。
 * 個別画像のタイムアウト（10秒）を設け、永久待ちを防止する。
 */
function waitForIframeImages(iframe: HTMLIFrameElement): Promise<void> {
  return new Promise((resolve) => {
    let doc: Document | null = null;
    try {
      doc = iframe.contentDocument;
    } catch {
      // Cross-origin（通常はwiki-proxy経由なので発生しない）
      resolve();
      return;
    }
    if (!doc) {
      resolve();
      return;
    }

    const images = Array.from(doc.querySelectorAll("img"));
    const incompleteImages = images.filter((img) => !img.complete);

    if (incompleteImages.length === 0) {
      resolve();
      return;
    }

    let remaining = incompleteImages.length;
    const timeoutIds: ReturnType<typeof setTimeout>[] = [];

    const onDone = () => {
      remaining--;
      if (remaining <= 0) {
        timeoutIds.forEach((id) => {
          clearTimeout(id);
        });
        resolve();
      }
    };

    incompleteImages.forEach((img) => {
      img.addEventListener("load", onDone, { once: true });
      img.addEventListener("error", onDone, { once: true });
      // 個別画像タイムアウト: ネットワーク障害等で永久に読み込めない画像の安全弁
      timeoutIds.push(setTimeout(onDone, IMAGE_LOAD_TIMEOUT_MS));
    });
  });
}

export function ArticleWebView({
  url,
  articleId,
  onScrollEnd,
  onScrollChange,
  onSkip,
  onContentLoaded,
  onIframeLoad,
  onContentFullyReady,
  isVisible,
  className,
}: ArticleWebViewProps) {
  const [showNotFound, setShowNotFound] = useState(false);
  const contentFetchedRef = useRef(false);
  const containerRef = useRef<HTMLDivElement>(null);

  // URL変更時にshowNotFoundをリセット（EMPTY_SLOT→実URL遷移時の防御）
  useEffect(() => {
    setShowNotFound(false);
    contentFetchedRef.current = false;
  }, [url]);

  // iOS Safari/Chrome: プリロード→表示昇格時のスクロール復元
  // pointer-events-none + opacity-0状態で読み込まれたiframeは、iOS WebKitでスクロール
  // 領域が正しく計算されない。表示に切り替わったタイミングで以下を実施:
  // 1. containerのheightトグルによるリフロー強制
  // 2. iframeのwidthを微小変更→復元でiframe自体のレイアウト再計算
  // 3. contentWindowのscrollTo(0,0)でスクロールエンジンの初期化
  const prevVisibleRef = useRef(false);
  useEffect(() => {
    if (isVisible && !prevVisibleRef.current) {
      const container = containerRef.current;
      const iframe = iframeRef.current;
      if (container) {
        container.style.height = "auto";
        requestAnimationFrame(() => {
          requestAnimationFrame(() => {
            container.style.height = "";
            // iframe自体のサイズを微小変更→復元でレイアウト再計算を強制
            if (iframe) {
              iframe.style.width = "calc(100% - 1px)";
              requestAnimationFrame(() => {
                iframe.style.width = "";
                // contentWindowのスクロールエンジンをリセット
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
  }, [isVisible]);

  // iOS Safari フォールバック: 初回タッチ時のリフロー強制
  // 表示昇格時のリフローだけではタイミングが合わずスクロール不可になるケースがある。
  // ユーザーが最初にタッチした瞬間にリフローを再実行し、確実にスクロール可能にする。
  // once: trueで1回だけ発火し、以降はオーバーヘッドなし。
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
  }, [isVisible]);

  // mixed content回避: iframeにはプロキシURLを使用
  const iframeSrc = useMemo(() => toProxyUrl(url), [url]);

  const {
    iframeRef,
    isLoading: isIframeLoading,
    error,
    handleLoad,
    handleError,
    retry,
  } = useArticleWebView({
    url: iframeSrc,
    onScrollEnd,
    onScrollChange,
  });

  // コンテンツ取得（タイトル・本文冒頭）
  const handleContentLoaded = useCallback(
    (content: { title: string; excerpt: string }) => {
      onContentLoaded?.(content);
    },
    [onContentLoaded]
  );

  const { fetchContent } = useArticleContent({
    articleId: articleId ?? "",
    onContentLoaded: handleContentLoaded,
  });

  // プリロード済みスロットがcurrentに昇格した際のコンテンツ取得
  // iframeのonLoadは一度しか発火しないため、non-currentスロットとしてロードされた場合、
  // current昇格時にonContentLoadedが有効になってもhandleIframeLoadは再発火しない。
  // このEffectで昇格後のfetchContentを補完する。
  useEffect(() => {
    if (!isIframeLoading && articleId && onContentLoaded && !contentFetchedRef.current) {
      contentFetchedRef.current = true;
      void fetchContent();
    }
  }, [isIframeLoading, articleId, onContentLoaded, fetchContent]);

  // WebView読み込み完了時にコンテンツ取得を実行
  const handleIframeLoad = useCallback(() => {
    handleLoad();
    onIframeLoad?.(); // 即時: プールカスケード制御用

    const iframe = iframeRef.current;

    // iOS Safari iframe スクロール修正: 親divのheightを一瞬除去してリフローを強制。
    // iOS Safariではiframe親コンテナのスクロール領域が初回レンダリング時に正しく計算されない。
    // DevToolsでh-screenのチェックを外す→戻す操作で治ることから、
    // 2回のペイントサイクルを経てheightをトグルする必要がある（double rAF）。
    const container = containerRef.current;
    if (container) {
      container.style.height = "auto";
      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          container.style.height = "";
        });
      });
    }

    // articleIdが指定されており、まだ取得していない場合のみ実行
    if (articleId && onContentLoaded && !contentFetchedRef.current) {
      contentFetchedRef.current = true;
      void fetchContent();
    }

    // 画像含む全サブリソース読み込み完了を待ってから通知
    if (iframe && onContentFullyReady) {
      void waitForIframeImages(iframe).then(() => {
        onContentFullyReady();
      });
    }
  }, [handleLoad, onIframeLoad, onContentFullyReady, articleId, onContentLoaded, fetchContent]);

  // 404検知時の処理
  const handleNotFound = useCallback(async () => {
    // DB更新（翻訳なしに設定）
    if (articleId) {
      try {
        await fetch(`/api/articles/${articleId}/translation`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ lang: "ja", hasTranslation: false }),
        });
      } catch {
        // API呼び出し失敗してもサジェスト画面は表示
      }
    }

    setShowNotFound(true);
  }, [articleId]);

  // 404検知（バックグラウンドで実行、ローディング表示をブロックしない）
  use404Detection({
    url,
    onNotFound: handleNotFound,
  });

  // 次の記事に遷移
  const handleSuggest = useCallback(() => {
    setShowNotFound(false);
    onSkip?.();
  }, [onSkip]);

  // サジェスト画面表示（通常のArticleWebViewと同じ高さを維持し、次記事が見えないようにする）
  if (showNotFound) {
    return (
      <div className={cn("relative w-full h-screen", className)}>
        <TranslationNotFound onSuggest={handleSuggest} />
      </div>
    );
  }

  return (
    <div
      ref={containerRef}
      data-testid="article-webview"
      data-url={url}
      className={cn("relative w-full h-screen", className)}
    >
      {/* エラー表示 */}
      {error && (
        <div className="absolute inset-0 flex flex-col items-center justify-center bg-gray-100 gap-4">
          <p className="text-gray-600">読み込みに失敗しました</p>
          <button
            type="button"
            onClick={retry}
            className="px-4 py-2 bg-primary text-white rounded-md hover:bg-primary/90 transition-colors"
          >
            再試行
          </button>
        </div>
      )}

      {/* iframe
          セキュリティ: SCP Wikiは信頼できるサイトのため、スクリプト実行とsame-originを許可
          注意: allow-same-origin + allow-scriptsの組み合わせはsandbox制約を事実上無効化するため、
          信頼できないサイトには使用しないこと */}
      <iframe
        ref={iframeRef}
        src={iframeSrc}
        className="w-full h-full border-0"
        onLoad={handleIframeLoad}
        onError={handleError}
        title="SCP記事"
        sandbox="allow-scripts allow-same-origin allow-popups"
      />
    </div>
  );
}
