/**
 * @file CompositeStorage テスト
 * @description Subtask 004-01-04 のACを検証するテスト
 * @see specs/004-recommend/004-01-recommend-foundation/004-01-04.md
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import { CompositeStorage } from "./composite-storage";
import type {
  PreferenceStorage,
  PreferenceProfile,
  ViewHistory,
  Feedback,
  RecommendationLog,
} from "./types";
import type { SupabaseTagStorage } from "./supabase-tag-storage";

/**
 * ローカルストレージのモックを作成
 */
function createMockLocalStorage(): PreferenceStorage {
  return {
    getProfile: vi.fn(),
    saveProfile: vi.fn(),
    getViewHistory: vi.fn(),
    addViewHistory: vi.fn(),
    getFeedback: vi.fn(),
    getFeedbackByArticle: vi.fn(),
    addFeedback: vi.fn(),
    getRecommendationLog: vi.fn(),
    addRecommendationLog: vi.fn(),
    getDislikedArticleIds: vi.fn(),
    getArticleTags: vi.fn(),
  };
}

/**
 * タグストレージのモックを作成
 */
function createMockTagStorage(tags: string[] = []): SupabaseTagStorage {
  return {
    getArticleTags: vi.fn().mockResolvedValue(tags),
  } as unknown as SupabaseTagStorage;
}

