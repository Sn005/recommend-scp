/**
 * @file EmbeddingRepositoryAdapter
 * @description OnboardingServiceのEmbeddingRepository実装
 * @see specs/005-backend-api/005-07-onboarding-api/005-07-01.md
 */

import type { EmbeddingRepository } from "@recommend-scp/shared/onboarding";
import type { SupabaseVectorSearch } from "./supabase-vector-search";
import type { SupabasePreferenceStorage } from "./supabase-preference-storage";

/**
 * EmbeddingRepositoryAdapter
 *
 * SupabaseVectorSearchとSupabasePreferenceStorageを組み合わせて、
 * OnboardingServiceが必要とするEmbeddingRepositoryインターフェースを実装。
 */
export class EmbeddingRepositoryAdapter implements EmbeddingRepository {
  constructor(
    private readonly vectorSearch: SupabaseVectorSearch,
    private readonly preferenceStorage: SupabasePreferenceStorage
  ) {}

  /**
   * 記事のEmbeddingを取得
   *
   * @param articleId 記事ID
   * @returns Embeddingベクトル。存在しない場合はnull
   */
  getArticleEmbedding = async (articleId: string): Promise<number[] | null> => {
    return this.vectorSearch.getEmbedding(articleId);
  };

  /**
   * 記事のタグを取得
   *
   * @param articleId 記事ID
   * @returns タグの配列。存在しない場合はnull
   */
  getArticleTags = async (articleId: string): Promise<string[] | null> => {
    return this.preferenceStorage.getArticleTags(articleId);
  };
}
