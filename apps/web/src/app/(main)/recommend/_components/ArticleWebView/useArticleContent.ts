/**
 * @file useArticleContent フック
 * @description WebView表示後に記事のタイトル・本文冒頭を取得するフック
 * @see specs/010-ja-article-display/010-03-webview-ja/010-03-03.md
 */

"use client";

import { useState, useCallback } from "react";

/**
 * コンテンツ取得結果
 */
export interface ArticleContent {
  /** 記事タイトル */
  title: string;
  /** 本文冒頭（最大50文字） */
  excerpt: string;
}

/**
 * useArticleContent オプション
 */
export interface UseArticleContentOptions {
  /** 記事ID（例: scp-173） */
  articleId: string;
  /** コンテンツ取得完了時のコールバック */
  onContentLoaded: (content: ArticleContent) => void;
}

/**
 * useArticleContent 戻り値
 */
export interface UseArticleContentReturn {
  /** コンテンツ取得を実行する関数 */
  fetchContent: () => Promise<void>;
  /** 取得中かどうか */
  isLoading: boolean;
}

/**
 * 記事コンテンツ取得フック
 *
 * サーバーサイドAPIを通じて記事のタイトルと本文冒頭を取得する。
 * クロスオリジン制限を回避するため、直接iframeにアクセスせず
 * APIプロキシ経由でコンテンツを取得する。
 *
 * @param options - フックオプション
 * @returns fetchContent関数とisLoading状態
 *
 * @example
 * ```tsx
 * const { fetchContent, isLoading } = useArticleContent({
 *   articleId: "scp-173",
 *   onContentLoaded: (content) => {
 *     console.log(content.title, content.excerpt);
 *   },
 * });
 *
 * // WebView読み込み完了時に呼び出す
 * await fetchContent();
 * ```
 */
export function useArticleContent(options: UseArticleContentOptions): UseArticleContentReturn {
  const { articleId, onContentLoaded } = options;
  const [isLoading, setIsLoading] = useState(false);

  const fetchContent = useCallback(async () => {
    setIsLoading(true);
    try {
      const response = await fetch(`/api/articles/${articleId}/content`);
      const { title, excerpt } = (await response.json()) as ArticleContent;

      // タイトルと本文の両方が存在する場合のみコールバックを呼び出す
      if (title && excerpt) {
        onContentLoaded({ title, excerpt });
      }
    } catch (error) {
      // サイレント失敗: ユーザー体験を妨げない
      // eslint-disable-next-line no-console
      console.error("Content extraction failed:", error);
    } finally {
      setIsLoading(false);
    }
  }, [articleId, onContentLoaded]);

  return { fetchContent, isLoading };
}
