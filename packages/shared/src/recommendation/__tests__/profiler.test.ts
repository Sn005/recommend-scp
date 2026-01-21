/**
 * @file PreferenceProfiler テスト
 * @description 嗜好プロファイル計算のテスト
 * @see specs/004-recommend/004-01-recommend-foundation/004-01-03.md
 */

import { describe, it, expect, beforeEach } from "vitest";
import { PreferenceProfiler } from "../profiler";
import type {
  PreferenceStorage,
  PreferenceProfile,
  ViewHistory,
  Feedback,
  RecommendationLog,
  StarterPackType,
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

  setViewHistories(visitorId: string, histories: ViewHistory[]): void {
    this.viewHistories.set(visitorId, histories);
  }

  setFeedbacks(visitorId: string, feedbacks: Feedback[]): void {
    this.feedbacks.set(visitorId, feedbacks);
  }
}

/**
 * テストデータビルダー
 */
const createFeedback = (
  visitorId: string,
  articleId: string,
  type: "like" | "dislike",
  createdAt = "2026-01-20T12:00:00Z"
): Feedback => ({
  id: `${visitorId}_${articleId}`,
  visitorId,
  articleId,
  type,
  createdAt,
});

const createViewHistory = (
  visitorId: string,
  articleId: string,
  duration?: number,
  viewedAt = "2026-01-20T12:00:00Z"
): ViewHistory => ({
  id: `${visitorId}_${articleId}_${Date.now()}`,
  visitorId,
  articleId,
  viewedAt,
  duration,
});

