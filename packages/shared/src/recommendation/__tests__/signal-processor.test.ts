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
    // 同じIDの履歴があれば上書き（updateViewDuration用）
    const index = existing.findIndex((h) => h.id === history.id);
    if (index >= 0) {
      existing[index] = history;
    } else {
      existing.push(history);
    }
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

  async getFavorites(_visitorId: string): Promise<import("../../storage/types").Favorite[]> {
    return [];
  }

  async addFavorite(_favorite: import("../../storage/types").Favorite): Promise<void> {
    // no-op for this mock
  }

  async removeFavorite(_visitorId: string, _articleId: string): Promise<void> {
    // no-op for this mock
  }

  async resetPreference(_visitorId: string): Promise<void> {
    // no-op for this mock
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

  // ============================================================
  // 004-04-02: 閲覧履歴・読了シグナル処理
  // ============================================================

  describe("AC1: WHEN ユーザーが記事を開いた際", () => {
    it("THEN ViewHistoryレコードがストレージに保存される", async () => {
      // Act
      await processor.recordView(visitorId, "scp-001");

      // Assert
      const histories = await storage.getViewHistory(visitorId);
      expect(histories).toHaveLength(1);
      expect(histories[0].visitorId).toBe(visitorId);
      expect(histories[0].articleId).toBe("scp-001");
    });

    it("AND viewedAtにタイムスタンプが記録される", async () => {
      // Arrange
      const beforeTime = new Date().toISOString();

      // Act
      await processor.recordView(visitorId, "scp-001");

      // Assert
      const afterTime = new Date().toISOString();
      const histories = await storage.getViewHistory(visitorId);
      expect(histories[0].viewedAt).toBeDefined();
      expect(histories[0].viewedAt >= beforeTime).toBe(true);
      expect(histories[0].viewedAt <= afterTime).toBe(true);
    });

    it("AND IDは ${visitorId}_${articleId}_${timestamp} 形式で生成される", async () => {
      // Act
      await processor.recordView(visitorId, "scp-001");

      // Assert
      const histories = await storage.getViewHistory(visitorId);
      expect(histories[0].id).toMatch(new RegExp(`^${visitorId}_scp-001_\\d+$`));
    });
  });

  describe("AC2: WHEN ユーザーが記事を最後まで読んだ（Likeなし）際", () => {
    it("THEN その記事のタグに対する重みが +0.3 増加する", async () => {
      // Arrange: 閲覧履歴を追加（読了状態: duration >= 60秒）
      storage.setArticleTags("scp-001", ["horror"]);
      await processor.recordView(visitorId, "scp-001", 120); // 2分閲覧

      // Act: 読了完了を記録
      const profile = await processor.recordReadComplete(visitorId, "scp-001");

      // Assert: 正規化後の重みが1.0になる（読了の0.3のみ → max=0.3 → 1.0に正規化）
      expect(profile.tagWeights["horror"]).toBe(1.0);
    });

    it("AND プロファイルが再計算・保存される", async () => {
      // Arrange
      storage.setArticleTags("scp-001", ["horror"]);
      await processor.recordView(visitorId, "scp-001", 120);
      const saveProfileSpy = vi.spyOn(storage, "saveProfile");

      // Act
      await processor.recordReadComplete(visitorId, "scp-001");

      // Assert
      expect(saveProfileSpy).toHaveBeenCalled();
      const savedProfile = await storage.getProfile(visitorId);
      expect(savedProfile).not.toBeNull();
    });

    it("読了（Likeなし）の重みはLikeより低い（0.3 vs 1.0）", async () => {
      // Arrange: scp-001をLike、scp-002を読了のみ
      storage.setArticleTags("scp-001", ["horror"]);
      storage.setArticleTags("scp-002", ["surreal"]);
      await processor.recordView(visitorId, "scp-002", 120);

      // Act
      await processor.recordFeedback(visitorId, "scp-001", "like");
      const profile = await processor.recordReadComplete(visitorId, "scp-002");

      // Assert: horror=1.0(Like), surreal=0.3 → 正規化後 horror=1.0, surreal=0.3
      expect(profile.tagWeights["horror"]).toBe(1.0);
      expect(profile.tagWeights["surreal"]).toBeCloseTo(0.3, 5);
    });

    it("Like済み記事の読了は追加の重みが付かない", async () => {
      // Arrange: 記事をLike済み
      storage.setArticleTags("scp-001", ["horror"]);
      await processor.recordFeedback(visitorId, "scp-001", "like");
      await processor.recordView(visitorId, "scp-001", 120);

      // 別の記事をLike（比較用）
      storage.setArticleTags("scp-002", ["surreal"]);
      await processor.recordFeedback(visitorId, "scp-002", "like");

      // Act: 読了完了を記録（Like済み）
      const profile = await processor.recordReadComplete(visitorId, "scp-001");

      // Assert: 両方1.0（読了の+0.3は加算されない）
      expect(profile.tagWeights["horror"]).toBe(1.0);
      expect(profile.tagWeights["surreal"]).toBe(1.0);
    });

    it("Dislike済み記事の読了は追加の重みが付かない", async () => {
      // Arrange
      storage.setArticleTags("scp-001", ["horror"]);
      await processor.recordFeedback(visitorId, "scp-001", "dislike");
      await processor.recordView(visitorId, "scp-001", 120);

      // Act
      const profile = await processor.recordReadComplete(visitorId, "scp-001");

      // Assert: horrorの重みは0
      expect(profile.tagWeights["horror"]).toBeUndefined();
    });
  });

  describe("AC3: WHEN 閲覧履歴を取得する際", () => {
    it("THEN visitorIdでフィルタリングできる", async () => {
      // Arrange: 異なるvisitorの閲覧履歴
      await processor.recordView(visitorId, "scp-001");
      await processor.recordView("other-visitor", "scp-002");

      // Act
      const histories = await processor.getViewHistory(visitorId);

      // Assert
      expect(histories).toHaveLength(1);
      expect(histories[0].articleId).toBe("scp-001");
    });

    it("AND 日付順でソートされる（新しい順）", async () => {
      // Arrange: 複数の閲覧履歴を追加
      await processor.recordView(visitorId, "scp-001");
      await new Promise((resolve) => setTimeout(resolve, 10)); // 少し待つ
      await processor.recordView(visitorId, "scp-002");
      await new Promise((resolve) => setTimeout(resolve, 10));
      await processor.recordView(visitorId, "scp-003");

      // Act
      const histories = await processor.getViewHistory(visitorId);

      // Assert: 新しい順にソートされている
      expect(histories).toHaveLength(3);
      expect(histories[0].articleId).toBe("scp-003");
      expect(histories[1].articleId).toBe("scp-002");
      expect(histories[2].articleId).toBe("scp-001");
    });

    it("取得件数を制限できる", async () => {
      // Arrange
      await processor.recordView(visitorId, "scp-001");
      await processor.recordView(visitorId, "scp-002");
      await processor.recordView(visitorId, "scp-003");

      // Act
      const histories = await processor.getViewHistory(visitorId, 2);

      // Assert
      expect(histories).toHaveLength(2);
    });
  });

  describe("AC4: WHERE 閲覧履歴 IF 滞在時間が記録可能な場合", () => {
    it("THE SYSTEM SHALL durationフィールドに秒数を保存する", async () => {
      // Act
      await processor.recordView(visitorId, "scp-001", 180);

      // Assert
      const histories = await storage.getViewHistory(visitorId);
      expect(histories[0].duration).toBe(180);
    });

    it("durationが指定されない場合はundefinedのまま", async () => {
      // Act
      await processor.recordView(visitorId, "scp-001");

      // Assert
      const histories = await storage.getViewHistory(visitorId);
      expect(histories[0].duration).toBeUndefined();
    });

    it("後からdurationを更新できる（updateViewDuration）", async () => {
      // Arrange: まず閲覧を記録
      await processor.recordView(visitorId, "scp-001");

      // Act: 後からdurationを更新
      await processor.updateViewDuration(visitorId, "scp-001", 300);

      // Assert
      const histories = await storage.getViewHistory(visitorId);
      expect(histories[0].duration).toBe(300);
    });
  });

  describe("閲覧履歴のエッジケース", () => {
    it("recordView: visitorIdが空の場合はエラーをスローする", async () => {
      await expect(processor.recordView("", "scp-001")).rejects.toThrow();
    });

    it("recordView: articleIdが空の場合はエラーをスローする", async () => {
      await expect(processor.recordView(visitorId, "")).rejects.toThrow();
    });

    it("recordReadComplete: visitorIdが空の場合はエラーをスローする", async () => {
      await expect(processor.recordReadComplete("", "scp-001")).rejects.toThrow();
    });

    it("recordReadComplete: articleIdが空の場合はエラーをスローする", async () => {
      await expect(processor.recordReadComplete(visitorId, "")).rejects.toThrow();
    });

    it("同じ記事を複数回閲覧した場合、履歴は複数件保存される", async () => {
      // Act: 異なるタイムスタンプになるよう少し待機
      await processor.recordView(visitorId, "scp-001");
      await new Promise((resolve) => setTimeout(resolve, 5));
      await processor.recordView(visitorId, "scp-001");

      // Assert
      const histories = await storage.getViewHistory(visitorId);
      expect(histories).toHaveLength(2);
    });
  });
});
