/**
 * @file SupabasePreferenceStorage
 * @description PreferenceStorageインターフェースのSupabase実装
 * @see specs/005-backend-api/005-02-server-storage/005-02-02.md
 */

import type { SupabaseClient } from "@supabase/supabase-js";
import { logger } from "../logger";
import { parseVectorField } from "./parse-vector";
import type {
  PreferenceStorage,
  PreferenceProfile,
  ViewHistory,
  Feedback,
  RecommendationLog,
  Favorite,
  StarterPackType,
} from "@recommend-scp/shared/storage/server";

/** DB行の型 */
type DbRow = Record<string, unknown>;

/**
 * SupabasePreferenceStorage
 *
 * Supabaseをバックエンドとした嗜好ストレージ実装。
 * snake_case（DB）↔ camelCase（アプリ）の変換を行う。
 */
export class SupabasePreferenceStorage implements PreferenceStorage {
  constructor(private readonly supabase: SupabaseClient) {}

  /**
   * 嗜好プロファイルを取得
   */
  getProfile = async (visitorId: string): Promise<PreferenceProfile | null> => {
    const result = await this.supabase
      .from("visitors")
      .select("*")
      .eq("visitor_id", visitorId)
      .single();

    if (result.error || !result.data) return null;
    return this.toPreferenceProfile(result.data as DbRow);
  };

  /**
   * 嗜好プロファイルを保存（UPSERT）
   */
  saveProfile = async (profile: PreferenceProfile): Promise<void> => {
    const { error } = await this.supabase
      .from("visitors")
      .upsert(this.toVisitorRow(profile), { onConflict: "visitor_id" });

    if (error) throw error;
  };

  /**
   * 閲覧履歴を取得（viewed_at降順）
   */
  getViewHistory = async (visitorId: string, limit?: number): Promise<ViewHistory[]> => {
    let query = this.supabase
      .from("view_history")
      .select("*")
      .eq("visitor_id", visitorId)
      .order("viewed_at", { ascending: false });

    if (limit !== undefined) {
      query = query.limit(limit);
    }

    const result = await query;
    if (result.error) throw result.error;
    const rows = (result.data as DbRow[] | null) ?? [];
    return rows.map(this.toViewHistory);
  };

  /**
   * 閲覧履歴を追加
   */
  addViewHistory = async (history: ViewHistory): Promise<void> => {
    const { error } = await this.supabase.from("view_history").insert({
      visitor_id: history.visitorId,
      article_id: history.articleId,
      viewed_at: history.viewedAt,
      duration: history.duration,
    });
    if (error) throw error;
  };

  /**
   * フィードバック一覧を取得
   */
  getFeedback = async (visitorId: string): Promise<Feedback[]> => {
    const result = await this.supabase.from("feedback").select("*").eq("visitor_id", visitorId);

    if (result.error) throw result.error;
    const rows = (result.data as DbRow[] | null) ?? [];
    return rows.map(this.toFeedback);
  };

  /**
   * 特定記事へのフィードバックを取得
   */
  getFeedbackByArticle = async (visitorId: string, articleId: string): Promise<Feedback | null> => {
    const result = await this.supabase
      .from("feedback")
      .select("*")
      .eq("visitor_id", visitorId)
      .eq("article_id", articleId)
      .single();

    if (result.error || !result.data) return null;
    return this.toFeedback(result.data as DbRow);
  };

  /**
   * フィードバックを追加（UPSERT）
   */
  addFeedback = async (feedback: Feedback): Promise<void> => {
    const { error } = await this.supabase.from("feedback").upsert(
      {
        visitor_id: feedback.visitorId,
        article_id: feedback.articleId,
        type: feedback.type,
        created_at: feedback.createdAt,
      },
      { onConflict: "visitor_id,article_id" }
    );
    if (error) throw error;
  };

  /**
   * 推薦ログを取得（recommended_at降順）
   */
  getRecommendationLog = async (
    visitorId: string,
    limit?: number
  ): Promise<RecommendationLog[]> => {
    let query = this.supabase
      .from("recommendation_log")
      .select("*")
      .eq("visitor_id", visitorId)
      .order("recommended_at", { ascending: false });

    if (limit !== undefined) {
      query = query.limit(limit);
    }

    const result = await query;
    if (result.error) throw result.error;
    const rows = (result.data as DbRow[] | null) ?? [];
    return rows.map(this.toRecommendationLog);
  };

