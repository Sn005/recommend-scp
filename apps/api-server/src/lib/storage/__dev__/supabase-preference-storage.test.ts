/**
 * @file SupabasePreferenceStorage テスト
 * @description PreferenceStorageインターフェースのSupabase実装のテスト
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import type { SupabaseClient } from "@supabase/supabase-js";
import { SupabasePreferenceStorage } from "../supabase-preference-storage";
import type {
  PreferenceProfile,
  ViewHistory,
  Feedback,
  RecommendationLog,
  Favorite,
} from "@recommend-scp/shared/storage/server";

// モックデータ
const mockVisitorRow = {
  visitor_id: "visitor-123",
  tag_weights: { horror: 0.8, safe: 0.2 },
  object_class_preference: { euclid: 0.7 },
  starter_pack: "horror",
  onboarding_completed_at: "2025-01-20T10:00:00Z",
  preference_vector: [0.1, 0.2, 0.3],
  created_at: "2025-01-01T00:00:00Z",
  updated_at: "2025-01-20T10:00:00Z",
};

const mockMinimalVisitorRow = {
  visitor_id: "visitor-456",
  tag_weights: {},
  object_class_preference: {},
  starter_pack: null,
  onboarding_completed_at: null,
  preference_vector: null,
  created_at: "2025-01-01T00:00:00Z",
  updated_at: "2025-01-01T00:00:00Z",
};

const mockViewHistoryRows = [
  {
    id: "uuid-1",
    visitor_id: "visitor-123",
    article_id: "SCP-173",
    viewed_at: "2025-01-20T12:00:00Z",
    duration: 120,
  },
  {
    id: "uuid-2",
    visitor_id: "visitor-123",
    article_id: "SCP-096",
    viewed_at: "2025-01-19T10:00:00Z",
    duration: 90,
  },
];

const mockFeedbackRows = [
  {
    id: "uuid-1",
    visitor_id: "visitor-123",
    article_id: "SCP-173",
    type: "like",
    created_at: "2025-01-20T10:00:00Z",
  },
  {
    id: "uuid-2",
    visitor_id: "visitor-123",
    article_id: "SCP-096",
    type: "dislike",
    created_at: "2025-01-19T10:00:00Z",
  },
];

const mockRecommendationLogRows = [
  {
    id: "uuid-1",
    visitor_id: "visitor-123",
    article_id: "SCP-173",
    source: "preference",
    recommended_at: "2025-01-20T12:00:00Z",
    clicked: true,
  },
  {
    id: "uuid-2",
    visitor_id: "visitor-123",
    article_id: "SCP-096",
    source: "serendipity",
    recommended_at: "2025-01-19T10:00:00Z",
    clicked: false,
  },
];

const mockFavoriteRows = [
  {
    id: "uuid-1",
    visitor_id: "visitor-123",
    article_id: "SCP-173",
    added_at: "2025-01-20T12:00:00Z",
  },
  {
    id: "uuid-2",
    visitor_id: "visitor-123",
    article_id: "SCP-096",
    added_at: "2025-01-19T10:00:00Z",
  },
];

// Supabaseクエリビルダーのモック作成ヘルパー
const createQueryMock = (result: { data: unknown; error: unknown }) => ({
  select: vi.fn().mockReturnValue({
    eq: vi.fn().mockReturnValue({
      single: vi.fn().mockResolvedValue(result),
      eq: vi.fn().mockReturnValue({
        single: vi.fn().mockResolvedValue(result),
      }),
      order: vi.fn().mockReturnValue({
        limit: vi.fn().mockResolvedValue(result),
      }),
    }),
  }),
  insert: vi.fn().mockResolvedValue(result),
  upsert: vi.fn().mockResolvedValue(result),
  delete: vi.fn().mockReturnValue({
    eq: vi.fn().mockReturnValue({
      eq: vi.fn().mockResolvedValue(result),
    }),
  }),
});

describe("SupabasePreferenceStorage", () => {
  let storage: SupabasePreferenceStorage;
  let mockSupabase: SupabaseClient;
  let mockFrom: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    vi.clearAllMocks();
    mockFrom = vi.fn();
    mockSupabase = {
      from: mockFrom,
    } as unknown as SupabaseClient;
    storage = new SupabasePreferenceStorage(mockSupabase);
  });

  describe("インターフェース準拠", () => {
    it("PreferenceStorageインターフェースの全メソッドを実装している", () => {
      expect(typeof storage.getProfile).toBe("function");
      expect(typeof storage.saveProfile).toBe("function");
      expect(typeof storage.getViewHistory).toBe("function");
      expect(typeof storage.addViewHistory).toBe("function");
      expect(typeof storage.getFeedback).toBe("function");
      expect(typeof storage.getFeedbackByArticle).toBe("function");
      expect(typeof storage.addFeedback).toBe("function");
      expect(typeof storage.getRecommendationLog).toBe("function");
      expect(typeof storage.addRecommendationLog).toBe("function");
      expect(typeof storage.getDislikedArticleIds).toBe("function");
      expect(typeof storage.getArticleTags).toBe("function");
      expect(typeof storage.getFavorites).toBe("function");
      expect(typeof storage.addFavorite).toBe("function");
      expect(typeof storage.removeFavorite).toBe("function");
    });
  });

  describe("getProfile", () => {
    it("存在するvisitorIdでプロファイルを取得できる", async () => {
      const queryMock = createQueryMock({ data: mockVisitorRow, error: null });
      mockFrom.mockReturnValue(queryMock);

      const profile = await storage.getProfile("visitor-123");

      expect(profile).toEqual({
        visitorId: "visitor-123",
        tagWeights: { horror: 0.8, safe: 0.2 },
        objectClassPreference: { euclid: 0.7 },
        starterPack: "horror",
        onboardingCompletedAt: "2025-01-20T10:00:00Z",
        preferenceEmbedding: [0.1, 0.2, 0.3],
        createdAt: "2025-01-01T00:00:00Z",
        updatedAt: "2025-01-20T10:00:00Z",
      });
      expect(mockFrom).toHaveBeenCalledWith("visitors");
    });

    it("存在しないvisitorIdでnullを返す", async () => {
      const queryMock = createQueryMock({
        data: null,
        error: { message: "Not found" },
      });
      mockFrom.mockReturnValue(queryMock);

      const profile = await storage.getProfile("nonexistent");

      expect(profile).toBeNull();
    });

    it("オプショナルフィールドがnullの場合も正しく変換される", async () => {
      const queryMock = createQueryMock({
        data: mockMinimalVisitorRow,
        error: null,
      });
      mockFrom.mockReturnValue(queryMock);

      const profile = await storage.getProfile("visitor-456");

      expect(profile).toEqual({
        visitorId: "visitor-456",
        tagWeights: {},
        objectClassPreference: {},
        starterPack: undefined,
        onboardingCompletedAt: undefined,
        preferenceEmbedding: undefined,
        createdAt: "2025-01-01T00:00:00Z",
        updatedAt: "2025-01-01T00:00:00Z",
      });
    });
  });

  describe("saveProfile", () => {
    it("新規プロファイルを保存できる", async () => {
      const queryMock = createQueryMock({ data: null, error: null });
      mockFrom.mockReturnValue(queryMock);

      const profile: PreferenceProfile = {
        visitorId: "visitor-123",
        tagWeights: { horror: 0.8 },
        objectClassPreference: { euclid: 0.7 },
        starterPack: "horror",
        onboardingCompletedAt: "2025-01-20T10:00:00Z",
        preferenceEmbedding: [0.1, 0.2],
        createdAt: "2025-01-01T00:00:00Z",
        updatedAt: "2025-01-20T10:00:00Z",
      };

      await expect(storage.saveProfile(profile)).resolves.not.toThrow();

      expect(mockFrom).toHaveBeenCalledWith("visitors");
      expect(queryMock.upsert).toHaveBeenCalledWith(
        expect.objectContaining({
          visitor_id: "visitor-123",
          tag_weights: { horror: 0.8 },
          object_class_preference: { euclid: 0.7 },
          starter_pack: "horror",
          onboarding_completed_at: "2025-01-20T10:00:00Z",
          preference_vector: [0.1, 0.2],
        }),
        { onConflict: "visitor_id" }
      );
    });

    it("DBエラー時に例外をスローする", async () => {
      const queryMock = createQueryMock({
        data: null,
        error: { message: "DB Error" },
      });
      mockFrom.mockReturnValue(queryMock);

      const profile: PreferenceProfile = {
        visitorId: "visitor-123",
        tagWeights: {},
        objectClassPreference: {},
        createdAt: "2025-01-01T00:00:00Z",
        updatedAt: "2025-01-20T10:00:00Z",
      };

      await expect(storage.saveProfile(profile)).rejects.toThrow();
    });
  });

  describe("getViewHistory", () => {
    it("閲覧履歴をviewed_at降順で取得できる", async () => {
      const selectMock = vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          order: vi.fn().mockResolvedValue({
            data: mockViewHistoryRows,
            error: null,
          }),
        }),
      });
      mockFrom.mockReturnValue({ select: selectMock });

      const history = await storage.getViewHistory("visitor-123");

      expect(history).toHaveLength(2);
      expect(history[0].viewedAt).toBe("2025-01-20T12:00:00Z");
      expect(history[1].viewedAt).toBe("2025-01-19T10:00:00Z");
    });

    it("limitパラメータで取得件数を制限できる", async () => {
      const limitMock = vi.fn().mockResolvedValue({
        data: [mockViewHistoryRows[0]],
        error: null,
      });
      const orderMock = vi.fn().mockReturnValue({ limit: limitMock });
      mockFrom.mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            order: orderMock,
          }),
        }),
      });

      const history = await storage.getViewHistory("visitor-123", 1);

      expect(history).toHaveLength(1);
      expect(limitMock).toHaveBeenCalledWith(1);
    });

    it("履歴が0件の場合は空配列を返す", async () => {
      mockFrom.mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            order: vi.fn().mockResolvedValue({ data: [], error: null }),
          }),
        }),
      });

      const history = await storage.getViewHistory("visitor-123");

      expect(history).toEqual([]);
    });
  });

  describe("addViewHistory", () => {
    it("閲覧履歴を追加できる", async () => {
      const queryMock = createQueryMock({ data: null, error: null });
      mockFrom.mockReturnValue(queryMock);

      const history: ViewHistory = {
        id: "visitor-123_SCP-173_1705752000000",
        visitorId: "visitor-123",
        articleId: "SCP-173",
        viewedAt: "2025-01-20T10:00:00Z",
        duration: 120,
      };

      await expect(storage.addViewHistory(history)).resolves.not.toThrow();
      expect(mockFrom).toHaveBeenCalledWith("view_history");
    });
  });

  describe("getFeedback", () => {
    it("全フィードバックを取得できる", async () => {
      mockFrom.mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockResolvedValue({
            data: mockFeedbackRows,
            error: null,
          }),
        }),
      });

      const feedback = await storage.getFeedback("visitor-123");

      expect(feedback).toHaveLength(2);
      expect(feedback[0].type).toBe("like");
      expect(feedback[1].type).toBe("dislike");
    });
  });

  describe("getFeedbackByArticle", () => {
    it("特定記事のフィードバックを取得できる", async () => {
      const singleMock = vi.fn().mockResolvedValue({
        data: mockFeedbackRows[0],
        error: null,
      });
      mockFrom.mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              single: singleMock,
            }),
          }),
        }),
      });

      const feedback = await storage.getFeedbackByArticle("visitor-123", "SCP-173");

      expect(feedback).not.toBeNull();
      expect(feedback?.articleId).toBe("SCP-173");
      expect(feedback?.type).toBe("like");
    });

    it("フィードバックが存在しない場合はnullを返す", async () => {
      mockFrom.mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              single: vi.fn().mockResolvedValue({
                data: null,
                error: { message: "Not found" },
              }),
            }),
          }),
        }),
      });

      const feedback = await storage.getFeedbackByArticle("visitor-123", "SCP-NONEXISTENT");

      expect(feedback).toBeNull();
    });
  });

  describe("addFeedback", () => {
    it("新規フィードバックを追加できる", async () => {
      const upsertMock = vi.fn().mockResolvedValue({ error: null });
      mockFrom.mockReturnValue({ upsert: upsertMock });

      const feedback: Feedback = {
        id: "visitor-123_SCP-173",
        visitorId: "visitor-123",
        articleId: "SCP-173",
        type: "like",
        createdAt: "2025-01-20T10:00:00Z",
      };

      await expect(storage.addFeedback(feedback)).resolves.not.toThrow();
      expect(upsertMock).toHaveBeenCalledWith(
        {
          visitor_id: "visitor-123",
          article_id: "SCP-173",
          type: "like",
          created_at: "2025-01-20T10:00:00Z",
        },
        { onConflict: "visitor_id,article_id" }
      );
    });

    it("同じvisitorId + articleIdの既存フィードバックを上書きできる（UPSERT）", async () => {
      const upsertMock = vi.fn().mockResolvedValue({ error: null });
      mockFrom.mockReturnValue({ upsert: upsertMock });

      const feedback1: Feedback = {
        id: "visitor-123_SCP-173",
        visitorId: "visitor-123",
        articleId: "SCP-173",
        type: "like",
        createdAt: "2025-01-20T10:00:00Z",
      };

      const feedback2: Feedback = {
        ...feedback1,
        type: "dislike",
      };

      await storage.addFeedback(feedback1);
      await storage.addFeedback(feedback2);

      expect(upsertMock).toHaveBeenCalledTimes(2);
      expect(upsertMock).toHaveBeenLastCalledWith(expect.objectContaining({ type: "dislike" }), {
        onConflict: "visitor_id,article_id",
      });
    });
  });

  describe("getRecommendationLog", () => {
    it("推薦ログをrecommended_at降順で取得できる", async () => {
      mockFrom.mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            order: vi.fn().mockResolvedValue({
              data: mockRecommendationLogRows,
              error: null,
            }),
          }),
        }),
      });

      const logs = await storage.getRecommendationLog("visitor-123");

      expect(logs).toHaveLength(2);
      expect(logs[0].recommendedAt).toBe("2025-01-20T12:00:00Z");
      expect(logs[1].recommendedAt).toBe("2025-01-19T10:00:00Z");
    });

    it("limitパラメータで件数制限できる", async () => {
      const limitMock = vi.fn().mockResolvedValue({
        data: [mockRecommendationLogRows[0]],
        error: null,
      });
      mockFrom.mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            order: vi.fn().mockReturnValue({ limit: limitMock }),
          }),
        }),
      });

      const logs = await storage.getRecommendationLog("visitor-123", 1);

      expect(logs).toHaveLength(1);
      expect(limitMock).toHaveBeenCalledWith(1);
    });
  });

  describe("addRecommendationLog", () => {
    it("推薦ログを追加できる", async () => {
      const insertMock = vi.fn().mockResolvedValue({ error: null });
      mockFrom.mockReturnValue({ insert: insertMock });

      const log: RecommendationLog = {
        id: "uuid-1",
        visitorId: "visitor-123",
        articleId: "SCP-173",
        source: "preference",
        recommendedAt: "2025-01-20T12:00:00Z",
        clicked: false,
      };

      await expect(storage.addRecommendationLog(log)).resolves.not.toThrow();
      expect(insertMock).toHaveBeenCalledWith({
        visitor_id: "visitor-123",
        article_id: "SCP-173",
        source: "preference",
        recommended_at: "2025-01-20T12:00:00Z",
        clicked: false,
      });
    });
  });

  describe("getDislikedArticleIds", () => {
    it("type='dislike'のarticle_idリストを取得できる", async () => {
      const dislikeRows = [{ article_id: "SCP-173" }, { article_id: "SCP-096" }];
      mockFrom.mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            eq: vi.fn().mockResolvedValue({ data: dislikeRows, error: null }),
          }),
        }),
      });

      const articleIds = await storage.getDislikedArticleIds("visitor-123");

      expect(articleIds).toEqual(["SCP-173", "SCP-096"]);
    });

    it("dislikeが0件の場合は空配列を返す", async () => {
      mockFrom.mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            eq: vi.fn().mockResolvedValue({ data: [], error: null }),
          }),
        }),
      });

      const articleIds = await storage.getDislikedArticleIds("visitor-123");

      expect(articleIds).toEqual([]);
    });
  });

  describe("getArticleTags", () => {
    it("記事のタグ配列を取得できる", async () => {
      const mockRow = { tags: ["horror", "safe", "alive"] };
      mockFrom.mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({ data: mockRow, error: null }),
          }),
        }),
      });

      const tags = await storage.getArticleTags("SCP-173");

      expect(tags).toEqual(["horror", "safe", "alive"]);
    });

    it("記事が存在しない場合はnullを返す", async () => {
      mockFrom.mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({
              data: null,
              error: { message: "Not found" },
            }),
          }),
        }),
      });

      const tags = await storage.getArticleTags("SCP-NONEXISTENT");

      expect(tags).toBeNull();
    });

    it("tagsフィールドがnullの場合は空配列を返す", async () => {
      mockFrom.mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({
              data: { tags: null },
              error: null,
            }),
          }),
        }),
      });

      const tags = await storage.getArticleTags("SCP-173");

      expect(tags).toEqual([]);
    });
  });

  describe("getFavorites", () => {
    it("お気に入りをadded_at降順で取得できる", async () => {
      mockFrom.mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            order: vi.fn().mockResolvedValue({
              data: mockFavoriteRows,
              error: null,
            }),
          }),
        }),
      });

      const favorites = await storage.getFavorites("visitor-123");

      expect(favorites).toHaveLength(2);
      expect(favorites[0].addedAt).toBe("2025-01-20T12:00:00Z");
      expect(favorites[1].addedAt).toBe("2025-01-19T10:00:00Z");
    });

    it("お気に入りが0件の場合は空配列を返す", async () => {
      mockFrom.mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            order: vi.fn().mockResolvedValue({ data: [], error: null }),
          }),
        }),
      });

      const favorites = await storage.getFavorites("visitor-123");

      expect(favorites).toEqual([]);
    });
  });

  describe("addFavorite", () => {
    it("お気に入りを追加できる", async () => {
      const upsertMock = vi.fn().mockResolvedValue({ error: null });
      mockFrom.mockReturnValue({ upsert: upsertMock });

      const favorite: Favorite = {
        id: "visitor-123_SCP-173",
        visitorId: "visitor-123",
        articleId: "SCP-173",
        addedAt: "2025-01-20T10:00:00Z",
      };

      await expect(storage.addFavorite(favorite)).resolves.not.toThrow();
      expect(upsertMock).toHaveBeenCalledWith(
        {
          visitor_id: "visitor-123",
          article_id: "SCP-173",
          added_at: "2025-01-20T10:00:00Z",
        },
        { onConflict: "visitor_id,article_id" }
      );
    });
  });

  describe("removeFavorite", () => {
    it("お気に入りを解除できる", async () => {
      const eqArticleMock = vi.fn().mockResolvedValue({ error: null });
      const eqVisitorMock = vi.fn().mockReturnValue({ eq: eqArticleMock });
      const deleteMock = vi.fn().mockReturnValue({ eq: eqVisitorMock });
      mockFrom.mockReturnValue({ delete: deleteMock });

      await expect(storage.removeFavorite("visitor-123", "SCP-173")).resolves.not.toThrow();

      expect(mockFrom).toHaveBeenCalledWith("favorites");
      expect(eqVisitorMock).toHaveBeenCalledWith("visitor_id", "visitor-123");
      expect(eqArticleMock).toHaveBeenCalledWith("article_id", "SCP-173");
    });
  });
});
