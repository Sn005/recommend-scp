/**
 * @file OnboardingService テスト
 * @see specs/004-recommend/004-03-onboarding/004-03-02.md
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import { OnboardingService } from "./onboarding-service";
import type { PreferenceStorage, PreferenceProfile } from "../storage/types";

/**
 * Embedding取得用のリポジトリインターフェース
 */
interface EmbeddingRepository {
  getArticleEmbedding(articleId: string): Promise<number[] | null>;
  getArticleTags(articleId: string): Promise<string[] | null>;
}

/**
 * モックストレージ生成
 */
function createMockStorage(): PreferenceStorage {
  return {
    getProfile: vi.fn().mockResolvedValue(null),
    saveProfile: vi.fn().mockResolvedValue(undefined),
    getViewHistory: vi.fn().mockResolvedValue([]),
    addViewHistory: vi.fn().mockResolvedValue(undefined),
    getFeedback: vi.fn().mockResolvedValue([]),
    getFeedbackByArticle: vi.fn().mockResolvedValue(null),
    addFeedback: vi.fn().mockResolvedValue(undefined),
    getRecommendationLog: vi.fn().mockResolvedValue([]),
    addRecommendationLog: vi.fn().mockResolvedValue(undefined),
    getDislikedArticleIds: vi.fn().mockResolvedValue([]),
    getArticleTags: vi.fn().mockResolvedValue(null),
    getFavorites: vi.fn().mockResolvedValue([]),
    addFavorite: vi.fn().mockResolvedValue(undefined),
    removeFavorite: vi.fn().mockResolvedValue(undefined),
  };
}

/**
 * モックEmbeddingリポジトリ生成
 */
function createMockEmbeddingRepository(): EmbeddingRepository {
  return {
    getArticleEmbedding: vi.fn().mockResolvedValue(null),
    getArticleTags: vi.fn().mockResolvedValue(null),
  };
}

