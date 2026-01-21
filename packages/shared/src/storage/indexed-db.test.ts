/**
 * @file IndexedDB実装テスト
 * @description Subtask 004-01-02 のACを検証するテスト
 * @see specs/004-recommend/004-01-recommend-foundation/004-01-02.md
 */

import "fake-indexeddb/auto";
import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { IndexedDBStorage } from "./indexed-db";
import type { PreferenceProfile, ViewHistory, Feedback, RecommendationLog } from "./types";

describe("004-01-02: IndexedDB実装", () => {
  let storage: IndexedDBStorage;

  beforeEach(async () => {
    // 各テスト前にDBをクリーンアップ
    const dbs = await indexedDB.databases();
    for (const db of dbs as { name?: string }[]) {
      if (db.name) {
        indexedDB.deleteDatabase(db.name);
      }
    }
    storage = new IndexedDBStorage();
  });

  afterEach(async () => {
    // テスト後のクリーンアップ
    if (storage) {
      storage.close();
    }
    indexedDB.deleteDatabase("scp-recommend");
  });

  describe("AC1: データベース初期化", () => {
    it("初回起動時にscp-recommendデータベースが作成される", async () => {
      // Act
      await storage.initialize();

      // Assert
      const dbs = (await indexedDB.databases()) as { name?: string; version?: number }[];
      const targetDb = dbs.find((db) => db.name === "scp-recommend");
      expect(targetDb).toBeDefined();
      expect(targetDb?.version).toBe(1);
    });

    it("初期化時に全てのオブジェクトストアが作成される", async () => {
      // Act
      await storage.initialize();

      // Assert
      const storeNames = storage.getStoreNames();
      expect(storeNames).toContain("preferences");
      expect(storeNames).toContain("viewHistory");
      expect(storeNames).toContain("feedback");
      expect(storeNames).toContain("recommendationLog");
    });

    it("viewHistoryストアに3つのインデックスが作成される", async () => {
      // Act
      await storage.initialize();

      // Assert
      const indexNames = storage.getIndexNames("viewHistory");
      expect(indexNames).toContain("byVisitor");
      expect(indexNames).toContain("byArticle");
      expect(indexNames).toContain("byDate");
    });

    it("feedbackストアに2つのインデックスが作成される", async () => {
      // Act
      await storage.initialize();

      // Assert
      const indexNames = storage.getIndexNames("feedback");
      expect(indexNames).toContain("byVisitor");
      expect(indexNames).toContain("byType");
    });

    it("recommendationLogストアに2つのインデックスが作成される", async () => {
      // Act
      await storage.initialize();

      // Assert
      const indexNames = storage.getIndexNames("recommendationLog");
      expect(indexNames).toContain("byVisitor");
      expect(indexNames).toContain("byDate");
    });

    it("既にDBが存在する状態で再初期化しても既存データは保持される", async () => {
      // Arrange
      await storage.initialize();
      const profile: PreferenceProfile = {
        visitorId: "test-visitor",
        tagWeights: { horror: 0.8 },
        objectClassPreference: { Safe: 0.6 },
        createdAt: "2026-01-20T00:00:00Z",
        updatedAt: "2026-01-20T00:00:00Z",
      };
      await storage.saveProfile(profile);
      storage.close();

      // Act
      const newStorage = new IndexedDBStorage();
      await newStorage.initialize();

      // Assert
      const retrieved = await newStorage.getProfile("test-visitor");
      expect(retrieved).toEqual(profile);

      newStorage.close();
    });
  });

  describe("AC2: 嗜好プロファイル保存・復元", () => {
    beforeEach(async () => {
      await storage.initialize();
    });

    it("プロファイルを保存できる", async () => {
      // Arrange
      const profile: PreferenceProfile = {
        visitorId: "test-visitor-001",
        tagWeights: { horror: 0.8, "object-class-safe": 0.6 },
        objectClassPreference: { Safe: 0.6, Euclid: 0.3 },
        starterPack: "horror",
        createdAt: "2026-01-20T00:00:00Z",
        updatedAt: "2026-01-20T00:00:00Z",
      };

      // Act
      await storage.saveProfile(profile);

      // Assert
      const retrieved = await storage.getProfile("test-visitor-001");
      expect(retrieved).toEqual(profile);
    });

    it("存在しないvisitorIdの場合nullが返る", async () => {
      // Act
      const result = await storage.getProfile("non-existent-id");

      // Assert
      expect(result).toBeNull();
    });

    it("同じvisitorIdで再保存すると上書きされる", async () => {
      // Arrange
      const profile1: PreferenceProfile = {
        visitorId: "test-visitor-001",
        tagWeights: { horror: 0.8 },
        objectClassPreference: { Safe: 0.6 },
        createdAt: "2026-01-20T00:00:00Z",
        updatedAt: "2026-01-20T00:00:00Z",
      };
      const profile2: PreferenceProfile = {
        visitorId: "test-visitor-001",
        tagWeights: { horror: 0.9 },
        objectClassPreference: { Safe: 0.7 },
        createdAt: "2026-01-20T00:00:00Z",
        updatedAt: "2026-01-20T01:00:00Z",
      };

      // Act
      await storage.saveProfile(profile1);
      await storage.saveProfile(profile2);

      // Assert
      const retrieved = await storage.getProfile("test-visitor-001");
      expect(retrieved?.tagWeights.horror).toBe(0.9);
      expect(retrieved?.updatedAt).toBe("2026-01-20T01:00:00Z");
    });

    it("空のtagWeights/objectClassPreferenceを保存できる", async () => {
      // Arrange
      const profile: PreferenceProfile = {
        visitorId: "test-visitor-002",
        tagWeights: {},
        objectClassPreference: {},
        createdAt: "2026-01-20T00:00:00Z",
        updatedAt: "2026-01-20T00:00:00Z",
      };

      // Act
      await storage.saveProfile(profile);

      // Assert
      const retrieved = await storage.getProfile("test-visitor-002");
      expect(retrieved?.tagWeights).toEqual({});
      expect(retrieved?.objectClassPreference).toEqual({});
    });

    it("preferenceEmbeddingを保存できる", async () => {
      // Arrange
      const embedding = Array.from({ length: 100 }, (_, i) => i * 0.01);
      const profile: PreferenceProfile = {
        visitorId: "test-visitor-003",
        tagWeights: {},
        objectClassPreference: {},
        preferenceEmbedding: embedding,
        createdAt: "2026-01-20T00:00:00Z",
        updatedAt: "2026-01-20T00:00:00Z",
      };

      // Act
      await storage.saveProfile(profile);

      // Assert
      const retrieved = await storage.getProfile("test-visitor-003");
      expect(retrieved?.preferenceEmbedding).toEqual(embedding);
    });
  });

  describe("AC3: 閲覧履歴の追加・インデックス検索", () => {
    beforeEach(async () => {
      await storage.initialize();
    });

    it("閲覧履歴を追加できる", async () => {
      // Arrange
      const history: ViewHistory = {
        id: "visitor1_scp-173_1640000000000",
        visitorId: "visitor1",
        articleId: "scp-173",
        viewedAt: "2026-01-20T00:00:00Z",
      };

      // Act
      await storage.addViewHistory(history);

      // Assert
      const retrieved = await storage.getViewHistory("visitor1");
      expect(retrieved).toHaveLength(1);
      expect(retrieved[0]).toEqual(history);
    });

    it("visitorIdで履歴を取得できる", async () => {
      // Arrange
      const history1: ViewHistory = {
        id: "visitor1_scp-173_1640000000000",
        visitorId: "visitor1",
        articleId: "scp-173",
        viewedAt: "2024-01-01T00:00:00Z",
      };
      const history2: ViewHistory = {
        id: "visitor1_scp-682_1640000001000",
        visitorId: "visitor1",
        articleId: "scp-682",
        viewedAt: "2024-01-01T00:01:00Z",
      };
      const history3: ViewHistory = {
        id: "visitor2_scp-173_1640000002000",
        visitorId: "visitor2",
        articleId: "scp-173",
        viewedAt: "2024-01-01T00:02:00Z",
      };

      // Act
      await storage.addViewHistory(history1);
      await storage.addViewHistory(history2);
      await storage.addViewHistory(history3);

      // Assert
      const visitor1History = await storage.getViewHistory("visitor1");
      expect(visitor1History).toHaveLength(2);

      const visitor2History = await storage.getViewHistory("visitor2");
      expect(visitor2History).toHaveLength(1);
    });

    it("limit指定で取得件数を制限できる", async () => {
      // Arrange
      for (let i = 0; i < 10; i++) {
        await storage.addViewHistory({
          id: `visitor1_scp-${i}_${Date.now() + i}`,
          visitorId: "visitor1",
          articleId: `scp-${i}`,
          viewedAt: new Date(Date.now() + i * 1000).toISOString(),
        });
      }

      // Act
      const limited = await storage.getViewHistory("visitor1", 5);

      // Assert
      expect(limited).toHaveLength(5);
    });

    it("最新の履歴から順に取得される（降順）", async () => {
      // Arrange
      const history1: ViewHistory = {
        id: "visitor1_scp-173_1640000000000",
        visitorId: "visitor1",
        articleId: "scp-173",
        viewedAt: "2024-01-01T00:00:00Z",
      };
      const history2: ViewHistory = {
        id: "visitor1_scp-682_1640000001000",
        visitorId: "visitor1",
        articleId: "scp-682",
        viewedAt: "2024-01-01T00:01:00Z",
      };

      // Act
      await storage.addViewHistory(history1);
      await storage.addViewHistory(history2);

      // Assert
      const retrieved = await storage.getViewHistory("visitor1");
      expect(retrieved[0].articleId).toBe("scp-682"); // 新しい方が先
      expect(retrieved[1].articleId).toBe("scp-173");
    });

    it("同じ記事を複数回閲覧しても全て別レコードとして保存される", async () => {
      // Arrange
      const history1: ViewHistory = {
        id: "visitor1_scp-173_1640000000000",
        visitorId: "visitor1",
        articleId: "scp-173",
        viewedAt: "2024-01-01T00:00:00Z",
      };
      const history2: ViewHistory = {
        id: "visitor1_scp-173_1640000001000",
        visitorId: "visitor1",
        articleId: "scp-173",
        viewedAt: "2024-01-01T00:01:00Z",
      };

      // Act
      await storage.addViewHistory(history1);
      await storage.addViewHistory(history2);

      // Assert
      const retrieved = await storage.getViewHistory("visitor1");
      expect(retrieved).toHaveLength(2);
    });

    it("durationが設定されている履歴を保存・取得できる", async () => {
      // Arrange
      const history: ViewHistory = {
        id: "visitor1_scp-173_1640000000000",
        visitorId: "visitor1",
        articleId: "scp-173",
        viewedAt: "2024-01-01T00:00:00Z",
        duration: 120,
      };

      // Act
      await storage.addViewHistory(history);

      // Assert
      const retrieved = await storage.getViewHistory("visitor1");
      expect(retrieved[0].duration).toBe(120);
    });
  });

  describe("AC4: フィードバックの追加・上書き", () => {
    beforeEach(async () => {
      await storage.initialize();
    });

    it("フィードバックを追加できる", async () => {
      // Arrange
      const feedback: Feedback = {
        id: "visitor1_scp-173",
        visitorId: "visitor1",
        articleId: "scp-173",
        type: "like",
        createdAt: "2026-01-20T00:00:00Z",
      };

      // Act
      await storage.addFeedback(feedback);

      // Assert
      const retrieved = await storage.getFeedback("visitor1");
      expect(retrieved).toHaveLength(1);
      expect(retrieved[0]).toEqual(feedback);
    });

    it("同じ記事への既存フィードバックがある場合は上書きされる", async () => {
      // Arrange
      const feedback1: Feedback = {
        id: "visitor1_scp-173",
        visitorId: "visitor1",
        articleId: "scp-173",
        type: "like",
        createdAt: "2024-01-01T00:00:00Z",
      };
      const feedback2: Feedback = {
        id: "visitor1_scp-173",
        visitorId: "visitor1",
        articleId: "scp-173",
        type: "dislike",
        createdAt: "2024-01-01T00:01:00Z",
      };

      // Act
      await storage.addFeedback(feedback1);
      await storage.addFeedback(feedback2);

      // Assert
      const retrieved = await storage.getFeedback("visitor1");
      expect(retrieved).toHaveLength(1);
      expect(retrieved[0].type).toBe("dislike");
    });

    it("特定記事へのフィードバックを取得できる", async () => {
      // Arrange
      const feedback: Feedback = {
        id: "visitor1_scp-173",
        visitorId: "visitor1",
        articleId: "scp-173",
        type: "like",
        createdAt: "2026-01-20T00:00:00Z",
      };
      await storage.addFeedback(feedback);

      // Act
      const retrieved = await storage.getFeedbackByArticle("visitor1", "scp-173");

      // Assert
      expect(retrieved).toEqual(feedback);
    });

    it("存在しない記事のフィードバックはnullが返る", async () => {
      // Act
      const result = await storage.getFeedbackByArticle("visitor1", "scp-999");

      // Assert
      expect(result).toBeNull();
    });

    it("Dislike済み記事IDリストを取得できる", async () => {
      // Arrange
      await storage.addFeedback({
        id: "visitor1_scp-173",
        visitorId: "visitor1",
        articleId: "scp-173",
        type: "dislike",
        createdAt: "2026-01-20T00:00:00Z",
      });
      await storage.addFeedback({
        id: "visitor1_scp-682",
        visitorId: "visitor1",
        articleId: "scp-682",
        type: "like",
        createdAt: "2026-01-20T00:00:00Z",
      });
      await storage.addFeedback({
        id: "visitor1_scp-999",
        visitorId: "visitor1",
        articleId: "scp-999",
        type: "dislike",
        createdAt: "2026-01-20T00:00:00Z",
      });

      // Act
      const dislikedIds = await storage.getDislikedArticleIds("visitor1");

      // Assert
      expect(dislikedIds).toHaveLength(2);
      expect(dislikedIds).toContain("scp-173");
      expect(dislikedIds).toContain("scp-999");
      expect(dislikedIds).not.toContain("scp-682");
    });

    it("異なる記事へのフィードバックは全て保存される", async () => {
      // Arrange
      await storage.addFeedback({
        id: "visitor1_scp-173",
        visitorId: "visitor1",
        articleId: "scp-173",
        type: "like",
        createdAt: "2026-01-20T00:00:00Z",
      });
      await storage.addFeedback({
        id: "visitor1_scp-682",
        visitorId: "visitor1",
        articleId: "scp-682",
        type: "like",
        createdAt: "2026-01-20T00:00:00Z",
      });

      // Act
      const retrieved = await storage.getFeedback("visitor1");

      // Assert
      expect(retrieved).toHaveLength(2);
    });
  });

  describe("AC5: IndexedDB利用不可時のエラー", () => {
    it("IndexedDBが利用不可能な場合はエラーをスローする", async () => {
      // Arrange
      const originalIndexedDB = (globalThis as Record<string, unknown>).indexedDB;
      (globalThis as Record<string, unknown>).indexedDB = undefined;

      const testStorage = new IndexedDBStorage();

      // Act & Assert
      await expect(testStorage.initialize()).rejects.toThrow("IndexedDB is not available");

      // Cleanup
      (globalThis as Record<string, unknown>).indexedDB = originalIndexedDB;
    });
  });

  describe("記事タグ取得", () => {
    beforeEach(async () => {
      await storage.initialize();
    });

    it("getArticleTagsは現時点ではnullを返す（サーバーから取得する前提）", async () => {
      // Act
      const tags = await storage.getArticleTags("scp-173");

      // Assert
      expect(tags).toBeNull();
    });
  });

  describe("推薦ログ", () => {
    beforeEach(async () => {
      await storage.initialize();
    });

    it("推薦ログを追加できる", async () => {
      // Arrange
      const log: RecommendationLog = {
        id: "rec-log-001",
        visitorId: "visitor1",
        articleId: "scp-173",
        recommendedAt: "2026-01-20T00:00:00Z",
        source: "preference",
        clicked: false,
      };

      // Act
      await storage.addRecommendationLog(log);

      // Assert
      const retrieved = await storage.getRecommendationLog("visitor1");
      expect(retrieved).toHaveLength(1);
      expect(retrieved[0]).toEqual(log);
    });

    it("limit指定で取得件数を制限できる", async () => {
      // Arrange
      for (let i = 0; i < 10; i++) {
        await storage.addRecommendationLog({
          id: `rec-log-${i}`,
          visitorId: "visitor1",
          articleId: `scp-${i}`,
          recommendedAt: new Date(Date.now() + i * 1000).toISOString(),
          source: "preference",
          clicked: false,
        });
      }

      // Act
      const limited = await storage.getRecommendationLog("visitor1", 5);

      // Assert
      expect(limited).toHaveLength(5);
    });

    it("最新の推薦ログから順に取得される（降順）", async () => {
      // Arrange
      await storage.addRecommendationLog({
        id: "rec-log-001",
        visitorId: "visitor1",
        articleId: "scp-173",
        recommendedAt: "2024-01-01T00:00:00Z",
        source: "preference",
        clicked: false,
      });
      await storage.addRecommendationLog({
        id: "rec-log-002",
        visitorId: "visitor1",
        articleId: "scp-682",
        recommendedAt: "2024-01-01T00:01:00Z",
        source: "serendipity",
        clicked: true,
      });

      // Act
      const retrieved = await storage.getRecommendationLog("visitor1");

      // Assert
      expect(retrieved[0].articleId).toBe("scp-682"); // 新しい方が先
      expect(retrieved[1].articleId).toBe("scp-173");
    });
  });
});
