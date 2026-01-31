/**
 * @file 推薦エンジンのテスト
 * @see specs/004-recommend/004-02-recommend-engine/004-02-01.md
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import { RecommendationEngine } from "../engine";
import type {
  PreferenceStorage,
  PreferenceProfile,
  ViewHistory,
  Feedback,
  Favorite,
  RecommendationLog,
} from "../../storage/types";
import type { VectorSearchClient, VectorSearchResult } from "../../search/vector-search-client";

/**
 * モックPreferenceStorageを作成
 */
function createMockStorage(overrides: Partial<PreferenceStorage> = {}): PreferenceStorage {
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
    ...overrides,
  };
}

/**
 * モックVectorSearchClientを作成
 */
function createMockVectorSearch(overrides: Partial<VectorSearchClient> = {}): VectorSearchClient {
  return {
    searchByEmbedding: vi.fn().mockResolvedValue([]),
    getEmbedding: vi.fn().mockResolvedValue(null),
    searchByUnexploredTags: vi.fn().mockResolvedValue([]),
    ...overrides,
  };
}

/**
 * テスト用プロファイルを作成
 */
function createTestProfile(visitorId: string, preferenceEmbedding?: number[]): PreferenceProfile {
  return {
    visitorId,
    tagWeights: {},
    objectClassPreference: {},
    createdAt: "2024-01-01T00:00:00.000Z",
    updatedAt: "2024-01-01T00:00:00.000Z",
    preferenceEmbedding,
    onboardingCompletedAt: preferenceEmbedding ? "2024-01-01T00:00:00.000Z" : undefined,
  };
}

