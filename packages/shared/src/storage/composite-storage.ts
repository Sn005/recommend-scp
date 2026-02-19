/**
 * @file 複合ストレージアダプタ
 * @description IndexedDB（ローカルデータ）とSupabase（タグデータ）を組み合わせる
 * @see specs/004-recommend/004-01-recommend-foundation/004-01-04.md
 */

import type {
  PreferenceStorage,
  PreferenceProfile,
  ViewHistory,
  Feedback,
  RecommendationLog,
  Favorite,
} from "./types";
import type { SupabaseTagStorage } from "./supabase-tag-storage";

/**
 * 複合ストレージアダプタ
 *
 * IndexedDB（ローカルデータ）とSupabase（タグデータ）を組み合わせる。
 * - 嗜好プロファイル、閲覧履歴、フィードバック等 → ローカルストレージ
 * - 記事タグ → Supabase（タグストレージ）
 */
export class CompositeStorage implements PreferenceStorage {
  constructor(
    private localStorage: PreferenceStorage,
    private tagStorage: SupabaseTagStorage
  ) {}

  /**
   * 嗜好プロファイルを取得
   * @param visitorId 訪問者ID
   * @returns 嗜好プロファイル。存在しない場合はnull
   */
  getProfile(visitorId: string): Promise<PreferenceProfile | null> {
    return this.localStorage.getProfile(visitorId);
  }

  /**
   * 嗜好プロファイルを保存
   * @param profile 保存する嗜好プロファイル
   */
  saveProfile(profile: PreferenceProfile): Promise<void> {
    return this.localStorage.saveProfile(profile);
  }

  /**
   * 閲覧履歴を取得
   * @param visitorId 訪問者ID
   * @param limit 取得件数上限（省略時は全件）
   * @returns 閲覧履歴の配列
   */
  getViewHistory(visitorId: string, limit?: number): Promise<ViewHistory[]> {
    return this.localStorage.getViewHistory(visitorId, limit);
  }

  /**
   * 閲覧履歴を追加
   * @param history 追加する閲覧履歴
   */
  addViewHistory(history: ViewHistory): Promise<void> {
    return this.localStorage.addViewHistory(history);
  }

  /**
   * フィードバック一覧を取得
   * @param visitorId 訪問者ID
   * @returns フィードバックの配列
   */
  getFeedback(visitorId: string): Promise<Feedback[]> {
    return this.localStorage.getFeedback(visitorId);
  }

  /**
   * 特定記事へのフィードバックを取得
   * @param visitorId 訪問者ID
   * @param articleId 記事ID
   * @returns フィードバック。存在しない場合はnull
   */
  getFeedbackByArticle(visitorId: string, articleId: string): Promise<Feedback | null> {
    return this.localStorage.getFeedbackByArticle(visitorId, articleId);
  }

  /**
   * フィードバックを追加
   * @param feedback 追加するフィードバック
   */
  addFeedback(feedback: Feedback): Promise<void> {
    return this.localStorage.addFeedback(feedback);
  }

  /**
   * 推薦ログを取得
   * @param visitorId 訪問者ID
   * @param limit 取得件数上限（省略時は全件）
   * @returns 推薦ログの配列
   */
  getRecommendationLog(visitorId: string, limit?: number): Promise<RecommendationLog[]> {
    return this.localStorage.getRecommendationLog(visitorId, limit);
  }

  /**
   * 推薦ログを追加
   * @param log 追加する推薦ログ
   */
  addRecommendationLog(log: RecommendationLog): Promise<void> {
    return this.localStorage.addRecommendationLog(log);
  }

  /**
   * Dislike済み記事IDを取得
   * @param visitorId 訪問者ID
   * @returns Dislike済み記事IDの配列
   */
  getDislikedArticleIds(visitorId: string): Promise<string[]> {
    return this.localStorage.getDislikedArticleIds(visitorId);
  }

  /**
   * 記事のタグ情報を取得
   *
   * Supabaseのタグストレージから取得する。
   *
   * @param articleId 記事ID
   * @returns タグの配列。記事が存在しない場合は空配列
   */
  getArticleTags(articleId: string): Promise<string[] | null> {
    return this.tagStorage.getArticleTags(articleId);
  }

  /**
   * お気に入り一覧を取得
   * @param visitorId 訪問者ID
   * @returns お気に入りの配列（追加日時降順）
   */
  getFavorites(visitorId: string): Promise<Favorite[]> {
    return this.localStorage.getFavorites(visitorId);
  }

  /**
   * お気に入りを追加
   * @param favorite 追加するお気に入り
   */
  addFavorite(favorite: Favorite): Promise<void> {
    return this.localStorage.addFavorite(favorite);
  }

  /**
   * お気に入りを解除
   * @param visitorId 訪問者ID
   * @param articleId 記事ID
   */
  removeFavorite(visitorId: string, articleId: string): Promise<void> {
    return this.localStorage.removeFavorite(visitorId, articleId);
  }

  resetPreference(visitorId: string): Promise<void> {
    return this.localStorage.resetPreference(visitorId);
  }
}
