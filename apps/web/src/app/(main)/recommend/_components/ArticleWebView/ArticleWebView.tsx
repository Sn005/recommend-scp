"use client";

import { useRef, useMemo } from "react";
import { cn } from "@/shared/lib/utils";
import { useArticleWebView } from "./useArticleWebView";
import { useIosSafariScrollFix } from "./useIosSafariScrollFix";
import { useNotFoundState } from "./useNotFoundState";
import { useIframeLoadHandler } from "./useIframeLoadHandler";
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
    return "/api/wiki-proxy" + url.slice(SCP_JP_HTTP_ORIGIN.length) + "?nav=floating";
  }
  return url;
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
  const containerRef = useRef<HTMLDivElement>(null);

  // mixed content回避: iframeにはプロキシURLを使用
  const iframeSrc = useMemo(() => toProxyUrl(url), [url]);

  // iframe管理（ローディング・スクロール検知・エラー処理）
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

  // iOS Safari: プリロード→表示昇格時のスクロール修正
  useIosSafariScrollFix({ isVisible, containerRef, iframeRef });

  // 404検知・NotFound UI状態管理
  const { showNotFound, handleSuggest } = useNotFoundState({
    url,
    articleId,
    onSkip,
  });

  // iframeロード後のコンテンツ取得ライフサイクル
  const { handleIframeLoad } = useIframeLoadHandler({
    url,
    articleId,
    isIframeLoading,
    iframeRef,
    containerRef,
    handleLoad,
    onContentLoaded,
    onIframeLoad,
    onContentFullyReady,
  });

  // サジェスト画面表示（通常のArticleWebViewと同じ高さを維持し、次記事が見えないようにする）
  if (showNotFound) {
    return (
      <div className={cn("relative w-full h-screen md:h-[calc(100vh-56px)]", className)}>
        <TranslationNotFound onSuggest={handleSuggest} />
      </div>
    );
  }

  return (
    <div
      ref={containerRef}
      data-testid="article-webview"
      data-url={url}
      className={cn("relative w-full h-screen md:h-[calc(100vh-56px)]", className)}
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
