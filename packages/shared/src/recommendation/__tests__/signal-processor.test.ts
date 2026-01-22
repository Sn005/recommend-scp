/**
 * @file SignalProcessor テスト
 * @description Like/Dislikeフィードバック処理のテスト
 * @see specs/004-recommend/004-04-signal-processing/004-04-01.md
 */

import { describe, it, expect, beforeEach, vi } from "vitest";
import { SignalProcessor } from "../signal-processor";
import { PreferenceProfiler } from "../profiler";
import type {
  PreferenceStorage,
  PreferenceProfile,
  ViewHistory,
  Feedback,
  RecommendationLog,
} from "../../storage/types";

/**
 * テスト用モックストレージ
 */
class MockPreferenceStorage implements PreferenceStorage {
  private profiles: Map<string, PreferenceProfile> = new Map();
  private viewHistories: Map<string, ViewHistory[]> = new Map();
  private feedbacks: Map<string, Feedback[]> = new Map();
  private recommendationLogs: Map<string, RecommendationLog[]> = new Map();
  private articleTags: Map<string, string[]> = new Map();

  async getProfile(visitorId: string): Promise<PreferenceProfile | null> {
    return this.profiles.get(visitorId) ?? null;
  }

  async saveProfile(profile: PreferenceProfile): Promise<void> {
    this.profiles.set(profile.visitorId, profile);
  }

  async getViewHistory(visitorId: string, _limit?: number): Promise<ViewHistory[]> {
    return this.viewHistories.get(visitorId) ?? [];
  }

  async addViewHistory(history: ViewHistory): Promise<void> {
    const existing = this.viewHistories.get(history.visitorId) ?? [];
    existing.push(history);
    this.viewHistories.set(history.visitorId, existing);
  }

  async getFeedback(visitorId: string): Promise<Feedback[]> {
    return this.feedbacks.get(visitorId) ?? [];
  }

  async getFeedbackByArticle(visitorId: string, articleId: string): Promise<Feedback | null> {
    const feedbacks = this.feedbacks.get(visitorId) ?? [];
    return feedbacks.find((f) => f.articleId === articleId) ?? null;
  }

  async addFeedback(feedback: Feedback): Promise<void> {
    const existing = this.feedbacks.get(feedback.visitorId) ?? [];
    // 同じ記事への既存フィードバックがあれば上書き
    const index = existing.findIndex((f) => f.articleId === feedback.articleId);
    if (index >= 0) {
      existing[index] = feedback;
    } else {
      existing.push(feedback);
    }
    this.feedbacks.set(feedback.visitorId, existing);
  }

  async getRecommendationLog(visitorId: string, _limit?: number): Promise<RecommendationLog[]> {
    return this.recommendationLogs.get(visitorId) ?? [];
  }

  async addRecommendationLog(log: RecommendationLog): Promise<void> {
    const existing = this.recommendationLogs.get(log.visitorId) ?? [];
    existing.push(log);
    this.recommendationLogs.set(log.visitorId, existing);
  }

  async getDislikedArticleIds(visitorId: string): Promise<string[]> {
    const feedbacks = this.feedbacks.get(visitorId) ?? [];
    return feedbacks.filter((f) => f.type === "dislike").map((f) => f.articleId);
  }

  async getArticleTags(articleId: string): Promise<string[] | null> {
    return this.articleTags.get(articleId) ?? null;
  }

  // テスト用ヘルパーメソッド
  setArticleTags(articleId: string, tags: string[]): void {
    this.articleTags.set(articleId, tags);
  }

  getFeedbacksDirectly(visitorId: string): Feedback[] {
    return this.feedbacks.get(visitorId) ?? [];
  }
}

