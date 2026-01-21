/**
 * @file オンボーディングサービス
 * @description スターターパック選択または記事選択から初期嗜好プロファイルを構築
 * @see specs/004-recommend/004-03-onboarding/004-03-02.md
 */

import type { PreferenceStorage, PreferenceProfile, StarterPackType } from "../storage/types";
import { getStarterPack } from "./starter-packs";

/**
 * Embedding取得用のリポジトリインターフェース
 *
 * テスト時にモック可能にするための抽象化。
 */
export interface EmbeddingRepository {
  /**
   * 記事のEmbeddingを取得
   * @param articleId 記事ID
   * @returns Embeddingベクトル。存在しない場合はnull
   */
  getArticleEmbedding(articleId: string): Promise<number[] | null>;

  /**
   * 記事のタグを取得
   * @param articleId 記事ID
   * @returns タグの配列。存在しない場合はnull
   */
  getArticleTags(articleId: string): Promise<string[] | null>;
}

/**
 * オンボーディングサービス
 *
 * 新規ユーザーの初期嗜好プロファイルを構築する。
 * スターターパック選択またはカスタム記事選択からプロファイルを生成。
 */
export class OnboardingService {
  constructor(
    private storage: PreferenceStorage,
    private embeddingRepo: EmbeddingRepository
  ) {}

  /**
   * スターターパック選択でオンボーディングを完了
   *
   * @param visitorId 訪問者ID
   * @param packType スターターパック種別（customを除く）
   * @returns 構築された嗜好プロファイル
   * @throws パックが見つからない場合
   */
  async completeWithStarterPack(
    visitorId: string,
    packType: Exclude<StarterPackType, "custom">
  ): Promise<PreferenceProfile> {
    const pack = getStarterPack(packType);
    if (!pack) {
      throw new Error(`Starter pack not found: ${packType}`);
    }

    // primaryTagsからtagWeightsを生成（全て1.0）
    const tagWeights: Record<string, number> = {};
    for (const tag of pack.primaryTags) {
      tagWeights[tag] = 1.0;
    }

    // seedArticlesのEmbedding平均を計算
    const preferenceEmbedding = await this.calculateAverageEmbedding(pack.seedArticles);

    const now = new Date().toISOString();

    const profile: PreferenceProfile = {
      visitorId,
      tagWeights,
      objectClassPreference: {},
      starterPack: packType,
      onboardingCompletedAt: now,
      preferenceEmbedding,
      createdAt: now,
      updatedAt: now,
    };

    await this.storage.saveProfile(profile);
    return profile;
  }

  /**
   * カスタム記事選択でオンボーディングを完了
   *
   * @param visitorId 訪問者ID
   * @param selectedArticleIds 選択された記事IDの配列（3件以上必須）
   * @returns 構築された嗜好プロファイル
   * @throws 選択記事が3件未満の場合
   */
  async completeWithCustomSelection(
    visitorId: string,
    selectedArticleIds: string[]
  ): Promise<PreferenceProfile> {
    if (selectedArticleIds.length < 3) {
      throw new Error("At least 3 articles must be selected");
    }

    // 選択記事のタグからtagWeightsを計算
    const tagWeights = await this.calculateTagWeightsFromArticles(selectedArticleIds);

    // 選択記事のEmbedding平均を計算
    const preferenceEmbedding = await this.calculateAverageEmbedding(selectedArticleIds);

    const now = new Date().toISOString();

    const profile: PreferenceProfile = {
      visitorId,
      tagWeights,
      objectClassPreference: {},
      starterPack: "custom",
      onboardingCompletedAt: now,
      preferenceEmbedding,
      createdAt: now,
      updatedAt: now,
    };

    await this.storage.saveProfile(profile);
    return profile;
  }

  /**
   * 記事群のEmbedding平均を計算
   *
   * @param articleIds 記事IDの配列
   * @returns 平均Embeddingベクトル。有効な記事がない場合はundefined
   */
  private async calculateAverageEmbedding(articleIds: string[]): Promise<number[] | undefined> {
    const embeddings: number[][] = [];

    for (const articleId of articleIds) {
      const embedding = await this.embeddingRepo.getArticleEmbedding(articleId);
      if (embedding) {
        embeddings.push(embedding);
      }
    }

    if (embeddings.length === 0) {
      return undefined;
    }

    const dimension = embeddings[0].length;
    const average = new Array<number>(dimension).fill(0);

    for (const embedding of embeddings) {
      for (let i = 0; i < dimension; i++) {
        average[i] += embedding[i] / embeddings.length;
      }
    }

    return average;
  }

  /**
   * 記事群のタグからタグ重みを計算
   *
   * 出現回数に基づいて正規化。最大出現回数を1.0とする。
   *
   * @param articleIds 記事IDの配列
   * @returns タグ → 重み値のマップ
   */
  private async calculateTagWeightsFromArticles(
    articleIds: string[]
  ): Promise<Record<string, number>> {
    const tagCounts: Record<string, number> = {};

    for (const articleId of articleIds) {
      const tags = await this.embeddingRepo.getArticleTags(articleId);
      if (!tags) continue;

      for (const tag of tags) {
        tagCounts[tag] = (tagCounts[tag] ?? 0) + 1;
      }
    }

    // 最大値で正規化
    const counts = Object.values(tagCounts);
    if (counts.length === 0) {
      return {};
    }

    const maxCount = Math.max(...counts);
    if (maxCount === 0) {
      return {};
    }

    const normalized: Record<string, number> = {};
    for (const [tag, count] of Object.entries(tagCounts)) {
      normalized[tag] = count / maxCount;
    }

    return normalized;
  }
}
