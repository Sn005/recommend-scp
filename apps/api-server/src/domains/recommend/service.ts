/**
 * @file RecommendService
 * @description RecommendationEngineと連携するサービス層
 * @see specs/005-backend-api/005-05-recommend-api/005-05-01.md
 */

import type { SupabaseClient } from "@supabase/supabase-js";
import {
  RecommendationEngine,
  type RecommendedArticle,
} from "@recommend-scp/shared/recommendation";
import type { PreferenceStorage } from "@recommend-scp/shared/storage/server";
import { SupabasePreferenceStorage } from "../../lib/storage/supabase-preference-storage";
import { SupabaseVectorSearch } from "../../lib/storage/supabase-vector-search";
import { VisitorsRepository } from "../visitors/repository";
import { NotFoundError, OnboardingRequiredError } from "../../lib/errors";

/**
 * RecommendService
 *
 * 推薦APIのビジネスロジックを担当するサービス層。
 * VisitorsRepository と RecommendationEngine を組み合わせて、
 * visitorIdの存在確認・オンボーディング状態確認・推薦取得を行う。
 */
export class RecommendService {
  /**
   * コンストラクタ（DI用）
   *
   * テスト時はモックを注入可能。
   * 本番用途は静的ファクトリーメソッド `create()` を使用。
   */
  constructor(
    private readonly visitorsRepo: VisitorsRepository,
    private readonly storage: PreferenceStorage,
    private readonly engine: RecommendationEngine
  ) {}

  /**
   * 本番用インスタンスを作成
   *
   * SupabaseClientを受け取り、必要な依存関係を初期化する。
   *
   * @param supabase - SupabaseClient
   * @returns RecommendService インスタンス
   */
  static create(supabase: SupabaseClient): RecommendService {
    const storage = new SupabasePreferenceStorage(supabase);
    const vectorSearch = new SupabaseVectorSearch(supabase);
    const engine = new RecommendationEngine(storage, vectorSearch);
    const visitorsRepo = new VisitorsRepository(supabase);

    return new RecommendService(visitorsRepo, storage, engine);
  }

  /**
   * 推薦記事を取得
   *
   * 1. visitorIdの存在確認
   * 2. オンボーディング完了確認
   * 3. RecommendationEngineで推薦取得
   *
   * @param visitorId - 訪問者ID
   * @param limit - 取得件数上限（デフォルト: 10）
   * @returns 推薦記事リスト
   * @throws NotFoundError - visitorIdが未登録の場合
   * @throws OnboardingRequiredError - オンボーディング未完了の場合
   */
  getRecommendations = async (
    visitorId: string,
    limit = 10,
    excludeIds: string[] = []
  ): Promise<RecommendedArticle[]> => {
    // visitorIdの存在確認
    const visitor = await this.visitorsRepo.findByVisitorId(visitorId);
    if (!visitor) {
      throw new NotFoundError("Visitor", visitorId);
    }

    // オンボーディング完了確認（profileからチェック）
    const profile = await this.storage.getProfile(visitorId);
    if (!profile?.onboardingCompletedAt) {
      throw new OnboardingRequiredError(visitorId);
    }

    // preferenceEmbeddingの存在確認（seed articlesがDBに存在しない場合はundefined）
    if (!profile.preferenceEmbedding) {
      throw new OnboardingRequiredError(visitorId);
    }

    // RecommendationEngineで推薦取得
    // 取得済み profile を渡して engine 内部での storage.getProfile 重複呼び出しを回避
    try {
      return await this.engine.getRecommendations(visitorId, limit, excludeIds, profile);
    } catch (error) {
      // preferenceEmbedding関連のエラーはOnboardingRequiredErrorに変換
      if (error instanceof Error && error.message.includes("preferenceEmbedding")) {
        throw new OnboardingRequiredError(visitorId);
      }
      throw error;
    }
  };

  /**
   * 推薦ログを記録
   *
   * @param visitorId - 訪問者ID
   * @param articleId - 記事ID
   * @param source - 推薦ソース（preference/serendipity）
   */
  recordRecommendation = async (
    visitorId: string,
    articleId: string,
    source: "preference" | "serendipity"
  ): Promise<void> => {
    await this.engine.recordRecommendation(visitorId, articleId, source);
  };
}
