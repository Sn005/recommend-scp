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

export function ArticleWebView({
  url,
  articleId,
  onScrollEnd,
  onScrollChange,
  onSkip,
  onContentLoaded,
  className,
}: ArticleWebViewProps) {
  const [showNotFound, setShowNotFound] = useState(false);
  const contentFetchedRef = useRef(false);

  // URL変更時にshowNotFoundをリセット（EMPTY_SLOT→実URL遷移時の防御）
  useEffect(() => {
    setShowNotFound(false);
    contentFetchedRef.current = false;
  }, [url]);

  // mixed content回避: iframeにはプロキシURLを使用
  const iframeSrc = useMemo(() => toProxyUrl(url), [url]);

  const { iframeRef, isLoading, error, handleLoad, handleError, retry } = useArticleWebView({
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

  // WebView読み込み完了時にコンテンツ取得を実行
  const handleIframeLoad = useCallback(() => {
    handleLoad();

    // articleIdが指定されており、まだ取得していない場合のみ実行
    if (articleId && onContentLoaded && !contentFetchedRef.current) {
      contentFetchedRef.current = true;
      void fetchContent();
    }
  }, [handleLoad, articleId, onContentLoaded, fetchContent]);

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
      <div className={cn("relative w-full h-[calc(100vh-100px)]", className)}>
        <TranslationNotFound onSuggest={handleSuggest} />
      </div>
    );
  }

  return (
    <div
      data-testid="article-webview"
      data-url={url}
      className={cn("relative w-full h-[calc(100vh-100px)]", className)}
    >
      {/* ローディングインジケータ（iframe読み込み中のみ） */}
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