describe("SignalProcessor", () => {
  let storage: MockPreferenceStorage;
  let profiler: PreferenceProfiler;
  let processor: SignalProcessor;
  const visitorId = "visitor-123";

  beforeEach(() => {
    storage = new MockPreferenceStorage();
    profiler = new PreferenceProfiler(storage);
    processor = new SignalProcessor(storage, profiler);
  });

  describe("AC1: WHEN ユーザーが記事をLikeした際", () => {
    it("THEN Feedbackレコードがストレージに保存される", async () => {
      // Arrange
      storage.setArticleTags("scp-001", ["horror"]);

      // Act
      await processor.recordFeedback(visitorId, "scp-001", "like");

      // Assert
      const feedbacks = storage.getFeedbacksDirectly(visitorId);
      expect(feedbacks).toHaveLength(1);
      expect(feedbacks[0].visitorId).toBe(visitorId);
      expect(feedbacks[0].articleId).toBe("scp-001");
      expect(feedbacks[0].type).toBe("like");
    });

    it("AND その記事のタグに対する重みが +1.0 増加する", async () => {
      // Arrange
      storage.setArticleTags("scp-001", ["horror", "keter"]);

      // Act
      const profile = await processor.recordFeedback(visitorId, "scp-001", "like");

      // Assert: 正規化後、最大値が1.0になる
      expect(profile.tagWeights["horror"]).toBe(1.0);
      expect(profile.tagWeights["keter"]).toBe(1.0);
    });

    it("AND プロファイルが再計算・保存される", async () => {
      // Arrange
      storage.setArticleTags("scp-001", ["horror"]);
      const saveProfileSpy = vi.spyOn(storage, "saveProfile");

      // Act
      await processor.recordFeedback(visitorId, "scp-001", "like");

      // Assert
      expect(saveProfileSpy).toHaveBeenCalled();
      const savedProfile = await storage.getProfile(visitorId);
      expect(savedProfile).not.toBeNull();
      expect(savedProfile?.tagWeights["horror"]).toBe(1.0);
    });

    it("AND 複数Likeでタグ重みが累積し正規化される", async () => {
      // Arrange: horrorが2回、keterが1回
      storage.setArticleTags("scp-001", ["horror"]);
      storage.setArticleTags("scp-002", ["horror"]);
      storage.setArticleTags("scp-003", ["keter"]);

      // Act
      await processor.recordFeedback(visitorId, "scp-001", "like");
      await processor.recordFeedback(visitorId, "scp-002", "like");
      const profile = await processor.recordFeedback(visitorId, "scp-003", "like");

      // Assert: horror=2.0, keter=1.0 → 正規化後 horror=1.0, keter=0.5
      expect(profile.tagWeights["horror"]).toBe(1.0);
      expect(profile.tagWeights["keter"]).toBe(0.5);
    });
  });

  describe("AC2: WHEN ユーザーが記事をDislikeした際", () => {
    it("THEN Feedbackレコードがストレージに保存される", async () => {
      // Arrange
      storage.setArticleTags("scp-001", ["horror"]);

      // Act
      await processor.recordFeedback(visitorId, "scp-001", "dislike");

      // Assert
      const feedbacks = storage.getFeedbacksDirectly(visitorId);
      expect(feedbacks).toHaveLength(1);
      expect(feedbacks[0].type).toBe("dislike");
    });

    it("AND その記事がgetDislikedArticleIdsの結果に含まれる", async () => {
      // Arrange
      storage.setArticleTags("scp-001", ["horror"]);

      // Act
      await processor.recordFeedback(visitorId, "scp-001", "dislike");

      // Assert
      const dislikedIds = await storage.getDislikedArticleIds(visitorId);
      expect(dislikedIds).toContain("scp-001");
    });

    it("AND タグ重みは変化しない", async () => {
      // Arrange
      storage.setArticleTags("scp-001", ["horror"]);

      // Act
      const profile = await processor.recordFeedback(visitorId, "scp-001", "dislike");

      // Assert: Dislikeした記事のタグは重みに影響しない
      expect(profile.tagWeights["horror"]).toBeUndefined();
    });

    it("AND 他のLike記事のタグ重みには影響しない", async () => {
      // Arrange
      storage.setArticleTags("scp-001", ["horror"]); // これをLike
      storage.setArticleTags("scp-002", ["surreal"]); // これをDislike

      // Act
      await processor.recordFeedback(visitorId, "scp-001", "like");
      const profile = await processor.recordFeedback(visitorId, "scp-002", "dislike");

      // Assert
      expect(profile.tagWeights["horror"]).toBe(1.0);
      expect(profile.tagWeights["surreal"]).toBeUndefined();
    });
  });

  describe("AC3: WHEN 同じ記事に対して再度フィードバックした際", () => {
    it("THEN 既存のフィードバックが上書きされる（Like → Dislike）", async () => {
      // Arrange
      storage.setArticleTags("scp-001", ["horror"]);

      // Act: 最初にLike、次にDislike
      await processor.recordFeedback(visitorId, "scp-001", "like");
      await processor.recordFeedback(visitorId, "scp-001", "dislike");

      // Assert
      const feedbacks = storage.getFeedbacksDirectly(visitorId);
      expect(feedbacks).toHaveLength(1);
      expect(feedbacks[0].type).toBe("dislike");
    });

    it("THEN 既存のフィードバックが上書きされる（Dislike → Like）", async () => {
      // Arrange
      storage.setArticleTags("scp-001", ["horror"]);

      // Act: 最初にDislike、次にLike
      await processor.recordFeedback(visitorId, "scp-001", "dislike");
      const profile = await processor.recordFeedback(visitorId, "scp-001", "like");

      // Assert
      const feedbacks = storage.getFeedbacksDirectly(visitorId);
      expect(feedbacks).toHaveLength(1);
      expect(feedbacks[0].type).toBe("like");

      // タグ重みも更新される
      expect(profile.tagWeights["horror"]).toBe(1.0);
    });

    it("AND プロファイルが上書き後の状態で再計算される", async () => {
      // Arrange
      storage.setArticleTags("scp-001", ["horror"]);
      storage.setArticleTags("scp-002", ["surreal"]);

      // Act: scp-001をLike、scp-002をLike、scp-001をDislikeに変更
      await processor.recordFeedback(visitorId, "scp-001", "like");
      await processor.recordFeedback(visitorId, "scp-002", "like");
      const profile = await processor.recordFeedback(visitorId, "scp-001", "dislike");

      // Assert: scp-001はDislikeになったのでhorrorの重みは0、surrealのみ
      expect(profile.tagWeights["surreal"]).toBe(1.0);
      expect(profile.tagWeights["horror"]).toBeUndefined();
    });
  });

  describe("AC4: WHEN フィードバックを記録する際", () => {
    it("THEN 記事のタグ情報をストレージから取得する", async () => {
      // Arrange
      const getArticleTagsSpy = vi.spyOn(storage, "getArticleTags");
      storage.setArticleTags("scp-001", ["horror"]);

      // Act
      await processor.recordFeedback(visitorId, "scp-001", "like");

      // Assert
      expect(getArticleTagsSpy).toHaveBeenCalledWith("scp-001");
    });

    it("AND tagWeightsに反映する", async () => {
      // Arrange
      storage.setArticleTags("scp-001", ["horror", "keter", "cognitohazard"]);

      // Act
      const profile = await processor.recordFeedback(visitorId, "scp-001", "like");

      // Assert: 全タグがtagWeightsに反映
      expect(profile.tagWeights["horror"]).toBeDefined();
      expect(profile.tagWeights["keter"]).toBeDefined();
      expect(profile.tagWeights["cognitohazard"]).toBeDefined();
    });

    it("AND タグが取得できない記事でもエラーにならない", async () => {
      // Arrange: タグを設定しない

      // Act & Assert: エラーにならない
      const profile = await processor.recordFeedback(visitorId, "unknown-article", "like");

      // タグ重みは空
      expect(profile.tagWeights).toEqual({});
    });
  });

  describe("エッジケース", () => {
    it("visitorIdが空文字列の場合はエラーをスローする", async () => {
      // Act & Assert
      await expect(processor.recordFeedback("", "scp-001", "like")).rejects.toThrow();
    });

    it("articleIdが空文字列の場合はエラーをスローする", async () => {
      // Act & Assert
      await expect(processor.recordFeedback(visitorId, "", "like")).rejects.toThrow();
    });

    it("フィードバックIDが正しい形式で生成される", async () => {
      // Arrange
      storage.setArticleTags("scp-001", ["horror"]);

      // Act
      await processor.recordFeedback(visitorId, "scp-001", "like");

      // Assert
      const feedbacks = storage.getFeedbacksDirectly(visitorId);
      expect(feedbacks[0].id).toBe(`${visitorId}_scp-001`);
    });

    it("createdAtが設定される", async () => {
      // Arrange
      storage.setArticleTags("scp-001", ["horror"]);

      // Act
      await processor.recordFeedback(visitorId, "scp-001", "like");

      // Assert
      const feedbacks = storage.getFeedbacksDirectly(visitorId);
      expect(feedbacks[0].createdAt).toBeDefined();
      // ISO 8601形式であることを確認
      expect(new Date(feedbacks[0].createdAt).toISOString()).toBe(feedbacks[0].createdAt);
    });
  });
});