  /**
   * 推薦ログを追加
   */
  addRecommendationLog = async (log: RecommendationLog): Promise<void> => {
    const { error } = await this.supabase.from("recommendation_log").insert({
      visitor_id: log.visitorId,
      article_id: log.articleId,
      source: log.source,
      recommended_at: log.recommendedAt,
      clicked: log.clicked,
    });
    if (error) throw error;
  };

  /**
   * Dislike済み記事IDを取得
   */
  getDislikedArticleIds = async (visitorId: string): Promise<string[]> => {
    const result = await this.supabase
      .from("feedback")
      .select("article_id")
      .eq("visitor_id", visitorId)
      .eq("type", "dislike");

    if (result.error) throw result.error;
    const rows = (result.data as DbRow[] | null) ?? [];
    return rows.map((d) => d.article_id as string);
  };

  /**
   * 記事のタグ情報を取得
   */
  getArticleTags = async (articleId: string): Promise<string[] | null> => {
    const result = await this.supabase
      .from("scp_articles")
      .select("tags")
      .eq("article_id", articleId)
      .single();

    // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition -- Supabase型はnullを返す可能性がある
    if (result.error || !result.data) return null;
    const row = result.data as DbRow;
    const tags = row.tags as string[] | null;
    return tags ?? [];
  };

  /**
   * お気に入り一覧を取得（added_at降順）
   */
  getFavorites = async (visitorId: string): Promise<Favorite[]> => {
    const result = await this.supabase
      .from("favorites")
      .select("*")
      .eq("visitor_id", visitorId)
      .order("added_at", { ascending: false });

    if (result.error) throw result.error;
    const rows = (result.data as DbRow[] | null) ?? [];
    return rows.map(this.toFavorite);
  };

  /**
   * お気に入りを追加（UPSERT）
   */
  addFavorite = async (favorite: Favorite): Promise<void> => {
    const { error } = await this.supabase.from("favorites").upsert(
      {
        visitor_id: favorite.visitorId,
        article_id: favorite.articleId,
        added_at: favorite.addedAt,
      },
      { onConflict: "visitor_id,article_id" }
    );
    if (error) throw error;
  };

  /**
   * お気に入りを解除
   */
  removeFavorite = async (visitorId: string, articleId: string): Promise<void> => {
    const { error } = await this.supabase
      .from("favorites")
      .delete()
      .eq("visitor_id", visitorId)
      .eq("article_id", articleId);
    if (error) throw error;
  };

  /**
   * 閲覧履歴を全件削除（好み再設定時に使用）
   */
  clearViewHistory = async (visitorId: string): Promise<void> => {
    const { error } = await this.supabase.from("view_history").delete().eq("visitor_id", visitorId);
    if (error) throw error;
  };

  /**
   * 推薦ログを全件削除（好み再設定時に使用）
   */
  clearRecommendationLog = async (visitorId: string): Promise<void> => {
    const { error } = await this.supabase
      .from("recommendation_log")
      .delete()
      .eq("visitor_id", visitorId);
    if (error) throw error;
  };

  /**
   * フィードバックを全件削除（好み再設定時に使用）
   */
  clearFeedback = async (visitorId: string): Promise<void> => {
    const { error } = await this.supabase.from("feedback").delete().eq("visitor_id", visitorId);
    if (error) throw error;
  };

  // ============================================
  // Private: DB row → Domain model 変換
  // ============================================

  private toPreferenceProfile = (row: DbRow): PreferenceProfile => {
    const tagWeights = row.tag_weights as Record<string, number> | null;
    const objectClassPreference = row.object_class_preference as Record<string, number> | null;
    const starterPack = row.starter_pack as StarterPackType | null;
    const onboardingCompletedAt = row.onboarding_completed_at as string | null;
    // pgvectorカラムは文字列 "[0.1,0.2,...]" として返される場合がある
    const preferenceEmbedding = parseVectorField(row.preference_vector);

    return {
      visitorId: row.visitor_id as string,
      tagWeights: tagWeights ?? {},
      objectClassPreference: objectClassPreference ?? {},
      starterPack: starterPack ?? undefined,
      onboardingCompletedAt: onboardingCompletedAt ?? undefined,
      preferenceEmbedding: preferenceEmbedding ?? undefined,
      createdAt: row.created_at as string,
      updatedAt: row.updated_at as string,
    };
  };