describe("OnboardingService", () => {
  let storage: PreferenceStorage;
  let embeddingRepo: EmbeddingRepository;
  let service: OnboardingService;

  beforeEach(() => {
    storage = createMockStorage();
    embeddingRepo = createMockEmbeddingRepository();
    service = new OnboardingService(storage, embeddingRepo);
  });

  describe("completeWithStarterPack", () => {
    it("スターターパック選択でプロファイルが生成される", async () => {
      // Arrange
      const visitorId = "visitor-123";
      vi.mocked(embeddingRepo.getArticleEmbedding)
        .mockResolvedValueOnce([0.1, 0.2, 0.3]) // scp-087
        .mockResolvedValueOnce([0.4, 0.5, 0.6]) // scp-106
        .mockResolvedValueOnce([0.7, 0.8, 0.9]); // scp-096

      // Act
      const profile = await service.completeWithStarterPack(visitorId, "horror");

      // Assert
      expect(profile.visitorId).toBe(visitorId);
      expect(profile.starterPack).toBe("horror");
    });

    it("primaryTagsがtagWeightsに反映される", async () => {
      // Arrange
      const visitorId = "visitor-123";
      vi.mocked(embeddingRepo.getArticleEmbedding)
        .mockResolvedValueOnce([0.1, 0.2, 0.3])
        .mockResolvedValueOnce([0.4, 0.5, 0.6])
        .mockResolvedValueOnce([0.7, 0.8, 0.9]);

      // Act
      const profile = await service.completeWithStarterPack(visitorId, "horror");

      // Assert - horrorパックのprimaryTags: ["horror", "creepy", "keter", "euclid"]
      expect(profile.tagWeights).toEqual({
        horror: 1.0,
        creepy: 1.0,
        keter: 1.0,
        euclid: 1.0,
      });
    });

    it("seedArticlesからpreferenceEmbeddingが計算される", async () => {
      // Arrange
      const visitorId = "visitor-123";
      vi.mocked(embeddingRepo.getArticleEmbedding)
        .mockResolvedValueOnce([0.1, 0.2, 0.3]) // scp-087
        .mockResolvedValueOnce([0.4, 0.5, 0.6]) // scp-106
        .mockResolvedValueOnce([0.7, 0.8, 0.9]); // scp-096

      // Act
      const profile = await service.completeWithStarterPack(visitorId, "horror");

      // Assert - 平均: [(0.1+0.4+0.7)/3, (0.2+0.5+0.8)/3, (0.3+0.6+0.9)/3]
      expect(profile.preferenceEmbedding).toBeDefined();
      expect(profile.preferenceEmbedding).toHaveLength(3);
      expect(profile.preferenceEmbedding![0]).toBeCloseTo(0.4, 5);
      expect(profile.preferenceEmbedding![1]).toBeCloseTo(0.5, 5);
      expect(profile.preferenceEmbedding![2]).toBeCloseTo(0.6, 5);
    });

    it("onboardingCompletedAtが設定される", async () => {
      // Arrange
      const visitorId = "visitor-123";
      const beforeTest = new Date();
      vi.mocked(embeddingRepo.getArticleEmbedding)
        .mockResolvedValueOnce([0.1, 0.2, 0.3])
        .mockResolvedValueOnce([0.4, 0.5, 0.6])
        .mockResolvedValueOnce([0.7, 0.8, 0.9]);

      // Act
      const profile = await service.completeWithStarterPack(visitorId, "horror");

      // Assert
      expect(profile.onboardingCompletedAt).toBeDefined();
      const completedAt = new Date(profile.onboardingCompletedAt!);
      expect(completedAt.getTime()).toBeGreaterThanOrEqual(beforeTest.getTime());
    });

    it("プロファイルがストレージに保存される", async () => {
      // Arrange
      const visitorId = "visitor-123";
      vi.mocked(embeddingRepo.getArticleEmbedding)
        .mockResolvedValueOnce([0.1, 0.2, 0.3])
        .mockResolvedValueOnce([0.4, 0.5, 0.6])
        .mockResolvedValueOnce([0.7, 0.8, 0.9]);

      // Act
      await service.completeWithStarterPack(visitorId, "horror");

      // Assert
      expect(storage.saveProfile).toHaveBeenCalledOnce();
      const savedProfile = vi.mocked(storage.saveProfile).mock.calls[0][0] as PreferenceProfile;
      expect(savedProfile.visitorId).toBe(visitorId);
      expect(savedProfile.starterPack).toBe("horror");
    });

    it("Embeddingが取得できない記事は無視してEmbedding平均を計算する", async () => {
      // Arrange
      const visitorId = "visitor-123";
      vi.mocked(embeddingRepo.getArticleEmbedding)
        .mockResolvedValueOnce([0.3, 0.6, 0.9]) // scp-087
        .mockResolvedValueOnce(null) // scp-106 - 取得失敗
        .mockResolvedValueOnce([0.6, 1.2, 1.8]); // scp-096

      // Act
      const profile = await service.completeWithStarterPack(visitorId, "horror");

      // Assert - 2件の平均: [(0.3+0.6)/2, (0.6+1.2)/2, (0.9+1.8)/2]
      expect(profile.preferenceEmbedding).toBeDefined();
      expect(profile.preferenceEmbedding![0]).toBeCloseTo(0.45, 5);
      expect(profile.preferenceEmbedding![1]).toBeCloseTo(0.9, 5);
      expect(profile.preferenceEmbedding![2]).toBeCloseTo(1.35, 5);
    });
  });

  describe("completeWithCustomSelection", () => {
    it("カスタム選択（3件以上）でプロファイルが生成される", async () => {
      // Arrange
      const visitorId = "visitor-123";
      const articleIds = ["article-1", "article-2", "article-3"];
      vi.mocked(embeddingRepo.getArticleEmbedding)
        .mockResolvedValueOnce([0.1, 0.2])
        .mockResolvedValueOnce([0.3, 0.4])
        .mockResolvedValueOnce([0.5, 0.6]);
      vi.mocked(embeddingRepo.getArticleTags)
        .mockResolvedValueOnce(["horror", "mystery"])
        .mockResolvedValueOnce(["horror", "scientific"])
        .mockResolvedValueOnce(["mystery"]);

      // Act
      const profile = await service.completeWithCustomSelection(visitorId, articleIds);

      // Assert
      expect(profile.visitorId).toBe(visitorId);
      expect(profile.starterPack).toBe("custom");
    });

    it("カスタム選択（3件未満）でエラーがスローされる", async () => {
      // Arrange
      const visitorId = "visitor-123";
      const articleIds = ["article-1", "article-2"]; // 2件のみ

      // Act & Assert
      await expect(service.completeWithCustomSelection(visitorId, articleIds)).rejects.toThrow(
        "At least 3 articles must be selected"
      );
    });

    it("選択記事のタグからtagWeightsが計算される", async () => {
      // Arrange
      const visitorId = "visitor-123";
      const articleIds = ["article-1", "article-2", "article-3"];
      vi.mocked(embeddingRepo.getArticleEmbedding)
        .mockResolvedValueOnce([0.1, 0.2])
        .mockResolvedValueOnce([0.3, 0.4])
        .mockResolvedValueOnce([0.5, 0.6]);
      vi.mocked(embeddingRepo.getArticleTags)
        .mockResolvedValueOnce(["horror", "mystery"]) // article-1
        .mockResolvedValueOnce(["horror", "scientific"]) // article-2
        .mockResolvedValueOnce(["mystery"]); // article-3

      // Act
      const profile = await service.completeWithCustomSelection(visitorId, articleIds);

      // Assert - 出現回数で正規化: horror=2, mystery=2, scientific=1
      // 最大2で正規化: horror=1.0, mystery=1.0, scientific=0.5
      expect(profile.tagWeights.horror).toBeCloseTo(1.0, 5);
      expect(profile.tagWeights.mystery).toBeCloseTo(1.0, 5);
      expect(profile.tagWeights.scientific).toBeCloseTo(0.5, 5);
    });

    it("選択記事のEmbedding平均からpreferenceEmbeddingが計算される", async () => {
      // Arrange
      const visitorId = "visitor-123";
      const articleIds = ["article-1", "article-2", "article-3"];
      vi.mocked(embeddingRepo.getArticleEmbedding)
        .mockResolvedValueOnce([0.3, 0.6])
        .mockResolvedValueOnce([0.6, 1.2])
        .mockResolvedValueOnce([0.9, 1.8]);
      vi.mocked(embeddingRepo.getArticleTags)
        .mockResolvedValueOnce(["tag1"])
        .mockResolvedValueOnce(["tag2"])
        .mockResolvedValueOnce(["tag3"]);

      // Act
      const profile = await service.completeWithCustomSelection(visitorId, articleIds);

      // Assert - 平均: [(0.3+0.6+0.9)/3, (0.6+1.2+1.8)/3]
      expect(profile.preferenceEmbedding).toBeDefined();
      expect(profile.preferenceEmbedding![0]).toBeCloseTo(0.6, 5);
      expect(profile.preferenceEmbedding![1]).toBeCloseTo(1.2, 5);
    });

    it("onboardingCompletedAtが設定される", async () => {
      // Arrange
      const visitorId = "visitor-123";
      const articleIds = ["article-1", "article-2", "article-3"];
      const beforeTest = new Date();
      vi.mocked(embeddingRepo.getArticleEmbedding)
        .mockResolvedValueOnce([0.1, 0.2])
        .mockResolvedValueOnce([0.3, 0.4])
        .mockResolvedValueOnce([0.5, 0.6]);
      vi.mocked(embeddingRepo.getArticleTags)
        .mockResolvedValueOnce(["tag1"])
        .mockResolvedValueOnce(["tag2"])
        .mockResolvedValueOnce(["tag3"]);

      // Act
      const profile = await service.completeWithCustomSelection(visitorId, articleIds);

      // Assert
      expect(profile.onboardingCompletedAt).toBeDefined();
      const completedAt = new Date(profile.onboardingCompletedAt!);
      expect(completedAt.getTime()).toBeGreaterThanOrEqual(beforeTest.getTime());
    });

    it("プロファイルがストレージに保存される", async () => {
      // Arrange
      const visitorId = "visitor-123";
      const articleIds = ["article-1", "article-2", "article-3"];
      vi.mocked(embeddingRepo.getArticleEmbedding)
        .mockResolvedValueOnce([0.1, 0.2])
        .mockResolvedValueOnce([0.3, 0.4])
        .mockResolvedValueOnce([0.5, 0.6]);
      vi.mocked(embeddingRepo.getArticleTags)
        .mockResolvedValueOnce(["tag1"])
        .mockResolvedValueOnce(["tag2"])
        .mockResolvedValueOnce(["tag3"]);

      // Act
      await service.completeWithCustomSelection(visitorId, articleIds);

      // Assert
      expect(storage.saveProfile).toHaveBeenCalledOnce();
      const savedProfile = vi.mocked(storage.saveProfile).mock.calls[0][0] as PreferenceProfile;
      expect(savedProfile.visitorId).toBe(visitorId);
      expect(savedProfile.starterPack).toBe("custom");
    });
  });
});
