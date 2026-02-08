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
  /** iframe読み込み完了時のコールバック */
  onIframeLoad?: () => void;
  /** 追加のCSSクラス */
  className?: string;
}

export { ArticleWebView } from "./ArticleWebView";
export { useArticleWebView } from "./useArticleWebView";
export { use404Detection } from "./use404Detection";
export { useArticleContent } from "./useArticleContent";
export type {
  ArticleContent,
  UseArticleContentOptions,
  UseArticleContentReturn,
} from "./useArticleContent";