  private toVisitorRow = (profile: PreferenceProfile): DbRow => ({
    visitor_id: profile.visitorId,
    tag_weights: profile.tagWeights,
    object_class_preference: profile.objectClassPreference,
    starter_pack: profile.starterPack,
    onboarding_completed_at: profile.onboardingCompletedAt,
    preference_vector: this.sanitizeEmbedding(profile.preferenceEmbedding),
    updated_at: new Date().toISOString(),
  });

  /** OpenAI埋め込みの期待される次元数 */
  private static readonly EXPECTED_EMBEDDING_DIMENSION = 1536;
  /** pgvectorの最大次元数 */
  private static readonly MAX_VECTOR_DIMENSION = 16000;

  /**
   * 埋め込みベクトルをサニタイズ
   *
   * PostgreSQLのvector型はnull値を受け付けないため、
   * null/undefined/NaNを0に変換する。
   *
   * NOTE: TypeScriptの型ではnumber[]だが、実行時にはDBからnull値が
   * 含まれた配列が返ってくることがあるため、明示的にチェックが必要
   */
  private sanitizeEmbedding = (embedding: number[] | undefined): number[] | undefined => {
    if (!embedding) return undefined;

    // 次元数の検証
    if (embedding.length > SupabasePreferenceStorage.MAX_VECTOR_DIMENSION) {
      logger.error(
        {
          dimension: embedding.length,
          maxDimension: SupabasePreferenceStorage.MAX_VECTOR_DIMENSION,
        },
        "Vector dimension exceeds maximum. Truncating to expected dimension."
      );
      // 異常な次元数の場合は期待される次元数に切り詰め
      embedding = embedding.slice(0, SupabasePreferenceStorage.EXPECTED_EMBEDDING_DIMENSION);
    }

    // 期待される次元数と異なる場合は警告
    if (
      embedding.length !== SupabasePreferenceStorage.EXPECTED_EMBEDDING_DIMENSION &&
      embedding.length > 0
    ) {
      logger.warn(
        {
          dimension: embedding.length,
          expectedDimension: SupabasePreferenceStorage.EXPECTED_EMBEDDING_DIMENSION,
        },
        "Unexpected embedding dimension"
      );
    }

    return embedding.map((value) => {
      // 型アサーションで実行時のnull/undefinedチェックを許可
      const v = value as number | null | undefined;
      // null, undefined, NaN を 0 に変換
      if (v === null || v === undefined || Number.isNaN(v)) {
        return 0;
      }
      // Infinity を最大/最小値に制限
      if (v === Infinity) return Number.MAX_VALUE;
      if (v === -Infinity) return -Number.MAX_VALUE;
      return v;
    });
  };

  private toViewHistory = (row: DbRow): ViewHistory => ({
    id: row.id as string,
    visitorId: row.visitor_id as string,
    articleId: row.article_id as string,
    viewedAt: row.viewed_at as string,
    duration: row.duration as number | undefined,
  });

  private toFeedback = (row: DbRow): Feedback => ({
    id: row.id as string,
    visitorId: row.visitor_id as string,
    articleId: row.article_id as string,
    type: row.type as "like" | "dislike",
    createdAt: row.created_at as string,
  });

  private toRecommendationLog = (row: DbRow): RecommendationLog => ({
    id: row.id as string,
    visitorId: row.visitor_id as string,
    articleId: row.article_id as string,
    source: row.source as "preference" | "serendipity",
    recommendedAt: row.recommended_at as string,
    clicked: row.clicked as boolean,
  });

  private toFavorite = (row: DbRow): Favorite => ({
    id: row.id as string,
    visitorId: row.visitor_id as string,
    articleId: row.article_id as string,
    addedAt: row.added_at as string,
  });
}
