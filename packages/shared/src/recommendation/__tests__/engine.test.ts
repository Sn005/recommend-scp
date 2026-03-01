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
    getArticleTags: vi.fn().mockResolvedValue(null),
    getArticleTagsBatch: vi.fn().mockResolvedValue(new Map()),
    getFavorites: vi.fn().mockResolvedValue([]),
    addFavorite: vi.fn().mockResolvedValue(undefined),
    removeFavorite: vi.fn().mockResolvedValue(undefined),
    resetPreference: vi.fn().mockResolvedValue(undefined),
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
    getEmbeddings: vi.fn().mockResolvedValue(new Map()),
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
        searchByEmbedding: vi.fn().mockResolvedValueOnce(mockResults).mockResolvedValue([]),
        getEmbedding: vi.fn().mockResolvedValue(testEmbedding),
      });

      // explorationRate=0で常に好み推薦（テストの安定性確保）
      const engine = new RecommendationEngine(storage, vectorSearch, {
        recalculateOnRequest: false,
        serendipity: { explorationRate: 0 },
      });
      const recommendations = await engine.getRecommendations(visitorId, 10);

      // 3件のみ返却（フォールバックのセレンディピティも0件）
      expect(recommendations).toHaveLength(3);
      // シャッフルにより順序は不定だが、全記事が含まれマッピングが正しいことを確認
      const ids = recommendations.map((r) => r.id).sort();
      expect(ids).toEqual(["article-1", "article-2", "article-3"]);

      const article1 = recommendations.find((r) => r.id === "article-1")!;
      expect(article1).toEqual({
        id: "article-1",
        title: "記事1",
        similarityScore: 0.95,
        source: "preference",
        url: "http://ja.scp-wiki.net/scp-001",
        objectClass: null,
        rating: null,
      });

      const scores = recommendations.map((r) => r.similarityScore).sort((a, b) => b - a);
      expect(scores).toEqual([0.95, 0.85, 0.75]);
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

    it("フィードバック済み記事が除外される", async () => {
      const storage = createMockStorage({
        getProfile: vi.fn().mockResolvedValue(createTestProfile(visitorId, testEmbedding)),
        getViewHistory: vi.fn().mockResolvedValue([]),
        getFeedback: vi.fn().mockResolvedValue([
          {
            id: "fb1",
            visitorId,
            articleId: "feedback-article",
            type: "next",
            createdAt: "2024-01-01T00:00:00.000Z",
          },
        ]),
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
          excludeIds: expect.arrayContaining(["feedback-article"]),
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
      expect(storage.getViewHistory).toHaveBeenCalledWith(visitorId, 200);
      expect(storage.getFavorites).toHaveBeenCalledWith(visitorId);
      // getEmbeddingsがバッチ呼び出しされる（liked-articleのEmbeddingを取得）
      expect(vectorSearch.getEmbeddings).toHaveBeenCalledWith(["liked-article"]);
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
        searchByEmbedding: vi.fn().mockResolvedValueOnce(mockResults).mockResolvedValue([]),
        getEmbedding: vi.fn().mockResolvedValue(testEmbedding),
      });

      const engine = new RecommendationEngine(storage, vectorSearch, {
        recalculateOnRequest: false,
        serendipity: { explorationRate: 0 },
      });

      const recommendations = await engine.getRecommendations(visitorId, 10);
      // フォールバック（セレンディピティ）も0件のため、プリファレンス1件のみ
      expect(recommendations.filter((r) => r.source === "preference")).toHaveLength(1);
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
        // 1回目: セレンディピティ adjacent、2回目: フォールバック preference → 空
        searchByEmbedding: vi.fn().mockResolvedValueOnce(adjacentResults).mockResolvedValue([]),
        searchByUnexploredTags: vi.fn().mockResolvedValue([]),
        getEmbedding: vi.fn().mockResolvedValue(testEmbedding),
      });

      const engine = new RecommendationEngine(storage, vectorSearch, {
        recalculateOnRequest: false,
        serendipity: { explorationRate: 1 },
      });

      const recommendations = await engine.getRecommendations(visitorId, 10);
      // フォールバック（プリファレンス）が0件のため、セレンディピティ1件のみ
      expect(recommendations.filter((r) => r.source === "serendipity")).toHaveLength(1);
      expect(recommendations[0].source).toBe("serendipity");
    });

    it("セレンディピティ時にgetExploredTagsが呼ばれる", async () => {
      const viewHistory: ViewHistory[] = [
        { id: "v1", visitorId, articleId: "article-1", viewedAt: "2024-01-01T00:00:00.000Z" },
        { id: "v2", visitorId, articleId: "article-2", viewedAt: "2024-01-02T00:00:00.000Z" },
      ];

      const tagMap = new Map<string, string[]>([
        ["article-1", ["ホラー", "Keter"]],
        ["article-2", ["ミステリー"]],
      ]);

      const storage = createMockStorage({
        getProfile: vi.fn().mockResolvedValue(createTestProfile(visitorId, testEmbedding)),
        getViewHistory: vi.fn().mockResolvedValue(viewHistory),
        getFeedback: vi.fn().mockResolvedValue([]),
        getFavorites: vi.fn().mockResolvedValue([]),
        getArticleTagsBatch: vi.fn().mockResolvedValue(tagMap),
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

      // getArticleTagsBatchがバッチ呼び出しされる
      expect(storage.getArticleTagsBatch).toHaveBeenCalledWith(["article-1", "article-2"]);

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
          // 1回目: セレンディピティ adjacent、2回目: フォールバック preference → 空
          searchByEmbedding: vi
            .fn()
            .mockResolvedValueOnce(serendipityResults)
            .mockResolvedValue([]),
          searchByUnexploredTags: vi.fn().mockResolvedValue([]),
          getEmbedding: vi.fn().mockResolvedValue(testEmbedding),
        });

        // explorationRate=0でも、連続類似検出で強制的にセレンディピティが返る
        const engine = new RecommendationEngine(storage, vectorSearch, {
          recalculateOnRequest: false,
          serendipity: { explorationRate: 0 },
        });

        const recommendations = await engine.getRecommendations(visitorId);

        expect(recommendations.filter((r) => r.source === "serendipity")).toHaveLength(1);
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
          searchByEmbedding: vi.fn().mockResolvedValueOnce(preferenceResults).mockResolvedValue([]),
          getEmbedding: vi.fn().mockResolvedValue(testEmbedding),
        });

        // explorationRate=0 → 通常は常にpreference
        const engine = new RecommendationEngine(storage, vectorSearch, {
          recalculateOnRequest: false,
          serendipity: { explorationRate: 0 },
        });

        const recommendations = await engine.getRecommendations(visitorId);

        expect(recommendations.filter((r) => r.source === "preference")).toHaveLength(1);
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
          searchByEmbedding: vi.fn().mockResolvedValueOnce(preferenceResults).mockResolvedValue([]),
          getEmbedding: vi.fn().mockResolvedValue(testEmbedding),
        });

        const engine = new RecommendationEngine(storage, vectorSearch, {
          recalculateOnRequest: false,
          serendipity: { explorationRate: 0 },
        });

        const recommendations = await engine.getRecommendations(visitorId);

        expect(recommendations.filter((r) => r.source === "preference")).toHaveLength(1);
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
          searchByEmbedding: vi.fn().mockResolvedValueOnce(preferenceResults).mockResolvedValue([]),
          getEmbedding: vi.fn().mockResolvedValue(testEmbedding),
        });

        const engine = new RecommendationEngine(storage, vectorSearch, {
          recalculateOnRequest: false,
          serendipity: { explorationRate: 0 },
        });

        const recommendations = await engine.getRecommendations(visitorId);

        expect(recommendations.filter((r) => r.source === "preference")).toHaveLength(1);
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
          searchByEmbedding: vi
            .fn()
            .mockResolvedValueOnce(serendipityResults)
            .mockResolvedValue([]),
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
          searchByEmbedding: vi.fn().mockResolvedValueOnce(preferenceResults).mockResolvedValue([]),
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
          searchByEmbedding: vi.fn().mockResolvedValueOnce(preferenceResults).mockResolvedValue([]),
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
          searchByEmbedding: vi.fn().mockResolvedValueOnce(preferenceResults).mockResolvedValue([]),
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

  describe("フォールバック補充", () => {
    it("セレンディピティ不足時にプリファレンスでフォールバックする", async () => {
      const serendipityResults: VectorSearchResult[] = [
        {
          id: "serendipity-1",
          title: "冒険記事1",
          similarity: 0.5,
          url: "http://ja.scp-wiki.net/serendipity-1",
        },
        {
          id: "serendipity-2",
          title: "冒険記事2",
          similarity: 0.6,
          url: "http://ja.scp-wiki.net/serendipity-2",
        },
      ];

      const preferenceResults: VectorSearchResult[] = Array.from({ length: 8 }, (_, i) => ({
        id: `pref-${i}`,
        title: `好み記事${i}`,
        similarity: 0.9 - i * 0.01,
        url: `http://ja.scp-wiki.net/pref-${i}`,
      }));

      const storage = createMockStorage({
        getProfile: vi.fn().mockResolvedValue(createTestProfile(visitorId, testEmbedding)),
        getViewHistory: vi.fn().mockResolvedValue([]),
        getFeedback: vi.fn().mockResolvedValue([]),
        getFavorites: vi.fn().mockResolvedValue([]),
        getArticleTags: vi.fn().mockResolvedValue(["ホラー"]),
      });

      const vectorSearch = createMockVectorSearch({
        // 1回目: セレンディピティ adjacent (2件)
        // 2回目: セレンディピティ backfill adjacent (空 → backfillできず)
        // 3回目以降: エンジンフォールバック preference
        searchByEmbedding: vi
          .fn()
          .mockResolvedValueOnce(serendipityResults) // adjacent
          .mockResolvedValueOnce([]) // backfill adjacent (empty)
          .mockResolvedValue(preferenceResults), // engine fallback preference
        searchByUnexploredTags: vi.fn().mockResolvedValue([]),
        getEmbedding: vi.fn().mockResolvedValue(testEmbedding),
      });

      const engine = new RecommendationEngine(storage, vectorSearch, {
        recalculateOnRequest: false,
        serendipity: { explorationRate: 1 },
        relaxation: { maxRelaxationLevels: 0 },
      });

      const recommendations = await engine.getRecommendations(visitorId, 10);

      // セレンディピティ2件 + プリファレンス8件 = 10件
      const serendipityCount = recommendations.filter((r) => r.source === "serendipity").length;
      const preferenceCount = recommendations.filter((r) => r.source === "preference").length;
      expect(serendipityCount).toBe(2);
      expect(preferenceCount).toBe(8);
      expect(recommendations).toHaveLength(10);
    });

    it("フォールバック時にプライマリ結果IDが除外される", async () => {
      const serendipityResults: VectorSearchResult[] = [
        {
          id: "serendipity-1",
          title: "冒険記事",
          similarity: 0.5,
          url: "http://ja.scp-wiki.net/serendipity-1",
        },
      ];

      const storage = createMockStorage({
        getProfile: vi.fn().mockResolvedValue(createTestProfile(visitorId, testEmbedding)),
        getViewHistory: vi.fn().mockResolvedValue([]),
        getFeedback: vi.fn().mockResolvedValue([]),
        getFavorites: vi.fn().mockResolvedValue([]),
        getArticleTags: vi.fn().mockResolvedValue(["ホラー"]),
      });

      const vectorSearch = createMockVectorSearch({
        searchByEmbedding: vi
          .fn()
          .mockResolvedValueOnce(serendipityResults) // adjacent
          .mockResolvedValue([]), // fallback preference
        searchByUnexploredTags: vi.fn().mockResolvedValue([]),
        getEmbedding: vi.fn().mockResolvedValue(testEmbedding),
      });

      const engine = new RecommendationEngine(storage, vectorSearch, {
        recalculateOnRequest: false,
        serendipity: { explorationRate: 1 },
        relaxation: { maxRelaxationLevels: 0 },
      });

      await engine.getRecommendations(visitorId, 10);

      // フォールバック用のsearchByEmbeddingの呼び出し（2回目）で
      // セレンディピティ結果のIDが除外されていることを確認
      const calls = (vectorSearch.searchByEmbedding as ReturnType<typeof vi.fn>).mock.calls;
      const fallbackCall = calls[calls.length - 1];
      expect(fallbackCall[0].excludeIds).toContain("serendipity-1");
    });

    it("両パス合計でもlimit未満の場合は取得可能分のみ返す", async () => {
      const serendipityResults: VectorSearchResult[] = [
        {
          id: "serendipity-1",
          title: "冒険記事",
          similarity: 0.5,
          url: "http://ja.scp-wiki.net/serendipity-1",
        },
      ];

      const preferenceResults: VectorSearchResult[] = [
        {
          id: "pref-1",
          title: "好み記事",
          similarity: 0.9,
          url: "http://ja.scp-wiki.net/pref-1",
        },
      ];

      const storage = createMockStorage({
        getProfile: vi.fn().mockResolvedValue(createTestProfile(visitorId, testEmbedding)),
        getViewHistory: vi.fn().mockResolvedValue([]),
        getFeedback: vi.fn().mockResolvedValue([]),
        getFavorites: vi.fn().mockResolvedValue([]),
        getArticleTags: vi.fn().mockResolvedValue(["ホラー"]),
      });

      const vectorSearch = createMockVectorSearch({
        // 1回目: adjacent (1件)、2回目: backfill adjacent (空)
        // 3回目以降: engine fallback preference (1件)
        searchByEmbedding: vi
          .fn()
          .mockResolvedValueOnce(serendipityResults) // adjacent
          .mockResolvedValueOnce([]) // backfill adjacent (empty)
          .mockResolvedValue(preferenceResults), // engine fallback
        searchByUnexploredTags: vi.fn().mockResolvedValue([]),
        getEmbedding: vi.fn().mockResolvedValue(testEmbedding),
      });

      const engine = new RecommendationEngine(storage, vectorSearch, {
        recalculateOnRequest: false,
        serendipity: { explorationRate: 1 },
        relaxation: { maxRelaxationLevels: 0 },
      });

      const recommendations = await engine.getRecommendations(visitorId, 10);

      // 両パス合計2件しかなくてもエラーにならず返却される
      expect(recommendations).toHaveLength(2);
    });

    it("プライマリがlimit以上の場合はフォールバックしない", async () => {
      const mockResults: VectorSearchResult[] = Array.from({ length: 30 }, (_, i) => ({
        id: `article-${i}`,
        title: `記事${i}`,
        similarity: 0.99 - i * 0.01,
        url: `http://ja.scp-wiki.net/scp-${i}`,
      }));

      const storage = createMockStorage({
        getProfile: vi.fn().mockResolvedValue(createTestProfile(visitorId, testEmbedding)),
        getViewHistory: vi.fn().mockResolvedValue([]),
        getFeedback: vi.fn().mockResolvedValue([]),
        getFavorites: vi.fn().mockResolvedValue([]),
      });

      const vectorSearch = createMockVectorSearch({
        searchByEmbedding: vi.fn().mockResolvedValue(mockResults),
        searchByUnexploredTags: vi.fn().mockResolvedValue([]),
        getEmbedding: vi.fn().mockResolvedValue(testEmbedding),
      });

      const engine = new RecommendationEngine(storage, vectorSearch, {
        recalculateOnRequest: false,
        serendipity: { explorationRate: 0 },
      });

      const recommendations = await engine.getRecommendations(visitorId, 10);

      expect(recommendations).toHaveLength(10);
      // searchByUnexploredTagsは呼ばれない（フォールバック不要）
      expect(vectorSearch.searchByUnexploredTags).not.toHaveBeenCalled();
    });
  });

  describe("候補プールランダムサンプリング", () => {
    it("candidatePoolMultiplierに応じて多めに候補を取得する", async () => {
      const mockResults: VectorSearchResult[] = Array.from({ length: 30 }, (_, i) => ({
        id: `article-${i}`,
        title: `記事${i}`,
        similarity: 0.99 - i * 0.01,
        url: `http://ja.scp-wiki.net/scp-${i}`,
      }));

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
        candidatePoolMultiplier: 3,
      });

      await engine.getRecommendations(visitorId, 10);

      // limit(10) * multiplier(3) = 30件を要求
      expect(vectorSearch.searchByEmbedding).toHaveBeenCalledWith(
        expect.objectContaining({
          limit: 30,
        })
      );
    });

    it("候補プールから指定件数のみ返却される", async () => {
      const mockResults: VectorSearchResult[] = Array.from({ length: 30 }, (_, i) => ({
        id: `article-${i}`,
        title: `記事${i}`,
        similarity: 0.99 - i * 0.01,
        url: `http://ja.scp-wiki.net/scp-${i}`,
      }));

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
        candidatePoolMultiplier: 3,
      });

      const recommendations = await engine.getRecommendations(visitorId, 10);

      expect(recommendations).toHaveLength(10);
    });

    it("候補プールが要求数より少ない場合、フォールバック含め取得可能分が返却される", async () => {
      const mockResults: VectorSearchResult[] = Array.from({ length: 5 }, (_, i) => ({
        id: `article-${i}`,
        title: `記事${i}`,
        similarity: 0.99 - i * 0.01,
        url: `http://ja.scp-wiki.net/scp-${i}`,
      }));

      const storage = createMockStorage({
        getProfile: vi.fn().mockResolvedValue(createTestProfile(visitorId, testEmbedding)),
        getViewHistory: vi.fn().mockResolvedValue([]),
        getFeedback: vi.fn().mockResolvedValue([]),
        getFavorites: vi.fn().mockResolvedValue([]),
      });

      const vectorSearch = createMockVectorSearch({
        // 1回目: preference(5件)、2回目以降: フォールバック serendipity → 空
        searchByEmbedding: vi.fn().mockResolvedValueOnce(mockResults).mockResolvedValue([]),
        getEmbedding: vi.fn().mockResolvedValue(testEmbedding),
      });

      const engine = new RecommendationEngine(storage, vectorSearch, {
        recalculateOnRequest: false,
        serendipity: { explorationRate: 0 },
        candidatePoolMultiplier: 3,
      });

      const recommendations = await engine.getRecommendations(visitorId, 10);

      // preference 5件 + フォールバック serendipity 0件 = 5件
      expect(recommendations).toHaveLength(5);
    });

    it("candidatePoolMultiplier未指定時はデフォルト値3が使用される", async () => {
      const mockResults: VectorSearchResult[] = Array.from({ length: 30 }, (_, i) => ({
        id: `article-${i}`,
        title: `記事${i}`,
        similarity: 0.99 - i * 0.01,
        url: `http://ja.scp-wiki.net/scp-${i}`,
      }));

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

      // candidatePoolMultiplierを明示的に指定しない
      const engine = new RecommendationEngine(storage, vectorSearch, {
        recalculateOnRequest: false,
        serendipity: { explorationRate: 0 },
      });

      await engine.getRecommendations(visitorId, 10);

      // デフォルトのmultiplier(3)で30件を要求
      expect(vectorSearch.searchByEmbedding).toHaveBeenCalledWith(
        expect.objectContaining({
          limit: 30,
        })
      );
    });

    it("シャッフルにより結果の順序が変化する可能性がある", async () => {
      const mockResults: VectorSearchResult[] = Array.from({ length: 30 }, (_, i) => ({
        id: `article-${i}`,
        title: `記事${i}`,
        similarity: 0.99 - i * 0.01,
        url: `http://ja.scp-wiki.net/scp-${i}`,
      }));

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
        candidatePoolMultiplier: 3,
      });

      // 複数回実行して、少なくとも1回は順序が異なることを確認
      const resultSets: string[][] = [];
      for (let i = 0; i < 20; i++) {
        const recommendations = await engine.getRecommendations(visitorId, 10);
        resultSets.push(recommendations.map((r) => r.id));
      }

      // 全結果セットが同一でないことを確認（20回中1回でも異なればOK）
      const firstResult = JSON.stringify(resultSets[0]);
      const hasDifferent = resultSets.some((set) => JSON.stringify(set) !== firstResult);
      expect(hasDifferent).toBe(true);
    });

    it("全結果が候補プール内の記事のみで構成される", async () => {
      const poolIds = new Set(Array.from({ length: 30 }, (_, i) => `article-${i}`));
      const mockResults: VectorSearchResult[] = Array.from({ length: 30 }, (_, i) => ({
        id: `article-${i}`,
        title: `記事${i}`,
        similarity: 0.99 - i * 0.01,
        url: `http://ja.scp-wiki.net/scp-${i}`,
      }));

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
        candidatePoolMultiplier: 3,
      });

      const recommendations = await engine.getRecommendations(visitorId, 10);

      // 返却された全記事が候補プール内に含まれることを確認
      for (const rec of recommendations) {
        expect(poolIds.has(rec.id)).toBe(true);
      }
    });
  });

  describe("段階的プール拡張（preference）", () => {
    it("初回で十分な結果がある場合、拡張しない", async () => {
      const mockResults: VectorSearchResult[] = Array.from({ length: 30 }, (_, i) => ({
        id: `article-${i}`,
        title: `記事${i}`,
        similarity: 0.99 - i * 0.01,
        url: `http://ja.scp-wiki.net/scp-${i}`,
      }));

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

      expect(recommendations).toHaveLength(10);
      // 初回のみ（フォールバックもなし）
      expect(vectorSearch.searchByEmbedding).toHaveBeenCalledTimes(1);
    });

    it("初回不足時にプール倍率を増やして再検索する", async () => {
      const level0Results: VectorSearchResult[] = Array.from({ length: 3 }, (_, i) => ({
        id: `pref-${i}`,
        title: `好み記事${i}`,
        similarity: 0.95 - i * 0.01,
        url: `http://ja.scp-wiki.net/pref-${i}`,
      }));
      const level1Results: VectorSearchResult[] = Array.from({ length: 10 }, (_, i) => ({
        id: `pref-expand-${i}`,
        title: `拡張記事${i}`,
        similarity: 0.8 - i * 0.01,
        url: `http://ja.scp-wiki.net/pref-expand-${i}`,
      }));

      const storage = createMockStorage({
        getProfile: vi.fn().mockResolvedValue(createTestProfile(visitorId, testEmbedding)),
        getViewHistory: vi.fn().mockResolvedValue([]),
        getFeedback: vi.fn().mockResolvedValue([]),
        getFavorites: vi.fn().mockResolvedValue([]),
      });

      const vectorSearch = createMockVectorSearch({
        searchByEmbedding: vi
          .fn()
          .mockResolvedValueOnce(level0Results) // Level 0: limit * 3 = 30
          .mockResolvedValueOnce(level1Results), // Level 1: limit * 5 = 50
        getEmbedding: vi.fn().mockResolvedValue(testEmbedding),
      });

      const engine = new RecommendationEngine(storage, vectorSearch, {
        recalculateOnRequest: false,
        serendipity: { explorationRate: 0 },
      });

      const recommendations = await engine.getRecommendations(visitorId, 10);

      expect(recommendations).toHaveLength(10);
      // Level 0 + Level 1 = 2回
      expect(vectorSearch.searchByEmbedding).toHaveBeenCalledTimes(2);

      // Level 1の呼び出しでプール倍率が増加していることを確認
      const level1Call = (vectorSearch.searchByEmbedding as ReturnType<typeof vi.fn>).mock
        .calls[1][0];
      expect(level1Call.limit).toBe(50); // 10 * (3 + 2) = 50
    });

    it("0件返却時に早期終了する", async () => {
      const level0Results: VectorSearchResult[] = [
        { id: "pref-0", title: "記事0", similarity: 0.9, url: "http://ja.scp-wiki.net/pref-0" },
      ];

      const storage = createMockStorage({
        getProfile: vi.fn().mockResolvedValue(createTestProfile(visitorId, testEmbedding)),
        getViewHistory: vi.fn().mockResolvedValue([]),
        getFeedback: vi.fn().mockResolvedValue([]),
        getFavorites: vi.fn().mockResolvedValue([]),
      });

      const vectorSearch = createMockVectorSearch({
        searchByEmbedding: vi
          .fn()
          .mockResolvedValueOnce(level0Results) // Level 0: 1件
          .mockResolvedValueOnce([]) // Level 1: 0件 → 早期終了
          .mockResolvedValue([]), // フォールバック
        searchByUnexploredTags: vi.fn().mockResolvedValue([]),
        getEmbedding: vi.fn().mockResolvedValue(testEmbedding),
      });

      const engine = new RecommendationEngine(storage, vectorSearch, {
        recalculateOnRequest: false,
        serendipity: { explorationRate: 0 },
      });

      await engine.getRecommendations(visitorId, 10);

      // Level 0 + Level 1(0件で終了) + フォールバック(serendipity adjacent + backfill + fallback)
      // Level 2, Level 3 は実行されない
      // バックフィルの追加呼び出しを考慮して上限を緩和
      const callCount = (vectorSearch.searchByEmbedding as ReturnType<typeof vi.fn>).mock.calls
        .length;
      expect(callCount).toBeLessThanOrEqual(8);
    });
  });

  describe("閲覧履歴のlimit制御", () => {
    it("getExcludedIdsでgetViewHistoryにlimit=200が渡される", async () => {
      const storage = createMockStorage({
        getProfile: vi.fn().mockResolvedValue(createTestProfile(visitorId, testEmbedding)),
        getViewHistory: vi.fn().mockResolvedValue([]),
        getFeedback: vi.fn().mockResolvedValue([]),
        getFavorites: vi.fn().mockResolvedValue([]),
      });

      const mockResults: VectorSearchResult[] = Array.from({ length: 10 }, (_, i) => ({
        id: `article-${i}`,
        title: `記事${i}`,
        similarity: 0.9 - i * 0.01,
        url: `http://ja.scp-wiki.net/scp-${i}`,
      }));

      const vectorSearch = createMockVectorSearch({
        searchByEmbedding: vi.fn().mockResolvedValue(mockResults),
        getEmbedding: vi.fn().mockResolvedValue(testEmbedding),
      });

      const engine = new RecommendationEngine(storage, vectorSearch, {
        recalculateOnRequest: false,
        serendipity: { explorationRate: 0 },
      });

      await engine.getRecommendations(visitorId, 10);

      // getViewHistoryの呼び出しでlimit=200が渡される
      expect(storage.getViewHistory).toHaveBeenCalledWith(visitorId, 200);
    });

    it("getExploredTagsで閲覧履歴が最大50件にスライスされる", async () => {
      // 55件の閲覧履歴を作成（50件上限を超える）
      const viewHistory: ViewHistory[] = Array.from({ length: 55 }, (_, i) => ({
        id: `v${i}`,
        visitorId,
        articleId: `article-${i}`,
        viewedAt: `2024-01-${String(i + 1).padStart(2, "0")}T00:00:00.000Z`,
      }));

      const storage = createMockStorage({
        getProfile: vi.fn().mockResolvedValue(createTestProfile(visitorId, testEmbedding)),
        getViewHistory: vi.fn().mockResolvedValue(viewHistory),
        getFeedback: vi.fn().mockResolvedValue([]),
        getFavorites: vi.fn().mockResolvedValue([]),
        getArticleTagsBatch: vi.fn().mockResolvedValue(new Map()),
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

      // getViewHistoryは1回だけ呼ばれる（limit=200で一括取得）
      expect(storage.getViewHistory).toHaveBeenCalledTimes(1);
      expect(storage.getViewHistory).toHaveBeenCalledWith(visitorId, 200);

      // getArticleTagsBatchには最大50件のarticleIdが渡される
      const batchCalls = (storage.getArticleTagsBatch as ReturnType<typeof vi.fn>).mock.calls;
      expect(batchCalls).toHaveLength(1);
      expect(batchCalls[0][0]).toHaveLength(50);
    });
  });
});
