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
   * スターターパック選択でオンボーディングを完了（単一パック）
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
    return this.completeWithStarterPacks(visitorId, [packType]);
  }

  /**
   * 複数スターターパック選択でオンボーディングを完了
   *
   * 選択された全パックのタグを統合し、seedArticlesのEmbedding平均を計算。
   *
   * @param visitorId 訪問者ID
   * @param packTypes スターターパック種別の配列（customを除く）
   * @returns 構築された嗜好プロファイル
   * @throws パックが見つからない場合
   */
  async completeWithStarterPacks(
    visitorId: string,
    packTypes: Exclude<StarterPackType, "custom">[]
  ): Promise<PreferenceProfile> {
    if (packTypes.length === 0) {
      throw new Error("At least one pack type must be selected");
    }

    // 全パックを取得
    const packs = packTypes.map((packType) => {
      const pack = getStarterPack(packType);
      if (!pack) {
        throw new Error(`Starter pack not found: ${packType}`);
      }
      return pack;
    });

    // 全パックのprimaryTagsを統合（重複は1.0）
    const tagWeights: Record<string, number> = {};
    for (const pack of packs) {
      for (const tag of pack.primaryTags) {
        tagWeights[tag] = 1.0;
      }
    }

    // 全パックのseedArticlesを統合してEmbedding平均を計算
    const allSeedArticles = packs.flatMap((pack) => pack.seedArticles);
    const preferenceEmbedding = await this.calculateAverageEmbedding(allSeedArticles);

    const now = new Date().toISOString();

    // 複数パック選択の場合、最初のパックをstarterPackとして保存
    const profile: PreferenceProfile = {
      visitorId,
      tagWeights,
      objectClassPreference: {},
      starterPack: packs.length === 1 ? packs[0].type : "custom",
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
   * 各次元について、nullでない値のみを使って平均を計算する。
   * nullが含まれている次元は、有効な値の平均を使用する。
   * 全てnullの次元は0として扱う。
   *
   * @param articleIds 記事IDの配列
   * @returns 平均Embeddingベクトル。有効な記事がない場合はundefined
   */
  private async calculateAverageEmbedding(articleIds: string[]): Promise<number[] | undefined> {
    const embeddings: (number | null)[][] = [];

    for (const articleId of articleIds) {
      const embedding = await this.embeddingRepo.getArticleEmbedding(articleId);
      if (embedding && embedding.length > 0) {
        embeddings.push(embedding as (number | null)[]);
      }
    }

    if (embeddings.length === 0) {
      return undefined;
    }

    const dimension = embeddings[0].length;
    const average = new Array<number>(dimension).fill(0);

    for (let i = 0; i < dimension; i++) {
      // 各次元でnullでない値のみを収集
      const validValues: number[] = [];
      for (const embedding of embeddings) {
        const value = embedding[i];
        if (value !== null && value !== undefined && !Number.isNaN(value)) {
          validValues.push(value);
        }
      }

      // 有効な値がある場合は平均を計算、なければ0
      if (validValues.length > 0) {
        average[i] = validValues.reduce((sum, v) => sum + v, 0) / validValues.length;
      } else {
        average[i] = 0;
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