describe("004-01-04: CompositeStorage", () => {
  let mockLocalStorage: PreferenceStorage;
  let mockTagStorage: SupabaseTagStorage;
  let compositeStorage: CompositeStorage;

  beforeEach(() => {
    mockLocalStorage = createMockLocalStorage();
    mockTagStorage = createMockTagStorage(["horror", "euclid"]);
    compositeStorage = new CompositeStorage(mockLocalStorage, mockTagStorage);
  });

  describe("AC4: 既存実装との統合 - タグストレージへの委譲", () => {
    it("getArticleTags が tagStorage に委譲される", async () => {
      // Act
      await compositeStorage.getArticleTags("scp-173");

      // Assert
      expect(mockTagStorage.getArticleTags).toHaveBeenCalledWith("scp-173");
    });

    it("tagStorage から取得したタグ値を返す", async () => {
      // Act
      const tags = await compositeStorage.getArticleTags("scp-173");

      // Assert
      expect(tags).toEqual(["horror", "euclid"]);
    });
  });

  describe("AC6: 設計制約 - インターフェース準拠", () => {
    it("PreferenceStorage インターフェースを実装している", () => {
      // 型レベルでの検証
      const _typeCheck: PreferenceStorage = compositeStorage;
      expect(_typeCheck).toBeDefined();
    });
  });

  describe("ローカルストレージへの委譲", () => {
    it("getProfile が localStorage に委譲される", async () => {
      // Arrange
      const mockProfile: PreferenceProfile = {
        visitorId: "visitor-123",
        tagWeights: { horror: 0.8 },
        objectClassPreference: { Safe: 0.5 },
        createdAt: "2026-01-20T00:00:00Z",
        updatedAt: "2026-01-20T00:00:00Z",
      };
      vi.mocked(mockLocalStorage.getProfile).mockResolvedValue(mockProfile);

      // Act
      const result = await compositeStorage.getProfile("visitor-123");

      // Assert
      expect(mockLocalStorage.getProfile).toHaveBeenCalledWith("visitor-123");
      expect(result).toEqual(mockProfile);
    });

    it("saveProfile が localStorage に委譲される", async () => {
      // Arrange
      const profile: PreferenceProfile = {
        visitorId: "visitor-123",
        tagWeights: { horror: 0.8 },
        objectClassPreference: { Safe: 0.5 },
        createdAt: "2026-01-20T00:00:00Z",
        updatedAt: "2026-01-20T00:00:00Z",
      };

      // Act
      await compositeStorage.saveProfile(profile);

      // Assert
      expect(mockLocalStorage.saveProfile).toHaveBeenCalledWith(profile);
    });

    it("getViewHistory が localStorage に委譲される", async () => {
      // Arrange
      const mockHistory: ViewHistory[] = [
        {
          id: "visitor-123_scp-173_1640000000000",
          visitorId: "visitor-123",
          articleId: "scp-173",
          viewedAt: "2026-01-20T00:00:00Z",
        },
      ];
      vi.mocked(mockLocalStorage.getViewHistory).mockResolvedValue(mockHistory);

      // Act
      const result = await compositeStorage.getViewHistory("visitor-123", 10);

      // Assert
      expect(mockLocalStorage.getViewHistory).toHaveBeenCalledWith("visitor-123", 10);
      expect(result).toEqual(mockHistory);
    });

    it("addViewHistory が localStorage に委譲される", async () => {
      // Arrange
      const history: ViewHistory = {
        id: "visitor-123_scp-173_1640000000000",
        visitorId: "visitor-123",
        articleId: "scp-173",
        viewedAt: "2026-01-20T00:00:00Z",
      };

      // Act
      await compositeStorage.addViewHistory(history);

      // Assert
      expect(mockLocalStorage.addViewHistory).toHaveBeenCalledWith(history);
    });

    it("getFeedback が localStorage に委譲される", async () => {
      // Arrange
      const mockFeedback: Feedback[] = [
        {
          id: "visitor-123_scp-173",
          visitorId: "visitor-123",
          articleId: "scp-173",
          type: "like",
          createdAt: "2026-01-20T00:00:00Z",
        },
      ];
      vi.mocked(mockLocalStorage.getFeedback).mockResolvedValue(mockFeedback);

      // Act
      const result = await compositeStorage.getFeedback("visitor-123");

      // Assert
      expect(mockLocalStorage.getFeedback).toHaveBeenCalledWith("visitor-123");
      expect(result).toEqual(mockFeedback);
    });

    it("getFeedbackByArticle が localStorage に委譲される", async () => {
      // Arrange
      const mockFeedback: Feedback = {
        id: "visitor-123_scp-173",
        visitorId: "visitor-123",
        articleId: "scp-173",
        type: "like",
        createdAt: "2026-01-20T00:00:00Z",
      };
      vi.mocked(mockLocalStorage.getFeedbackByArticle).mockResolvedValue(mockFeedback);

      // Act
      const result = await compositeStorage.getFeedbackByArticle("visitor-123", "scp-173");

      // Assert
      expect(mockLocalStorage.getFeedbackByArticle).toHaveBeenCalledWith("visitor-123", "scp-173");
      expect(result).toEqual(mockFeedback);
    });

    it("addFeedback が localStorage に委譲される", async () => {
      // Arrange
      const feedback: Feedback = {
        id: "visitor-123_scp-173",
        visitorId: "visitor-123",
        articleId: "scp-173",
        type: "like",
        createdAt: "2026-01-20T00:00:00Z",
      };

      // Act
      await compositeStorage.addFeedback(feedback);

      // Assert
      expect(mockLocalStorage.addFeedback).toHaveBeenCalledWith(feedback);
    });

    it("getRecommendationLog が localStorage に委譲される", async () => {
      // Arrange
      const mockLog: RecommendationLog[] = [
        {
          id: "rec-001",
          visitorId: "visitor-123",
          articleId: "scp-173",
          recommendedAt: "2026-01-20T00:00:00Z",
          source: "preference",
          clicked: false,
        },
      ];
      vi.mocked(mockLocalStorage.getRecommendationLog).mockResolvedValue(mockLog);

      // Act
      const result = await compositeStorage.getRecommendationLog("visitor-123", 10);

      // Assert
      expect(mockLocalStorage.getRecommendationLog).toHaveBeenCalledWith("visitor-123", 10);
      expect(result).toEqual(mockLog);
    });

    it("addRecommendationLog が localStorage に委譲される", async () => {
      // Arrange
      const log: RecommendationLog = {
        id: "rec-001",
        visitorId: "visitor-123",
        articleId: "scp-173",
        recommendedAt: "2026-01-20T00:00:00Z",
        source: "preference",
        clicked: false,
      };

      // Act
      await compositeStorage.addRecommendationLog(log);

      // Assert
      expect(mockLocalStorage.addRecommendationLog).toHaveBeenCalledWith(log);
    });

    it("getDislikedArticleIds が localStorage に委譲される", async () => {
      // Arrange
      vi.mocked(mockLocalStorage.getDislikedArticleIds).mockResolvedValue(["scp-173", "scp-682"]);

      // Act
      const result = await compositeStorage.getDislikedArticleIds("visitor-123");

      // Assert
      expect(mockLocalStorage.getDislikedArticleIds).toHaveBeenCalledWith("visitor-123");
      expect(result).toEqual(["scp-173", "scp-682"]);
    });
  });

  describe("エラー処理", () => {
    it("localStorage エラー時に例外を伝播する", async () => {
      // Arrange
      vi.mocked(mockLocalStorage.getProfile).mockRejectedValue(new Error("LocalStorage error"));

      // Act & Assert
      await expect(compositeStorage.getProfile("visitor-123")).rejects.toThrow(
        "LocalStorage error"
      );
    });

    it("tagStorage エラー時に例外を伝播する", async () => {
      // Arrange
      vi.mocked(mockTagStorage.getArticleTags).mockRejectedValue(new Error("Supabase error"));

      // Act & Assert
      await expect(compositeStorage.getArticleTags("scp-173")).rejects.toThrow("Supabase error");
    });
  });
});
