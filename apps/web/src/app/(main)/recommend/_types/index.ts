/**
 * @file 記事閲覧ページの型定義
 * @description /recommend ページで使用する型
 * @see specs/006-frontend/006-02-article-reader/006-02-01.md
 */

/** オブジェクトクラス */
export type ObjectClass =
  | "Safe"
  | "Euclid"
  | "Keter"
  | "Thaumiel"
  | "Neutralized"
  | "Apollyon"
  | "Archon";

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
  /** オブジェクトクラス */
  objectClass: string | null;
  /** 評価スコア */
  rating: number | null;
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
  /** 初回取得件数（デフォルト: 10） */
  initialCount?: number;
  /** 追加取得件数（デフォルト: 5） */
  loadMoreCount?: number;
  /** バッファ先行取得閾値（デフォルト: 3） */
  prefetchThreshold?: number;
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
  /** 追加読み込み */
  loadMore: () => Promise<void>;
  /** 次の記事へ */
  goToNext: () => void;
  /** リセット */
  reset: () => void;
  /** 再取得 */
  refetch: () => Promise<void>;
}

/** フィードバック種別 */
export type FeedbackType = "like" | "skip" | "favorite";

/** スキップメタデータ */
export interface SkipMetadata {
  /** スクロール深度（0-100） */
  scrollDepth: number;
  /** 滞在時間（秒） */
  dwellTime: number;
  /** 興味度 */
  interestLevel: "skip" | "neutral" | "like";
}

/** useFeedback フックの戻り値 */
export interface UseFeedbackResult {
  /** Like記録（暗黙的Like） */
  recordLike: (articleId: string) => Promise<void>;
  /** Skip記録（暗黙的フィードバック + メタデータ） */
  recordSkip: (articleId: string, metadata: SkipMetadata) => Promise<void>;
  /** Favorite記録（明示的お気に入り） */
  recordFavorite: (articleId: string) => Promise<void>;
  /** 記事のフィードバック済み状態を確認 */
  hasRecorded: (articleId: string) => boolean;
  /** フィードバック種別を取得 */
  getFeedbackType: (articleId: string) => FeedbackType | null;
  /** 保留中のフィードバック数 */
  pendingCount: number;
}

/** useArticleFavorite フックのオプション */
export interface UseArticleFavoriteOptions {
  /** 記事ID */
  articleId: string | undefined;
  /** 初期お気に入り状態 */
  initialFavorited?: boolean;
}

/** useArticleFavorite フックの戻り値 */
export interface UseArticleFavoriteResult {
  /** お気に入り状態 */
  isFavorited: boolean;
  /** 処理中フラグ */
  isProcessing: boolean;
  /** お気に入りをトグル */
  toggleFavorite: () => Promise<void>;
  /** お気に入りを追加 */
  addFavorite: () => Promise<void>;
  /** お気に入りを解除 */
  removeFavorite: () => Promise<void>;
}
