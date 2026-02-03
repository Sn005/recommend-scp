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

/** POST /recommend APIレスポンス */
export interface RecommendResponse {
  /** 推薦記事リスト */
  recommendations: Article[];
  /** 取得件数 */
  count: number;
  /** これ以上記事があるか */
  hasMore?: boolean;
}

/** useInfiniteArticles フックのオプション */
export interface UseInfiniteArticlesOptions {
  /** 初回取得件数（デフォルト: 3） */
  initialCount?: number;
  /** 追加取得件数（デフォルト: 1） */
  loadMoreCount?: number;
  /** 自動読み込み上限（デフォルト: 10） */
  autoLoadLimit?: number;
}

/** useInfiniteArticles フックの戻り値 */
export interface UseInfiniteArticlesResult {
  /** 記事リスト */
  articles: Article[];
  /** 現在の記事インデックス */
  currentIndex: number;
  /** 初回読み込み中 */
  isLoading: boolean;
  /** 追加読み込み中 */
  isLoadingMore: boolean;
  /** エラー */
  error: Error | null;
  /** 推薦が空 */
  isEmpty: boolean;
  /** これ以上記事があるか */
  hasMore: boolean;
  /** 自動読み込みが一時停止中か */
  isPaused: boolean;
  /** 追加読み込み */
  loadMore: () => Promise<void>;
  /** 次の記事へ */
  goToNext: () => void;
  /** 自動読み込みを再開 */
  resumeAutoLoad: () => void;
  /** リセット */
  reset: () => void;
  /** 再取得 */
  refetch: () => Promise<void>;
}

/** フィードバック種別 */
export type FeedbackType = "like" | "dislike" | "favorite";

/** useFeedback フックの戻り値 */
export interface UseFeedbackResult {
  /** Like記録（暗黙的Like） */
  recordLike: (articleId: string) => Promise<void>;
  /** Dislike記録（スキップ） */
  recordDislike: (articleId: string) => Promise<void>;
  /** Favorite記録（明示的お気に入り） */
  recordFavorite: (articleId: string) => Promise<void>;
  /** 記事のフィードバック済み状態を確認 */
  hasRecorded: (articleId: string) => boolean;
  /** フィードバック種別を取得 */
  getFeedbackType: (articleId: string) => FeedbackType | null;
  /** 保留中のフィードバック数 */
  pendingCount: number;
}

/** useArticleFavorite フックの戻り値 */
export interface UseArticleFavoriteResult {
  /** お気に入り済み */
  isFavorited: boolean;
  /** お気に入りトグル */
  toggleFavorite: () => Promise<void>;
}
