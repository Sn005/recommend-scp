/**
 * @file OnboardingApiService
 * @description オンボーディングAPIのサービス層
 * @see specs/005-backend-api/005-07-onboarding-api/005-07-01.md
 */

import type { SupabaseClient } from "@supabase/supabase-js";
import {
  OnboardingService,
  getStarterPackList,
  type StarterPackDefinition,
} from "@recommend-scp/shared/onboarding";
import type { StarterPackType } from "@recommend-scp/shared/storage";
import { VisitorsRepository } from "../visitors/repository";
import { SupabasePreferenceStorage } from "../../lib/storage/supabase-preference-storage";
import { SupabaseVectorSearch } from "../../lib/storage/supabase-vector-search";
import { EmbeddingRepositoryAdapter } from "../../lib/storage/embedding-repository-adapter";
import { NotFoundError, ValidationError } from "../../lib/errors";

/** 最小記事選択数 */
const MIN_ARTICLE_SELECTION = 3;

/**
 * スターターパック情報
 *
 * API レスポンス用の簡略化された形式。
 * seedArticles は除外。
 */
export interface StarterPackInfo {
  type: StarterPackType;
  displayName: string;
  description: string;
  primaryTags: string[];
}

/**
 * OnboardingApiService
 *
 * オンボーディング機能のAPIサービス層。
 * 共有パッケージのOnboardingServiceをラップし、
 * visitorの存在確認やバリデーションを行う。
 */
export class OnboardingApiService {
  constructor(
    private readonly visitorsRepo: VisitorsRepository,
    private readonly onboardingService: OnboardingService,
    private readonly preferenceStorage: SupabasePreferenceStorage
  ) {}

  /**
   * スターターパック一覧を取得
   *
   * 5種類のスターターパック情報を返す。
   * custom パックは含まない。
   *
   * @returns スターターパック情報の配列
   */
  getStarterPacks = (): StarterPackInfo[] => {
    const packs = getStarterPackList();
    return packs.map(this.toStarterPackInfo);
  };

  /**
   * 複数スターターパックを選択してオンボーディングを完了
   *
   * 選択された全パックのタグを統合してプロファイルを構築。
   *
   * @param visitorId - 訪問者ID
   * @param packTypes - 選択するパック種別の配列（custom以外）
   * @throws NotFoundError - visitorIdが未登録の場合
   */
  selectPacks = async (
    visitorId: string,
    packTypes: Exclude<StarterPackType, "custom">[]
  ): Promise<void> => {
    // visitorの存在確認
    const visitor = await this.visitorsRepo.findByVisitorId(visitorId);
    if (!visitor) {
      throw new NotFoundError("Visitor", visitorId);
    }

    // 再オンボーディングの場合は閲覧履歴・推薦ログ・フィードバックをクリア
    await this.clearHistoryIfReOnboarding(visitorId);

    // OnboardingServiceでプロファイル初期化（複数パック対応）
    await this.onboardingService.completeWithStarterPacks(visitorId, packTypes);
  };

  /**
   * カスタム記事選択でオンボーディングを完了
   *
   * @param visitorId - 訪問者ID
   * @param articleIds - 選択した記事IDの配列（3件以上必須）
   * @throws ValidationError - articleIdsが3件未満の場合
   * @throws NotFoundError - visitorIdが未登録の場合
   */
  selectCustom = async (visitorId: string, articleIds: string[]): Promise<void> => {
    // バリデーション（visitor確認より先）
    if (articleIds.length < MIN_ARTICLE_SELECTION) {
      throw new ValidationError(
        `At least ${String(MIN_ARTICLE_SELECTION)} articles must be selected`
      );
    }

    // visitorの存在確認
    const visitor = await this.visitorsRepo.findByVisitorId(visitorId);
    if (!visitor) {
      throw new NotFoundError("Visitor", visitorId);
    }

    // 再オンボーディングの場合は閲覧履歴・推薦ログ・フィードバックをクリア
    await this.clearHistoryIfReOnboarding(visitorId);

    // OnboardingServiceでプロファイル初期化
    await this.onboardingService.completeWithCustomSelection(visitorId, articleIds);
  };

  // ============================================
  // Private: 再オンボーディング時のクリーンアップ
  // ============================================

  /**
   * 再オンボーディング時に閲覧履歴・推薦ログ・フィードバックをクリア
   *
   * 既にオンボーディング完了済みの場合のみ実行。
   * 好み再設定後に新しい推薦を受け取れるようにするため。
   */
  private clearHistoryIfReOnboarding = async (visitorId: string): Promise<void> => {
    const profile = await this.preferenceStorage.getProfile(visitorId);
    if (!profile?.onboardingCompletedAt) return;

    await Promise.all([
      this.preferenceStorage.clearViewHistory(visitorId),
      this.preferenceStorage.clearRecommendationLog(visitorId),
      this.preferenceStorage.clearFeedback(visitorId),
    ]);
  };

  // ============================================
  // Private: 変換メソッド
  // ============================================

  /**
   * StarterPackDefinition → StarterPackInfo 変換
   */
  private toStarterPackInfo = (pack: StarterPackDefinition): StarterPackInfo => ({
    type: pack.type,
    displayName: pack.displayName,
    description: pack.description,
    primaryTags: pack.primaryTags,
  });
}

/**
 * OnboardingApiService ファクトリ
 *
 * SupabaseClientから必要な依存を構築してサービスを生成。
 * ルーター層から使用する。
 *
 * @param supabase - SupabaseClient
 * @returns OnboardingApiService インスタンス
 */
export const createOnboardingApiService = (supabase: SupabaseClient): OnboardingApiService => {
  const visitorsRepo = new VisitorsRepository(supabase);
  const preferenceStorage = new SupabasePreferenceStorage(supabase);
  const vectorSearch = new SupabaseVectorSearch(supabase);
  const embeddingRepo = new EmbeddingRepositoryAdapter(vectorSearch, preferenceStorage);
  const onboardingService = new OnboardingService(preferenceStorage, embeddingRepo);

  return new OnboardingApiService(visitorsRepo, onboardingService, preferenceStorage);
};
