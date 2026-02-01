"use client";

import { cn } from "@/shared/lib/utils";
import { useArticleWebView } from "./useArticleWebView";
import type { ArticleWebViewProps } from "./index";

export function ArticleWebView({
  url,
  onScrollEnd,
  onScrollChange,
  className,
}: ArticleWebViewProps) {
  const { iframeRef, isLoading, error, handleLoad, handleError, retry } = useArticleWebView({
    url,
    onScrollEnd,
    onScrollChange,
  });

  return (
    <div className={cn("relative w-full h-[calc(100vh-100px)]", className)}>
      {/* ローディングインジケータ */}
      {isLoading && !error && (
        <div
          data-testid="loading-indicator"
          className="absolute inset-0 flex items-center justify-center bg-gray-100"
        >
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
        </div>
      )}

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
        src={url}
        className="w-full h-full border-0"
        onLoad={handleLoad}
        onError={handleError}
        title="SCP記事"
        sandbox="allow-scripts allow-same-origin allow-popups"
      />
    </div>
  );
}
