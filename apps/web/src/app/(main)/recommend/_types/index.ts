/**
 * @file 記事閲覧ページの型定義
 * @description /recommend ページで使用する型
 * @see specs/006-frontend/006-02-article-reader/006-02-01.md
 */

/** オブジェクトクラス */
export type ObjectClass = "Safe" | "Euclid" | "Keter" | "Thaumiel" | "Neutralized";

/** 推薦記事 */
export interface Article {
  /** 記事ID */
  id: string;
  /** 記事タイトル */
  title: string;
  /** コサイン類似度スコア */
  similarityScore: number;
  /** 推薦ソース */
  source: "preference" | "serendipity";
  /** 日本語版URL */
  url: string;
}

/** useInfiniteArticles フックの戻り値 */
export interface UseInfiniteArticlesResult {
  /** 記事リスト */
  articles: Article[];
  /** 現在の記事インデックス */
  currentIndex: number;
  /** ローディング中 */
  isLoading: boolean;
  /** エラー */
  error: Error | null;
  /** 推薦が空 */
  isEmpty: boolean;
  /** 追加読み込み */
  loadMore: () => Promise<void>;
  /** 次の記事へ */
  goToNext: () => void;
  /** 再取得 */
  refetch: () => Promise<void>;
}

/** useFeedback フックの戻り値 */
export interface UseFeedbackResult {
  /** Like記録 */
  recordLike: (articleId: string) => Promise<void>;
  /** Dislike記録 */
  recordDislike: (articleId: string) => Promise<void>;
}

/** useArticleFavorite フックの戻り値 */
export interface UseArticleFavoriteResult {
  /** お気に入り済み */
  isFavorited: boolean;
  /** お気に入りトグル */
  toggleFavorite: () => Promise<void>;
}
