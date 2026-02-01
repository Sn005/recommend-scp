/**
 * @file ArticleWebView コンポーネント（スタブ実装）
 * @description SCP記事をiframe/WebViewで表示するコンポーネント
 * @see specs/006-frontend/006-02-article-reader/006-02-02.md
 *
 * TODO: 006-02-02 で本実装に置き換え
 */
"use client";

export interface ArticleWebViewProps {
  /** 記事URL */
  url: string;
  /** スクロール完了時のコールバック */
  onScrollEnd?: () => void;
}

/**
 * 記事WebViewコンポーネント
 *
 * SCP記事をiframeで表示する。
 * 本番環境ではプロキシ経由で表示予定。
 */
export function ArticleWebView({ url, onScrollEnd }: ArticleWebViewProps) {
  // TODO: 006-02-02 でスクロール検知を実装
  void onScrollEnd;
  return (
    <div className="h-full w-full" data-testid="article-webview" data-url={url}>
      <iframe
        src={url}
        className="h-full w-full border-0"
        sandbox="allow-scripts allow-same-origin"
        loading="lazy"
        title="SCP記事"
      />
    </div>
  );
}