describe("RecommendationEngine", () => {
  const visitorId = "visitor-123";
  const testEmbedding = [0.1, 0.2, 0.3, 0.4, 0.5];

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("getRecommendations", () => {
    it("嗜好ベクトルが存在する場合、類似度の高い記事リストが返る", async () => {
      const mockResults: VectorSearchResult[] = [
        {
          id: "article-1",
          title: "記事1",
          similarity: 0.95,
          url: "http://ja.scp-wiki.net/scp-001",
        },
        {
          id: "article-2",
          title: "記事2",
          similarity: 0.85,
          url: "http://ja.scp-wiki.net/scp-002",
        },
        {
          id: "article-3",
          title: "記事3",
          similarity: 0.75,
          url: "http://ja.scp-wiki.net/scp-003",
        },
      ];

      const storage = createMockStorage({
        getProfile: vi.fn().mockResolvedValue(createTestProfile(visitorId, testEmbedding)),
        getViewHistory: vi.fn().mockResolvedValue([]),
        getFeedback: vi.fn().mockResolvedValue([]),
        getFavorites: vi.fn().mockResolvedValue([]),
      });

      const vectorSearch = createMockVectorSearch({
        searchByEmbedding: vi.fn().mockResolvedValue(mockResults),
        getEmbedding: vi.fn().mockResolvedValue(testEmbedding),
      });

      // explorationRate=0で常に好み推薦（テストの安定性確保）
      const engine = new RecommendationEngine(storage, vectorSearch, {
        recalculateOnRequest: false,
        serendipity: { explorationRate: 0 },
      });
      const recommendations = await engine.getRecommendations(visitorId, 10);

      expect(recommendations).toHaveLength(3);
      expect(recommendations[0]).toEqual({
        id: "article-1",
        title: "記事1",
        similarityScore: 0.95,
        source: "preference",
        url: "http://ja.scp-wiki.net/scp-001",
      });
      expect(recommendations[1].similarityScore).toBe(0.85);
      expect(recommendations[2].similarityScore).toBe(0.75);
    });

    it("嗜好ベクトルが存在しない場合、エラーがスローされる", async () => {
      const storage = createMockStorage({
        getProfile: vi.fn().mockResolvedValue(createTestProfile(visitorId, undefined)),
        getViewHistory: vi.fn().mockResolvedValue([]),
        getFeedback: vi.fn().mockResolvedValue([]),
        getFavorites: vi.fn().mockResolvedValue([]),
      });

      const vectorSearch = createMockVectorSearch();

      const engine = new RecommendationEngine(storage, vectorSearch, {
        recalculateOnRequest: false,
      });

      await expect(engine.getRecommendations(visitorId)).rejects.toThrow(
        "Onboarding not completed: preferenceEmbedding is missing"
      );
    });

    it("既読記事が除外される", async () => {
      const viewHistory: ViewHistory[] = [
        { id: "v1", visitorId, articleId: "read-article", viewedAt: "2024-01-01T00:00:00.000Z" },
      ];

      const storage = createMockStorage({
        getProfile: vi.fn().mockResolvedValue(createTestProfile(visitorId, testEmbedding)),
        getViewHistory: vi.fn().mockResolvedValue(viewHistory),
        getFeedback: vi.fn().mockResolvedValue([]),
        getFavorites: vi.fn().mockResolvedValue([]),
      });

      const vectorSearch = createMockVectorSearch({
        searchByEmbedding: vi.fn().mockResolvedValue([]),
        getEmbedding: vi.fn().mockResolvedValue(testEmbedding),
      });

      const engine = new RecommendationEngine(storage, vectorSearch, {
        recalculateOnRequest: false,
      });
      await engine.getRecommendations(visitorId);

      expect(vectorSearch.searchByEmbedding).toHaveBeenCalledWith(
        expect.objectContaining({
          excludeIds: expect.arrayContaining(["read-article"]),
        })
      );
    });

    it("Dislike済み記事が除外される", async () => {
      const storage = createMockStorage({
        getProfile: vi.fn().mockResolvedValue(createTestProfile(visitorId, testEmbedding)),
        getViewHistory: vi.fn().mockResolvedValue([]),
        getDislikedArticleIds: vi.fn().mockResolvedValue(["disliked-article"]),
        getFeedback: vi.fn().mockResolvedValue([]),
        getFavorites: vi.fn().mockResolvedValue([]),
      });

      const vectorSearch = createMockVectorSearch({
        searchByEmbedding: vi.fn().mockResolvedValue([]),
        getEmbedding: vi.fn().mockResolvedValue(testEmbedding),
      });

      const engine = new RecommendationEngine(storage, vectorSearch, {
        recalculateOnRequest: false,
      });
      await engine.getRecommendations(visitorId);

      expect(vectorSearch.searchByEmbedding).toHaveBeenCalledWith(
        expect.objectContaining({
          excludeIds: expect.arrayContaining(["disliked-article"]),
        })
      );
    });

    it("お気に入り済み記事が除外される", async () => {
      const favorites: Favorite[] = [
        { id: "f1", visitorId, articleId: "favorite-article", addedAt: "2024-01-01T00:00:00.000Z" },
      ];

      const storage = createMockStorage({
        getProfile: vi.fn().mockResolvedValue(createTestProfile(visitorId, testEmbedding)),
        getViewHistory: vi.fn().mockResolvedValue([]),
        getFeedback: vi.fn().mockResolvedValue([]),
        getFavorites: vi.fn().mockResolvedValue(favorites),
      });

      const vectorSearch = createMockVectorSearch({
        searchByEmbedding: vi.fn().mockResolvedValue([]),
        getEmbedding: vi.fn().mockResolvedValue(testEmbedding),
      });

      const engine = new RecommendationEngine(storage, vectorSearch, {
        recalculateOnRequest: false,
      });
      await engine.getRecommendations(visitorId);

      expect(vectorSearch.searchByEmbedding).toHaveBeenCalledWith(
        expect.objectContaining({
          excludeIds: expect.arrayContaining(["favorite-article"]),
        })
      );
    });

    it("推薦リクエスト時に嗜好ベクトルが再計算される", async () => {
      const feedback: Feedback[] = [
        {
          id: "fb1",
          visitorId,
          articleId: "liked-article",
          type: "like",
          createdAt: "2024-01-01T00:00:00.000Z",
        },
      ];
      const profile = createTestProfile(visitorId, testEmbedding);

      const storage = createMockStorage({
        getProfile: vi.fn().mockResolvedValue(profile),
        getViewHistory: vi.fn().mockResolvedValue([]),
        getFeedback: vi.fn().mockResolvedValue(feedback),
        getFavorites: vi.fn().mockResolvedValue([]),
        saveProfile: vi.fn().mockResolvedValue(undefined),
      });

      const vectorSearch = createMockVectorSearch({
        searchByEmbedding: vi.fn().mockResolvedValue([]),
        getEmbedding: vi.fn().mockResolvedValue(testEmbedding),
      });

      const engine = new RecommendationEngine(storage, vectorSearch, {
        recalculateOnRequest: true,
      });
      await engine.getRecommendations(visitorId);

      // 嗜好ベクトル再計算のためにfeedback、viewHistory、favoritesが取得される
      expect(storage.getFeedback).toHaveBeenCalledWith(visitorId);
      expect(storage.getViewHistory).toHaveBeenCalledWith(visitorId);
      expect(storage.getFavorites).toHaveBeenCalledWith(visitorId);
      // getEmbeddingが呼ばれる（liked-articleのEmbeddingを取得）
      expect(vectorSearch.getEmbedding).toHaveBeenCalledWith("liked-article");
    });

    it("プロファイルが存在しない場合、エラーがスローされる", async () => {
      const storage = createMockStorage({
        getProfile: vi.fn().mockResolvedValue(null),
        getViewHistory: vi.fn().mockResolvedValue([]),
        getFeedback: vi.fn().mockResolvedValue([]),
        getFavorites: vi.fn().mockResolvedValue([]),
      });

      const vectorSearch = createMockVectorSearch();

      const engine = new RecommendationEngine(storage, vectorSearch, {
        recalculateOnRequest: false,
      });

      await expect(engine.getRecommendations(visitorId)).rejects.toThrow(
        "Onboarding not completed: preferenceEmbedding is missing"
      );
    });
  });

  describe("recordView", () => {
    it("閲覧履歴が保存される", async () => {
      const storage = createMockStorage();
      const vectorSearch = createMockVectorSearch();

      const engine = new RecommendationEngine(storage, vectorSearch);
      await engine.recordView(visitorId, "article-123");

      expect(storage.addViewHistory).toHaveBeenCalledWith(
        expect.objectContaining({
          visitorId,
          articleId: "article-123",
          viewedAt: expect.any(String),
        })
      );
    });

    it("閲覧履歴IDが正しいフォーマットで生成される", async () => {
      const storage = createMockStorage();
      const vectorSearch = createMockVectorSearch();

      const engine = new RecommendationEngine(storage, vectorSearch);
      await engine.recordView(visitorId, "article-123");

      expect(storage.addViewHistory).toHaveBeenCalledWith(
        expect.objectContaining({
          id: expect.stringMatching(/^visitor-123_article-123_\d+$/),
        })
      );
    });
  });

  describe("recordFeedback", () => {
    it("Likeフィードバックが保存される", async () => {
      const storage = createMockStorage();
      const vectorSearch = createMockVectorSearch();

      const engine = new RecommendationEngine(storage, vectorSearch);
      await engine.recordFeedback(visitorId, "article-123", "like");

      expect(storage.addFeedback).toHaveBeenCalledWith(
        expect.objectContaining({
          visitorId,
          articleId: "article-123",
          type: "like",
          createdAt: expect.any(String),
        })
      );
    });

    it("Dislikeフィードバックが保存される", async () => {
      const storage = createMockStorage();
      const vectorSearch = createMockVectorSearch();

      const engine = new RecommendationEngine(storage, vectorSearch);
      await engine.recordFeedback(visitorId, "article-456", "dislike");

      expect(storage.addFeedback).toHaveBeenCalledWith(
        expect.objectContaining({
          visitorId,
          articleId: "article-456",
          type: "dislike",
        })
      );
    });

    it("フィードバックIDが正しいフォーマットで生成される", async () => {
      const storage = createMockStorage();
      const vectorSearch = createMockVectorSearch();

      const engine = new RecommendationEngine(storage, vectorSearch);
      await engine.recordFeedback(visitorId, "article-123", "like");

      expect(storage.addFeedback).toHaveBeenCalledWith(
        expect.objectContaining({
          id: "visitor-123_article-123",
        })
      );
    });
  });

  describe("セレンディピティ統合", () => {
    it("explorationRate=0の場合、常に好み推薦が返る", async () => {
      const mockResults: VectorSearchResult[] = [
        {
          id: "article-1",
          title: "記事1",
          similarity: 0.95,
          url: "http://ja.scp-wiki.net/scp-001",
        },
      ];

      const storage = createMockStorage({
        getProfile: vi.fn().mockResolvedValue(createTestProfile(visitorId, testEmbedding)),
        getViewHistory: vi.fn().mockResolvedValue([]),
        getFeedback: vi.fn().mockResolvedValue([]),
        getFavorites: vi.fn().mockResolvedValue([]),
      });

      const vectorSearch = createMockVectorSearch({
        searchByEmbedding: vi.fn().mockResolvedValue(mockResults),
        getEmbedding: vi.fn().mockResolvedValue(testEmbedding),
      });

      const engine = new RecommendationEngine(storage, vectorSearch, {
        recalculateOnRequest: false,
        serendipity: { explorationRate: 0 },
      });

      const recommendations = await engine.getRecommendations(visitorId, 10);
      expect(recommendations).toHaveLength(1);
      expect(recommendations[0].source).toBe("preference");
    });

    it("explorationRate=1の場合、常にセレンディピティが返る", async () => {
      const adjacentResults: VectorSearchResult[] = [
        {
          id: "adjacent-1",
          title: "隣接1",
          similarity: 0.5,
          url: "http://ja.scp-wiki.net/adjacent-1",
        },
      ];

      const viewHistory: ViewHistory[] = [
        { id: "v1", visitorId, articleId: "viewed-article", viewedAt: "2024-01-01T00:00:00.000Z" },
      ];

      const storage = createMockStorage({
        getProfile: vi.fn().mockResolvedValue(createTestProfile(visitorId, testEmbedding)),
        getViewHistory: vi.fn().mockResolvedValue(viewHistory),
        getFeedback: vi.fn().mockResolvedValue([]),
        getFavorites: vi.fn().mockResolvedValue([]),
        getArticleTags: vi.fn().mockResolvedValue(["ホラー"]),
      });

      const vectorSearch = createMockVectorSearch({
        searchByEmbedding: vi.fn().mockResolvedValue(adjacentResults),
        searchByUnexploredTags: vi.fn().mockResolvedValue([]),
        getEmbedding: vi.fn().mockResolvedValue(testEmbedding),
      });

      const engine = new RecommendationEngine(storage, vectorSearch, {
        recalculateOnRequest: false,
        serendipity: { explorationRate: 1 },
      });

      const recommendations = await engine.getRecommendations(visitorId, 10);
      expect(recommendations).toHaveLength(1);
      expect(recommendations[0].source).toBe("serendipity");
    });

    it("セレンディピティ時にgetExploredTagsが呼ばれる", async () => {
      const viewHistory: ViewHistory[] = [
        { id: "v1", visitorId, articleId: "article-1", viewedAt: "2024-01-01T00:00:00.000Z" },
        { id: "v2", visitorId, articleId: "article-2", viewedAt: "2024-01-02T00:00:00.000Z" },
      ];

      const storage = createMockStorage({
        getProfile: vi.fn().mockResolvedValue(createTestProfile(visitorId, testEmbedding)),
        getViewHistory: vi.fn().mockResolvedValue(viewHistory),
        getFeedback: vi.fn().mockResolvedValue([]),
        getFavorites: vi.fn().mockResolvedValue([]),
        getArticleTags: vi
          .fn()
          .mockResolvedValueOnce(["ホラー", "Keter"])
          .mockResolvedValueOnce(["ミステリー"]),
      });

      const vectorSearch = createMockVectorSearch({
        searchByEmbedding: vi.fn().mockResolvedValue([]),
        searchByUnexploredTags: vi.fn().mockResolvedValue([]),
        getEmbedding: vi.fn().mockResolvedValue(testEmbedding),
      });

      const engine = new RecommendationEngine(storage, vectorSearch, {
        recalculateOnRequest: false,
        serendipity: { explorationRate: 1 },
      });

      await engine.getRecommendations(visitorId, 10);

      // getArticleTagsが閲覧履歴の記事ごとに呼ばれる
      expect(storage.getArticleTags).toHaveBeenCalledWith("article-1");
      expect(storage.getArticleTags).toHaveBeenCalledWith("article-2");

      // 収集したタグがsearchByUnexploredTagsに渡される
      expect(vectorSearch.searchByUnexploredTags).toHaveBeenCalledWith(
        expect.objectContaining({
          exploredTags: expect.arrayContaining(["ホラー", "Keter", "ミステリー"]),
        })
      );
    });
  });

  describe("連続類似検出", () => {
    /**
     * テスト用の推薦ログを作成
     */
    function createTestLog(
      articleId: string,
      source: "preference" | "serendipity",
      index: number = 0
    ): RecommendationLog {
      return {
        id: `${visitorId}_${articleId}_${Date.now() + index}`,
        visitorId,
        articleId,
        recommendedAt: new Date(Date.now() + index * 1000).toISOString(),
        source,
        clicked: false,
      };
    }

    describe("shouldForceSerendipity", () => {
      it("直近5件が全てpreferenceの場合、trueが返る", async () => {
        const logs: RecommendationLog[] = [
          createTestLog("article-1", "preference", 0),
          createTestLog("article-2", "preference", 1),
          createTestLog("article-3", "preference", 2),
          createTestLog("article-4", "preference", 3),
          createTestLog("article-5", "preference", 4),
        ];

        const storage = createMockStorage({
          getProfile: vi.fn().mockResolvedValue(createTestProfile(visitorId, testEmbedding)),
          getRecommendationLog: vi.fn().mockResolvedValue(logs),
          getViewHistory: vi.fn().mockResolvedValue([]),
          getFeedback: vi.fn().mockResolvedValue([]),
          getFavorites: vi.fn().mockResolvedValue([]),
          getArticleTags: vi.fn().mockResolvedValue(["ホラー"]),
        });

        const serendipityResults: VectorSearchResult[] = [
          {
            id: "serendipity-1",
            title: "冒険記事",
            similarity: 0.6,
            url: "http://ja.scp-wiki.net/serendipity-1",
          },
        ];

        const vectorSearch = createMockVectorSearch({
          searchByEmbedding: vi.fn().mockResolvedValue(serendipityResults),
          searchByUnexploredTags: vi.fn().mockResolvedValue([]),
          getEmbedding: vi.fn().mockResolvedValue(testEmbedding),
        });

        // explorationRate=0でも、連続類似検出で強制的にセレンディピティが返る
        const engine = new RecommendationEngine(storage, vectorSearch, {
          recalculateOnRequest: false,
          serendipity: { explorationRate: 0 },
        });

        const recommendations = await engine.getRecommendations(visitorId);

        expect(recommendations).toHaveLength(1);
        expect(recommendations[0].source).toBe("serendipity");
      });

      it("直近5件にserendipityが含まれる場合、falseが返る", async () => {
        const logs: RecommendationLog[] = [
          createTestLog("article-1", "preference", 0),
          createTestLog("article-2", "serendipity", 1), // 1件含まれる
          createTestLog("article-3", "preference", 2),
          createTestLog("article-4", "preference", 3),
          createTestLog("article-5", "preference", 4),
        ];

        const storage = createMockStorage({
          getProfile: vi.fn().mockResolvedValue(createTestProfile(visitorId, testEmbedding)),
          getRecommendationLog: vi.fn().mockResolvedValue(logs),
          getViewHistory: vi.fn().mockResolvedValue([]),
          getFeedback: vi.fn().mockResolvedValue([]),
          getFavorites: vi.fn().mockResolvedValue([]),
        });

        const preferenceResults: VectorSearchResult[] = [
          {
            id: "pref-1",
            title: "好み記事",
            similarity: 0.9,
            url: "http://ja.scp-wiki.net/pref-1",
          },
        ];

        const vectorSearch = createMockVectorSearch({
          searchByEmbedding: vi.fn().mockResolvedValue(preferenceResults),
          getEmbedding: vi.fn().mockResolvedValue(testEmbedding),
        });

        // explorationRate=0 → 通常は常にpreference
        const engine = new RecommendationEngine(storage, vectorSearch, {
          recalculateOnRequest: false,
          serendipity: { explorationRate: 0 },
        });

        const recommendations = await engine.getRecommendations(visitorId);

        expect(recommendations).toHaveLength(1);
        expect(recommendations[0].source).toBe("preference");
      });

      it("履歴が0件の場合、falseが返る", async () => {
        const storage = createMockStorage({
          getProfile: vi.fn().mockResolvedValue(createTestProfile(visitorId, testEmbedding)),
          getRecommendationLog: vi.fn().mockResolvedValue([]),
          getViewHistory: vi.fn().mockResolvedValue([]),
          getFeedback: vi.fn().mockResolvedValue([]),
          getFavorites: vi.fn().mockResolvedValue([]),
        });

        const preferenceResults: VectorSearchResult[] = [
          {
            id: "pref-1",
            title: "好み記事",
            similarity: 0.9,
            url: "http://ja.scp-wiki.net/pref-1",
          },
        ];

        const vectorSearch = createMockVectorSearch({
          searchByEmbedding: vi.fn().mockResolvedValue(preferenceResults),
          getEmbedding: vi.fn().mockResolvedValue(testEmbedding),
        });

        const engine = new RecommendationEngine(storage, vectorSearch, {
          recalculateOnRequest: false,
          serendipity: { explorationRate: 0 },
        });

        const recommendations = await engine.getRecommendations(visitorId);

        expect(recommendations).toHaveLength(1);
        expect(recommendations[0].source).toBe("preference");
      });

      it("履歴が4件の場合、falseが返る", async () => {
        const logs: RecommendationLog[] = [
          createTestLog("article-1", "preference", 0),
          createTestLog("article-2", "preference", 1),
          createTestLog("article-3", "preference", 2),
          createTestLog("article-4", "preference", 3),
        ];

        const storage = createMockStorage({
          getProfile: vi.fn().mockResolvedValue(createTestProfile(visitorId, testEmbedding)),
          getRecommendationLog: vi.fn().mockResolvedValue(logs),
          getViewHistory: vi.fn().mockResolvedValue([]),
          getFeedback: vi.fn().mockResolvedValue([]),
          getFavorites: vi.fn().mockResolvedValue([]),
        });

        const preferenceResults: VectorSearchResult[] = [
          {
            id: "pref-1",
            title: "好み記事",
            similarity: 0.9,
            url: "http://ja.scp-wiki.net/pref-1",
          },
        ];

        const vectorSearch = createMockVectorSearch({
          searchByEmbedding: vi.fn().mockResolvedValue(preferenceResults),
          getEmbedding: vi.fn().mockResolvedValue(testEmbedding),
        });

        const engine = new RecommendationEngine(storage, vectorSearch, {
          recalculateOnRequest: false,
          serendipity: { explorationRate: 0 },
        });

        const recommendations = await engine.getRecommendations(visitorId);

        expect(recommendations).toHaveLength(1);
        expect(recommendations[0].source).toBe("preference");
      });

      it("履歴が6件以上の場合、直近5件のみ評価される", async () => {
        // 6件目（古い）は preference だが、直近5件は全て preference なので強制発動
        const logs: RecommendationLog[] = [
          createTestLog("article-1", "preference", 0),
          createTestLog("article-2", "preference", 1),
          createTestLog("article-3", "preference", 2),
          createTestLog("article-4", "preference", 3),
          createTestLog("article-5", "preference", 4),
        ];

        const storage = createMockStorage({
          getProfile: vi.fn().mockResolvedValue(createTestProfile(visitorId, testEmbedding)),
          getRecommendationLog: vi.fn().mockResolvedValue(logs),
          getViewHistory: vi.fn().mockResolvedValue([]),
          getFeedback: vi.fn().mockResolvedValue([]),
          getFavorites: vi.fn().mockResolvedValue([]),
          getArticleTags: vi.fn().mockResolvedValue(["ホラー"]),
        });

        const serendipityResults: VectorSearchResult[] = [
          {
            id: "serendipity-1",
            title: "冒険記事",
            similarity: 0.6,
            url: "http://ja.scp-wiki.net/serendipity-1",
          },
        ];

        const vectorSearch = createMockVectorSearch({
          searchByEmbedding: vi.fn().mockResolvedValue(serendipityResults),
          searchByUnexploredTags: vi.fn().mockResolvedValue([]),
          getEmbedding: vi.fn().mockResolvedValue(testEmbedding),
        });

        const engine = new RecommendationEngine(storage, vectorSearch, {
          recalculateOnRequest: false,
          serendipity: { explorationRate: 0 },
        });

        await engine.getRecommendations(visitorId);

        // getRecommendationLogがlimit=5で呼ばれることを検証
        expect(storage.getRecommendationLog).toHaveBeenCalledWith(visitorId, 5);
      });
    });

    describe("recordRecommendation", () => {
      it("preferenceソースの推薦ログが記録される", async () => {
        const storage = createMockStorage();
        const vectorSearch = createMockVectorSearch();

        const engine = new RecommendationEngine(storage, vectorSearch);
        await engine.recordRecommendation(visitorId, "article-1", "preference");

        expect(storage.addRecommendationLog).toHaveBeenCalledWith(
          expect.objectContaining({
            visitorId,
            articleId: "article-1",
            source: "preference",
            clicked: false,
          })
        );
      });

      it("serendipityソースの推薦ログが記録される", async () => {
        const storage = createMockStorage();
        const vectorSearch = createMockVectorSearch();

        const engine = new RecommendationEngine(storage, vectorSearch);
        await engine.recordRecommendation(visitorId, "article-2", "serendipity");

        expect(storage.addRecommendationLog).toHaveBeenCalledWith(
          expect.objectContaining({
            visitorId,
            articleId: "article-2",
            source: "serendipity",
            clicked: false,
          })
        );
      });

      it("ログIDが正しいフォーマットで生成される", async () => {
        const storage = createMockStorage();
        const vectorSearch = createMockVectorSearch();

        const engine = new RecommendationEngine(storage, vectorSearch);
        await engine.recordRecommendation(visitorId, "article-1", "preference");

        expect(storage.addRecommendationLog).toHaveBeenCalledWith(
          expect.objectContaining({
            id: expect.stringMatching(/^visitor-123_article-1_\d+$/),
          })
        );
      });

      it("recommendedAtがISO 8601形式である", async () => {
        const storage = createMockStorage();
        const vectorSearch = createMockVectorSearch();

        const engine = new RecommendationEngine(storage, vectorSearch);
        await engine.recordRecommendation(visitorId, "article-1", "preference");

        expect(storage.addRecommendationLog).toHaveBeenCalledWith(
          expect.objectContaining({
            recommendedAt: expect.stringMatching(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/),
          })
        );
      });
    });

    describe("パターンテスト", () => {
      it("全てserendipity（S,S,S,S,S）の場合、falseが返る", async () => {
        const logs: RecommendationLog[] = [
          createTestLog("article-1", "serendipity", 0),
          createTestLog("article-2", "serendipity", 1),
          createTestLog("article-3", "serendipity", 2),
          createTestLog("article-4", "serendipity", 3),
          createTestLog("article-5", "serendipity", 4),
        ];

        const storage = createMockStorage({
          getProfile: vi.fn().mockResolvedValue(createTestProfile(visitorId, testEmbedding)),
          getRecommendationLog: vi.fn().mockResolvedValue(logs),
          getViewHistory: vi.fn().mockResolvedValue([]),
          getFeedback: vi.fn().mockResolvedValue([]),
          getFavorites: vi.fn().mockResolvedValue([]),
        });

        const preferenceResults: VectorSearchResult[] = [
          {
            id: "pref-1",
            title: "好み記事",
            similarity: 0.9,
            url: "http://ja.scp-wiki.net/pref-1",
          },
        ];

        const vectorSearch = createMockVectorSearch({
          searchByEmbedding: vi.fn().mockResolvedValue(preferenceResults),
          getEmbedding: vi.fn().mockResolvedValue(testEmbedding),
        });

        const engine = new RecommendationEngine(storage, vectorSearch, {
          recalculateOnRequest: false,
          serendipity: { explorationRate: 0 },
        });

        const recommendations = await engine.getRecommendations(visitorId);

        expect(recommendations[0].source).toBe("preference");
      });

      it("最後だけserendipity（P,P,P,P,S）の場合、falseが返る", async () => {
        const logs: RecommendationLog[] = [
          createTestLog("article-1", "preference", 0),
          createTestLog("article-2", "preference", 1),
          createTestLog("article-3", "preference", 2),
          createTestLog("article-4", "preference", 3),
          createTestLog("article-5", "serendipity", 4),
        ];

        const storage = createMockStorage({
          getProfile: vi.fn().mockResolvedValue(createTestProfile(visitorId, testEmbedding)),
          getRecommendationLog: vi.fn().mockResolvedValue(logs),
          getViewHistory: vi.fn().mockResolvedValue([]),
          getFeedback: vi.fn().mockResolvedValue([]),
          getFavorites: vi.fn().mockResolvedValue([]),
        });

        const preferenceResults: VectorSearchResult[] = [
          {
            id: "pref-1",
            title: "好み記事",
            similarity: 0.9,
            url: "http://ja.scp-wiki.net/pref-1",
          },
        ];

        const vectorSearch = createMockVectorSearch({
          searchByEmbedding: vi.fn().mockResolvedValue(preferenceResults),
          getEmbedding: vi.fn().mockResolvedValue(testEmbedding),
        });

        const engine = new RecommendationEngine(storage, vectorSearch, {
          recalculateOnRequest: false,
          serendipity: { explorationRate: 0 },
        });

        const recommendations = await engine.getRecommendations(visitorId);

        expect(recommendations[0].source).toBe("preference");
      });

      it("中間にserendipity（P,P,S,P,P）の場合、falseが返る", async () => {
        const logs: RecommendationLog[] = [
          createTestLog("article-1", "preference", 0),
          createTestLog("article-2", "preference", 1),
          createTestLog("article-3", "serendipity", 2),
          createTestLog("article-4", "preference", 3),
          createTestLog("article-5", "preference", 4),
        ];

        const storage = createMockStorage({
          getProfile: vi.fn().mockResolvedValue(createTestProfile(visitorId, testEmbedding)),
          getRecommendationLog: vi.fn().mockResolvedValue(logs),
          getViewHistory: vi.fn().mockResolvedValue([]),
          getFeedback: vi.fn().mockResolvedValue([]),
          getFavorites: vi.fn().mockResolvedValue([]),
        });

        const preferenceResults: VectorSearchResult[] = [
          {
            id: "pref-1",
            title: "好み記事",
            similarity: 0.9,
            url: "http://ja.scp-wiki.net/pref-1",
          },
        ];

        const vectorSearch = createMockVectorSearch({
          searchByEmbedding: vi.fn().mockResolvedValue(preferenceResults),
          getEmbedding: vi.fn().mockResolvedValue(testEmbedding),
        });

        const engine = new RecommendationEngine(storage, vectorSearch, {
          recalculateOnRequest: false,
          serendipity: { explorationRate: 0 },
        });

        const recommendations = await engine.getRecommendations(visitorId);

        expect(recommendations[0].source).toBe("preference");
      });
    });
  });
});
