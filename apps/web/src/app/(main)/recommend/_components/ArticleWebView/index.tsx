import type { ArticleContent } from "./useArticleContent";

export interface ArticleWebViewProps {
  /** 表示する記事のURL */
  url: string;
  /** 記事ID（404検知時のDB更新に使用） */
  articleId?: string;
  /** スクロール率が90%に達した時のコールバック */
  onScrollEnd?: () => void;
  /** スクロール位置変更時のコールバック（0-100%） */
  onScrollChange?: (percentage: number) => void;
  /** 404検知時に次の記事に遷移するコールバック */
  onSkip?: () => void;
  /** コンテンツ（タイトル・本文冒頭）取得完了時のコールバック */
  onContentLoaded?: (content: ArticleContent) => void;
  /** iframe読み込み完了時のコールバック（カスケード先読み用、onLoad即時発火） */
  onIframeLoad?: () => void;
  /** iframe内の画像含む全サブリソース読み込み完了時のコールバック（表示切替用） */
  onContentFullyReady?: () => void;
  /** iframeが表示状態かどうか（iOS scroll fix: プリロード→表示昇格時のリフロー用） */
  isVisible?: boolean;
  /** 追加のCSSクラス */
  className?: string;
}

export { ArticleWebView } from "./ArticleWebView";
export { useArticleWebView } from "./useArticleWebView";
export { use404Detection } from "./use404Detection";
export { useArticleContent } from "./useArticleContent";
export { useIosSafariScrollFix } from "./useIosSafariScrollFix";
export { useNotFoundState } from "./useNotFoundState";
export { useIframeLoadHandler } from "./useIframeLoadHandler";
export { useIframeAutoHeight } from "./useIframeAutoHeight";
export type {
  ArticleContent,
  UseArticleContentOptions,
  UseArticleContentReturn,
} from "./useArticleContent";