describe("PreferenceProfiler", () => {
  let storage: MockPreferenceStorage;
  let profiler: PreferenceProfiler;
  const visitorId = "visitor-123";

  beforeEach(() => {
    storage = new MockPreferenceStorage();
    profiler = new PreferenceProfiler(storage);
  });

  describe("AC1: WHEN ユーザーが記事をLikeした際", () => {
    it("THEN その記事のタグに対する重みが+1.0増加する", async () => {
      // Arrange
      storage.setArticleTags("scp-001", ["horror", "keter"]);
      storage.setFeedbacks(visitorId, [createFeedback(visitorId, "scp-001", "like")]);

      // Act
      const profile = await profiler.recalculateProfile(visitorId);

      // Assert: 正規化後、最大値が1.0になる
      expect(profile.tagWeights["horror"]).toBe(1.0);
      expect(profile.tagWeights["keter"]).toBe(1.0);
    });

    it("AND 複数のLikeでタグ重みが累積し正規化される", async () => {
      // Arrange: horrorが2回、keterが1回
      storage.setArticleTags("scp-001", ["horror"]);
      storage.setArticleTags("scp-002", ["horror"]);
      storage.setArticleTags("scp-003", ["keter"]);
      storage.setFeedbacks(visitorId, [
        createFeedback(visitorId, "scp-001", "like"),
        createFeedback(visitorId, "scp-002", "like"),
        createFeedback(visitorId, "scp-003", "like"),
      ]);

      // Act
      const profile = await profiler.recalculateProfile(visitorId);

      // Assert: horror=2.0, keter=1.0 → 正規化後 horror=1.0, keter=0.5
      expect(profile.tagWeights["horror"]).toBe(1.0);
      expect(profile.tagWeights["keter"]).toBe(0.5);
    });

    it("AND 複数タグを持つ記事では全タグの重みが増加する", async () => {
      // Arrange
      storage.setArticleTags("scp-001", ["horror", "keter", "cognitohazard"]);
      storage.setFeedbacks(visitorId, [createFeedback(visitorId, "scp-001", "like")]);

      // Act
      const profile = await profiler.recalculateProfile(visitorId);

      // Assert: 全タグが同じ重み（1.0）
      expect(profile.tagWeights["horror"]).toBe(1.0);
      expect(profile.tagWeights["keter"]).toBe(1.0);
      expect(profile.tagWeights["cognitohazard"]).toBe(1.0);
    });

    it("AND tagWeightsが更新される", async () => {
      // Arrange
      storage.setArticleTags("scp-001", ["horror"]);
      storage.setFeedbacks(visitorId, [createFeedback(visitorId, "scp-001", "like")]);

      // Act
      const profile = await profiler.recalculateProfile(visitorId);

      // Assert
      expect(profile.tagWeights).toBeDefined();
      expect(Object.keys(profile.tagWeights).length).toBeGreaterThan(0);
    });
  });

  describe("AC2: WHEN ユーザーが記事を最後まで読んだ（Likeなし）際", () => {
    it("THEN その記事のタグに対する重みが+0.3増加する", async () => {
      // Arrange: Likeなしで読了（duration >= 60秒）
      storage.setArticleTags("scp-001", ["surreal"]);
      storage.setViewHistories(visitorId, [createViewHistory(visitorId, "scp-001", 180)]);
      // フィードバックなし

      // Act
      const profile = await profiler.recalculateProfile(visitorId);

      // Assert: 正規化後は1.0（唯一のタグなので）
      expect(profile.tagWeights["surreal"]).toBe(1.0);
    });

    it("THEN Likeより弱い重みが適用される（Like=1.0, 読了=0.3）", async () => {
      // Arrange
      storage.setArticleTags("scp-001", ["horror"]); // Like
      storage.setArticleTags("scp-002", ["surreal"]); // 読了のみ
      storage.setFeedbacks(visitorId, [createFeedback(visitorId, "scp-001", "like")]);
      storage.setViewHistories(visitorId, [createViewHistory(visitorId, "scp-002", 180)]);

      // Act
      const profile = await profiler.recalculateProfile(visitorId);

      // Assert: horror=1.0, surreal=0.3 → 正規化後 horror=1.0, surreal=0.3
      expect(profile.tagWeights["horror"]).toBe(1.0);
      expect(profile.tagWeights["surreal"]).toBeCloseTo(0.3, 2);
    });

    it("THEN Likeした記事の読了は重複カウントされない", async () => {
      // Arrange: 同じ記事にViewHistoryとLikeがある
      storage.setArticleTags("scp-001", ["horror"]);
      storage.setFeedbacks(visitorId, [createFeedback(visitorId, "scp-001", "like")]);
      storage.setViewHistories(visitorId, [createViewHistory(visitorId, "scp-001", 180)]);

      // Act
      const profile = await profiler.recalculateProfile(visitorId);

      // Assert: Likeの+1.0のみ（+0.3は加算されない）
      expect(profile.tagWeights["horror"]).toBe(1.0);
    });

    it("THEN durationがundefinedの場合は読了とみなさない", async () => {
      // Arrange
      storage.setArticleTags("scp-001", ["horror"]);
      storage.setViewHistories(visitorId, [createViewHistory(visitorId, "scp-001", undefined)]);

      // Act
      const profile = await profiler.recalculateProfile(visitorId);

      // Assert: 重みなし
      expect(profile.tagWeights["horror"]).toBeUndefined();
    });
  });

  describe("AC3: WHEN ユーザーが記事をDislikeした際", () => {
    it("THEN その記事のタグに対する重みは変化しない", async () => {
      // Arrange
      storage.setArticleTags("scp-001", ["horror"]);
      storage.setFeedbacks(visitorId, [createFeedback(visitorId, "scp-001", "dislike")]);

      // Act
      const profile = await profiler.recalculateProfile(visitorId);

      // Assert: タグ重みは存在しない（0）
      expect(profile.tagWeights["horror"]).toBeUndefined();
    });

    it("AND 他のLike記事のタグ重みには影響しない", async () => {
      // Arrange
      storage.setArticleTags("scp-001", ["horror"]); // Dislike
      storage.setArticleTags("scp-002", ["surreal"]); // Like
      storage.setFeedbacks(visitorId, [
        createFeedback(visitorId, "scp-001", "dislike"),
        createFeedback(visitorId, "scp-002", "like"),
      ]);

      // Act
      const profile = await profiler.recalculateProfile(visitorId);

      // Assert
      expect(profile.tagWeights["horror"]).toBeUndefined();
      expect(profile.tagWeights["surreal"]).toBe(1.0);
    });

    it("AND 記事単体が除外リストに追加される", async () => {
      // Arrange
      storage.setArticleTags("scp-001", ["horror"]);
      storage.setFeedbacks(visitorId, [createFeedback(visitorId, "scp-001", "dislike")]);

      // Act
      const dislikedIds = await storage.getDislikedArticleIds(visitorId);

      // Assert
      expect(dislikedIds).toContain("scp-001");
    });
  });

  describe("AC4: WHEN 嗜好プロファイルを計算する際 GIVEN フィードバック履歴が存在する場合", () => {
    it("THEN tagWeightsは0〜1の範囲に正規化される", async () => {
      // Arrange
      storage.setArticleTags("scp-001", ["horror"]);
      storage.setArticleTags("scp-002", ["horror"]);
      storage.setArticleTags("scp-003", ["keter"]);
      storage.setFeedbacks(visitorId, [
        createFeedback(visitorId, "scp-001", "like"),
        createFeedback(visitorId, "scp-002", "like"),
        createFeedback(visitorId, "scp-003", "like"),
      ]);

      // Act
      const profile = await profiler.recalculateProfile(visitorId);

      // Assert: 全ての重みが0〜1の範囲
      Object.values(profile.tagWeights).forEach((weight) => {
        expect(weight).toBeGreaterThanOrEqual(0);
        expect(weight).toBeLessThanOrEqual(1);
      });
    });

    it("AND 最も高い重みのタグが1.0となる", async () => {
      // Arrange
      storage.setArticleTags("scp-001", ["horror"]);
      storage.setArticleTags("scp-002", ["horror"]);
      storage.setArticleTags("scp-003", ["keter"]);
      storage.setFeedbacks(visitorId, [
        createFeedback(visitorId, "scp-001", "like"),
        createFeedback(visitorId, "scp-002", "like"),
        createFeedback(visitorId, "scp-003", "like"),
      ]);

      // Act
      const profile = await profiler.recalculateProfile(visitorId);

      // Assert
      const maxWeight = Math.max(...Object.values(profile.tagWeights));
      expect(maxWeight).toBe(1.0);
    });

    it("AND 全ての重みが同じ場合は全て1.0になる", async () => {
      // Arrange
      storage.setArticleTags("scp-001", ["horror"]);
      storage.setArticleTags("scp-002", ["keter"]);
      storage.setFeedbacks(visitorId, [
        createFeedback(visitorId, "scp-001", "like"),
        createFeedback(visitorId, "scp-002", "like"),
      ]);

      // Act
      const profile = await profiler.recalculateProfile(visitorId);

      // Assert
      expect(profile.tagWeights["horror"]).toBe(1.0);
      expect(profile.tagWeights["keter"]).toBe(1.0);
    });

    it("THEN フィードバックが0件の場合は空のtagWeightsが返る", async () => {
      // Arrange: フィードバックなし

      // Act
      const profile = await profiler.recalculateProfile(visitorId);

      // Assert
      expect(profile.tagWeights).toEqual({});
    });
  });

  describe("AC5: WHEN オンボーディングが完了した際 GIVEN スターターパックが選択された場合", () => {
    it("THEN 初期tagWeightsがスターターパックに基づいて設定される（horror）", async () => {
      // Act
      const profile = await profiler.initializeFromStarterPack(visitorId, "horror");

      // Assert
      expect(profile.starterPack).toBe("horror");
      expect(profile.tagWeights["horror"]).toBeGreaterThan(0);
      expect(profile.onboardingCompletedAt).toBeDefined();
    });

    it("THEN 初期tagWeightsがスターターパックに基づいて設定される（scientific）", async () => {
      // Act
      const profile = await profiler.initializeFromStarterPack(visitorId, "scientific");

      // Assert
      expect(profile.starterPack).toBe("scientific");
      expect(profile.tagWeights["scientific"]).toBeGreaterThan(0);
    });

    it("AND 各スターターパック種別で異なる初期重みが設定される", async () => {
      // Act
      const horrorProfile = await profiler.initializeFromStarterPack("visitor-1", "horror");
      const scientificProfile = await profiler.initializeFromStarterPack("visitor-2", "scientific");

      // Assert
      expect(horrorProfile.tagWeights).not.toEqual(scientificProfile.tagWeights);
    });

    it("AND customスターターパックでは指定されたタグの初期重みが設定される", async () => {
      // Act
      const profile = await profiler.initializeFromStarterPack(visitorId, "custom", [
        "horror",
        "scientific",
      ]);

      // Assert
      expect(profile.starterPack).toBe("custom");
      expect(profile.tagWeights["horror"]).toBeGreaterThan(0);
      expect(profile.tagWeights["scientific"]).toBeGreaterThan(0);
    });
  });

  describe("エッジケース", () => {
    it("タグが空配列の記事をLikeしてもエラーにならない", async () => {
      // Arrange
      storage.setArticleTags("scp-001", []);
      storage.setFeedbacks(visitorId, [createFeedback(visitorId, "scp-001", "like")]);

      // Act
      const profile = await profiler.recalculateProfile(visitorId);

      // Assert
      expect(profile.tagWeights).toEqual({});
    });

    it("記事タグが取得できない場合はスキップされる", async () => {
      // Arrange: タグ情報を設定しない
      storage.setFeedbacks(visitorId, [createFeedback(visitorId, "unknown-article", "like")]);

      // Act
      const profile = await profiler.recalculateProfile(visitorId);

      // Assert
      expect(profile.tagWeights).toEqual({});
    });

    it("visitorIdが空文字列の場合はエラーをスローする", async () => {
      // Act & Assert
      await expect(profiler.recalculateProfile("")).rejects.toThrow();
    });

    it("タグに日本語が含まれても正常に処理される", async () => {
      // Arrange
      storage.setArticleTags("scp-001", ["ホラー", "ケテル"]);
      storage.setFeedbacks(visitorId, [createFeedback(visitorId, "scp-001", "like")]);

      // Act
      const profile = await profiler.recalculateProfile(visitorId);

      // Assert
      expect(profile.tagWeights["ホラー"]).toBe(1.0);
      expect(profile.tagWeights["ケテル"]).toBe(1.0);
    });
  });
});
