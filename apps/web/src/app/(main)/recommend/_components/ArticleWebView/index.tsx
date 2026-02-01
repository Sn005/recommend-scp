export interface ArticleWebViewProps {
  /** 表示する記事のURL */
  url: string;
  /** スクロール率が90%に達した時のコールバック */
  onScrollEnd?: () => void;
  /** スクロール位置変更時のコールバック（0-100%） */
  onScrollChange?: (percentage: number) => void;
  /** 追加のCSSクラス */
  className?: string;
}

export { ArticleWebView } from "./ArticleWebView";
export { useArticleWebView } from "./useArticleWebView";
