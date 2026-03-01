/**
 * @file セレンディピティ推薦のテスト
 * @see specs/004-recommend/004-02-recommend-engine/004-02-02.md
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  getSerendipityArticles,
  getAdjacentArticles,
  getUnexploredArticles,
  DEFAULT_SERENDIPITY_CONFIG,
  DEFAULT_ADJACENT_RELAXATION,
  type SerendipityConfig,
  type AdjacentRelaxationConfig,
} from "../serendipity";
import type { VectorSearchClient, VectorSearchResult } from "../../search/vector-search-client";

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

describe("セレンディピティ推薦", () => {
  const testEmbedding = [0.1, 0.2, 0.3, 0.4, 0.5];
  const testExploredTags = ["ホラー", "Safe", "Keter"];

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("DEFAULT_SERENDIPITY_CONFIG", () => {
    it("デフォルト設定が正しい値を持つ", () => {
      expect(DEFAULT_SERENDIPITY_CONFIG).toEqual({
        explorationRate: 0.2,
        adjacentMinSimilarity: 0.4,
        adjacentMaxSimilarity: 0.7,
        adjacentRatio: 0.5,
      });
    });
  });

  describe("getAdjacentArticles", () => {
    it("隣接領域記事は類似度0.4〜0.7の範囲から選ばれる", async () => {
      const mockResults: VectorSearchResult[] = [
        {
          id: "article-1",
          title: "記事1",
          similarity: 0.65,
          url: "http://ja.scp-wiki.net/scp-001",
        },
        {
          id: "article-2",
          title: "記事2",
          similarity: 0.55,
          url: "http://ja.scp-wiki.net/scp-002",
        },
        {
          id: "article-3",
          title: "記事3",
          similarity: 0.45,
          url: "http://ja.scp-wiki.net/scp-003",
        },
      ];

      const vectorSearch = createMockVectorSearch({
        searchByEmbedding: vi.fn().mockResolvedValue(mockResults),
      });

      const result = await getAdjacentArticles(
        testEmbedding,
        [],
        vectorSearch,
        DEFAULT_SERENDIPITY_CONFIG,
        10
      );

      expect(vectorSearch.searchByEmbedding).toHaveBeenCalledWith({
        queryVector: testEmbedding,
        excludeIds: [],
        limit: 20, // limit * 2 で余裕を持って取得
        minSimilarity: 0.4,
        maxSimilarity: 0.7,
      });

      expect(result).toHaveLength(3);
      result.forEach((article) => {
        expect(article.similarityScore).toBeGreaterThanOrEqual(0.4);
        expect(article.similarityScore).toBeLessThanOrEqual(0.7);
        expect(article.source).toBe("serendipity");
      });
    });

    it("除外IDリストが正しく適用される", async () => {
      const excludeIds = ["exclude-1", "exclude-2"];

      const vectorSearch = createMockVectorSearch({
        searchByEmbedding: vi.fn().mockResolvedValue([]),
      });

      await getAdjacentArticles(
        testEmbedding,
        excludeIds,
        vectorSearch,
        DEFAULT_SERENDIPITY_CONFIG,
        10
      );

      expect(vectorSearch.searchByEmbedding).toHaveBeenCalledWith(
        expect.objectContaining({ excludeIds })
      );
    });

    it("検索結果が0件の場合、空配列を返す", async () => {
      const vectorSearch = createMockVectorSearch({
        searchByEmbedding: vi.fn().mockResolvedValue([]),
      });

      const result = await getAdjacentArticles(
        testEmbedding,
        [],
        vectorSearch,
        DEFAULT_SERENDIPITY_CONFIG,
        10
      );

      expect(result).toEqual([]);
    });

    it("limit件までに切り詰められる", async () => {
      const mockResults: VectorSearchResult[] = Array.from({ length: 10 }, (_, i) => ({
        id: `article-${i}`,
        title: `記事${i}`,
        similarity: 0.65 - i * 0.02,
        url: `http://ja.scp-wiki.net/scp-${i.toString().padStart(3, "0")}`,
      }));

      const vectorSearch = createMockVectorSearch({
        searchByEmbedding: vi.fn().mockResolvedValue(mockResults),
      });

      const result = await getAdjacentArticles(
        testEmbedding,
        [],
        vectorSearch,
        DEFAULT_SERENDIPITY_CONFIG,
        5
      );

      expect(result).toHaveLength(5);
    });
  });

  describe("getUnexploredArticles", () => {
    it("未探索ジャンル記事はユーザーが読んでいないタグを持つ", async () => {
      const mockResults: VectorSearchResult[] = [
        {
          id: "article-1",
          title: "記事1（ミステリー）",
          similarity: 0,
          url: "http://ja.scp-wiki.net/scp-001",
        },
        {
          id: "article-2",
          title: "記事2（科学）",
          similarity: 0,
          url: "http://ja.scp-wiki.net/scp-002",
        },
      ];

      const vectorSearch = createMockVectorSearch({
        searchByUnexploredTags: vi.fn().mockResolvedValue(mockResults),
      });

      const result = await getUnexploredArticles(testExploredTags, [], vectorSearch, 10);

      expect(vectorSearch.searchByUnexploredTags).toHaveBeenCalledWith({
        exploredTags: testExploredTags,
        excludeIds: [],
        limit: 10,
        orderBy: "rating",
      });

      expect(result).toHaveLength(2);
      result.forEach((article) => {
        expect(article.similarityScore).toBe(0);
        expect(article.source).toBe("serendipity");
      });
    });

    it("除外IDリストが正しく適用される", async () => {
      const excludeIds = ["exclude-1", "exclude-2"];

      const vectorSearch = createMockVectorSearch({
        searchByUnexploredTags: vi.fn().mockResolvedValue([]),
      });

      await getUnexploredArticles(testExploredTags, excludeIds, vectorSearch, 10);

      expect(vectorSearch.searchByUnexploredTags).toHaveBeenCalledWith(
        expect.objectContaining({ excludeIds })
      );
    });

    it("exploredTags=[]の場合、全記事が未探索対象となる", async () => {
      const mockResults: VectorSearchResult[] = [
        { id: "article-1", title: "記事1", similarity: 0, url: "http://ja.scp-wiki.net/scp-001" },
      ];

      const vectorSearch = createMockVectorSearch({
        searchByUnexploredTags: vi.fn().mockResolvedValue(mockResults),
      });

      const result = await getUnexploredArticles([], [], vectorSearch, 10);

      expect(vectorSearch.searchByUnexploredTags).toHaveBeenCalledWith({
        exploredTags: [],
        excludeIds: [],
        limit: 10,
        orderBy: "rating",
      });

      expect(result).toHaveLength(1);
    });

    it("検索結果が0件の場合、空配列を返す", async () => {
      const vectorSearch = createMockVectorSearch({
        searchByUnexploredTags: vi.fn().mockResolvedValue([]),
      });

      const result = await getUnexploredArticles(testExploredTags, [], vectorSearch, 10);

      expect(result).toEqual([]);
    });
  });

  describe("getSerendipityArticles", () => {
    it("隣接領域と未探索ジャンルが適切な比率（50:50）でマージされる", async () => {
      const adjacentResults: VectorSearchResult[] = Array.from({ length: 10 }, (_, i) => ({
        id: `adjacent-${i}`,
        title: `隣接${i}`,
        similarity: 0.65 - i * 0.02,
        url: `http://ja.scp-wiki.net/adjacent-${i}`,
      }));

      const unexploredResults: VectorSearchResult[] = Array.from({ length: 10 }, (_, i) => ({
        id: `unexplored-${i}`,
        title: `未探索${i}`,
        similarity: 0,
        url: `http://ja.scp-wiki.net/unexplored-${i}`,
      }));

      const vectorSearch = createMockVectorSearch({
        searchByEmbedding: vi.fn().mockResolvedValue(adjacentResults),
        searchByUnexploredTags: vi.fn().mockResolvedValue(unexploredResults),
      });

      const config: SerendipityConfig = {
        ...DEFAULT_SERENDIPITY_CONFIG,
        adjacentRatio: 0.5,
      };

      const result = await getSerendipityArticles(
        testEmbedding,
        [],
        testExploredTags,
        vectorSearch,
        config,
        10
      );

      expect(result).toHaveLength(10);
      // 隣接5件、未探索5件が含まれる
      const adjacentIds = result.filter((a) => a.id.startsWith("adjacent-"));
      const unexploredIds = result.filter((a) => a.id.startsWith("unexplored-"));
      expect(adjacentIds).toHaveLength(5);
      expect(unexploredIds).toHaveLength(5);
    });

    it("返却されるarticleのsourceが'serendipity'に設定される", async () => {
      const mockResults: VectorSearchResult[] = [
        { id: "article-1", title: "記事1", similarity: 0.5, url: "http://ja.scp-wiki.net/scp-001" },
      ];

      const vectorSearch = createMockVectorSearch({
        searchByEmbedding: vi.fn().mockResolvedValue(mockResults),
        searchByUnexploredTags: vi.fn().mockResolvedValue([]),
      });

      const result = await getSerendipityArticles(
        testEmbedding,
        [],
        testExploredTags,
        vectorSearch,
        DEFAULT_SERENDIPITY_CONFIG,
        10
      );

      result.forEach((article) => {
        expect(article.source).toBe("serendipity");
      });
    });

    it("重複記事が除去される", async () => {
      // 隣接領域と未探索ジャンルで同じIDが返される場合
      const adjacentResults: VectorSearchResult[] = [
        { id: "article-1", title: "記事1", similarity: 0.5, url: "http://ja.scp-wiki.net/scp-001" },
        {
          id: "article-2",
          title: "記事2",
          similarity: 0.45,
          url: "http://ja.scp-wiki.net/scp-002",
        },
      ];

      const unexploredResults: VectorSearchResult[] = [
        { id: "article-2", title: "記事2", similarity: 0, url: "http://ja.scp-wiki.net/scp-002" }, // 重複
        { id: "article-3", title: "記事3", similarity: 0, url: "http://ja.scp-wiki.net/scp-003" },
      ];

      const vectorSearch = createMockVectorSearch({
        searchByEmbedding: vi.fn().mockResolvedValue(adjacentResults),
        searchByUnexploredTags: vi.fn().mockResolvedValue(unexploredResults),
      });

      const result = await getSerendipityArticles(
        testEmbedding,
        [],
        testExploredTags,
        vectorSearch,
        DEFAULT_SERENDIPITY_CONFIG,
        10
      );

      // 重複排除: article-1, article-2, article-3 の3件のみ
      expect(result).toHaveLength(3);
      const ids = result.map((a) => a.id);
      expect(ids).toEqual(["article-1", "article-2", "article-3"]);
    });

    it("除外IDリストが両方の検索に適用される", async () => {
      const excludeIds = ["exclude-1", "exclude-2"];

      const vectorSearch = createMockVectorSearch({
        searchByEmbedding: vi.fn().mockResolvedValue([]),
        searchByUnexploredTags: vi.fn().mockResolvedValue([]),
      });

      await getSerendipityArticles(
        testEmbedding,
        excludeIds,
        testExploredTags,
        vectorSearch,
        DEFAULT_SERENDIPITY_CONFIG,
        10
      );

      // 隣接領域検索で除外IDが渡される
      expect(vectorSearch.searchByEmbedding).toHaveBeenCalledWith(
        expect.objectContaining({ excludeIds })
      );

      // 未探索ジャンル検索でも除外IDが渡される
      expect(vectorSearch.searchByUnexploredTags).toHaveBeenCalledWith(
        expect.objectContaining({ excludeIds })
      );
    });

    it("adjacentRatio=0の場合、全て未探索ジャンルから取得", async () => {
      const unexploredResults: VectorSearchResult[] = Array.from({ length: 10 }, (_, i) => ({
        id: `unexplored-${i}`,
        title: `未探索${i}`,
        similarity: 0,
        url: `http://ja.scp-wiki.net/unexplored-${i}`,
      }));

      const vectorSearch = createMockVectorSearch({
        searchByEmbedding: vi.fn().mockResolvedValue([]),
        searchByUnexploredTags: vi.fn().mockResolvedValue(unexploredResults),
      });

      const config: SerendipityConfig = {
        ...DEFAULT_SERENDIPITY_CONFIG,
        adjacentRatio: 0,
      };

      const result = await getSerendipityArticles(
        testEmbedding,
        [],
        testExploredTags,
        vectorSearch,
        config,
        10
      );

      // 全て未探索から
      const unexploredIds = result.filter((a) => a.id.startsWith("unexplored-"));
      expect(unexploredIds).toHaveLength(10);
    });

    it("adjacentRatio=1の場合、全て隣接領域から取得", async () => {
      const adjacentResults: VectorSearchResult[] = Array.from({ length: 10 }, (_, i) => ({
        id: `adjacent-${i}`,
        title: `隣接${i}`,
        similarity: 0.65 - i * 0.02,
        url: `http://ja.scp-wiki.net/adjacent-${i}`,
      }));

      const vectorSearch = createMockVectorSearch({
        searchByEmbedding: vi.fn().mockResolvedValue(adjacentResults),
        searchByUnexploredTags: vi.fn().mockResolvedValue([]),
      });

      const config: SerendipityConfig = {
        ...DEFAULT_SERENDIPITY_CONFIG,
        adjacentRatio: 1,
      };

      const result = await getSerendipityArticles(
        testEmbedding,
        [],
        testExploredTags,
        vectorSearch,
        config,
        10
      );

      // 全て隣接から
      const adjacentIds = result.filter((a) => a.id.startsWith("adjacent-"));
      expect(adjacentIds).toHaveLength(10);
    });

    it("両方の検索で結果が少ない場合、adjacentでバックフィルされる", async () => {
      const adjacentResults: VectorSearchResult[] = [
        {
          id: "adjacent-0",
          title: "隣接0",
          similarity: 0.5,
          url: "http://ja.scp-wiki.net/adjacent-0",
        },
      ];

      const unexploredResults: VectorSearchResult[] = [
        {
          id: "unexplored-0",
          title: "未探索0",
          similarity: 0,
          url: "http://ja.scp-wiki.net/unexplored-0",
        },
      ];

      const backfillResults: VectorSearchResult[] = [
        {
          id: "backfill-0",
          title: "補充0",
          similarity: 0.4,
          url: "http://ja.scp-wiki.net/backfill-0",
        },
      ];

      const noRelaxation: AdjacentRelaxationConfig = {
        ...DEFAULT_ADJACENT_RELAXATION,
        maxRelaxationLevels: 0,
      };

      const vectorSearch = createMockVectorSearch({
        searchByEmbedding: vi
          .fn()
          .mockResolvedValueOnce(adjacentResults) // 初回adjacent
          .mockResolvedValueOnce(backfillResults), // バックフィル
        searchByUnexploredTags: vi.fn().mockResolvedValue(unexploredResults),
      });

      const result = await getSerendipityArticles(
        testEmbedding,
        [],
        testExploredTags,
        vectorSearch,
        DEFAULT_SERENDIPITY_CONFIG,
        10,
        noRelaxation
      );

      // adjacent 1件 + unexplored 1件 + backfill 1件 = 3件
      expect(result).toHaveLength(3);
      const ids = result.map((a) => a.id);
      expect(ids).toContain("adjacent-0");
      expect(ids).toContain("unexplored-0");
      expect(ids).toContain("backfill-0");
    });

    it("未探索ジャンルが0件の場合、adjacentで不足分を補充する", async () => {
      const adjacentResults: VectorSearchResult[] = Array.from({ length: 5 }, (_, i) => ({
        id: `adjacent-${i}`,
        title: `隣接${i}`,
        similarity: 0.65 - i * 0.02,
        url: `http://ja.scp-wiki.net/adjacent-${i}`,
      }));

      const backfillResults: VectorSearchResult[] = Array.from({ length: 5 }, (_, i) => ({
        id: `backfill-${i}`,
        title: `補充${i}`,
        similarity: 0.45 - i * 0.02,
        url: `http://ja.scp-wiki.net/backfill-${i}`,
      }));

      const noRelaxation: AdjacentRelaxationConfig = {
        ...DEFAULT_ADJACENT_RELAXATION,
        maxRelaxationLevels: 0,
      };

      const vectorSearch = createMockVectorSearch({
        searchByEmbedding: vi
          .fn()
          .mockResolvedValueOnce(adjacentResults) // 初回adjacent: 5件
          .mockResolvedValueOnce(backfillResults), // バックフィル: 5件
        searchByUnexploredTags: vi.fn().mockResolvedValue([]), // unexplored: 0件
      });

      const result = await getSerendipityArticles(
        testEmbedding,
        [],
        testExploredTags,
        vectorSearch,
        DEFAULT_SERENDIPITY_CONFIG,
        10,
        noRelaxation
      );

      // adjacent 5件 + backfill 5件 = 10件
      expect(result).toHaveLength(10);
    });

    it("バックフィル時にプライマリ結果のIDが除外される", async () => {
      const adjacentResults: VectorSearchResult[] = [
        {
          id: "adjacent-0",
          title: "隣接0",
          similarity: 0.5,
          url: "http://ja.scp-wiki.net/adjacent-0",
        },
      ];

      const noRelaxation: AdjacentRelaxationConfig = {
        ...DEFAULT_ADJACENT_RELAXATION,
        maxRelaxationLevels: 0,
      };

      const vectorSearch = createMockVectorSearch({
        searchByEmbedding: vi
          .fn()
          .mockResolvedValueOnce(adjacentResults) // 初回adjacent
          .mockResolvedValueOnce([]), // バックフィル（結果なし）
        searchByUnexploredTags: vi.fn().mockResolvedValue([]),
      });

      const excludeIds = ["exclude-1"];

      await getSerendipityArticles(
        testEmbedding,
        excludeIds,
        testExploredTags,
        vectorSearch,
        DEFAULT_SERENDIPITY_CONFIG,
        10,
        noRelaxation
      );

      // バックフィル呼び出し（2回目のsearchByEmbedding）で
      // 既存の除外IDに加えてプライマリ結果のIDも含まれる
      const backfillCall = (vectorSearch.searchByEmbedding as ReturnType<typeof vi.fn>).mock
        .calls[1];
      expect(backfillCall[0].excludeIds).toContain("exclude-1");
      expect(backfillCall[0].excludeIds).toContain("adjacent-0");
    });

    it("limit=1、adjacentRatio=0.5の場合、隣接1件のみ", async () => {
      const adjacentResults: VectorSearchResult[] = [
        {
          id: "adjacent-0",
          title: "隣接0",
          similarity: 0.5,
          url: "http://ja.scp-wiki.net/adjacent-0",
        },
      ];

      const unexploredResults: VectorSearchResult[] = [
        {
          id: "unexplored-0",
          title: "未探索0",
          similarity: 0,
          url: "http://ja.scp-wiki.net/unexplored-0",
        },
      ];

      const vectorSearch = createMockVectorSearch({
        searchByEmbedding: vi.fn().mockResolvedValue(adjacentResults),
        searchByUnexploredTags: vi.fn().mockResolvedValue(unexploredResults),
      });

      const config: SerendipityConfig = {
        ...DEFAULT_SERENDIPITY_CONFIG,
        adjacentRatio: 0.5,
      };

      const result = await getSerendipityArticles(
        testEmbedding,
        [],
        testExploredTags,
        vectorSearch,
        config,
        1
      );

      // limit=1、ceil(1*0.5)=1なので隣接1件
      expect(result).toHaveLength(1);
      expect(result[0].id).toBe("adjacent-0");
    });
  });

  describe("隣接領域の段階的緩和", () => {
    it("Level 0で十分な結果がある場合、緩和しない", async () => {
      const mockResults: VectorSearchResult[] = Array.from({ length: 10 }, (_, i) => ({
        id: `adj-${i}`,
        title: `隣接${i}`,
        similarity: 0.5 + i * 0.02,
        url: `http://ja.scp-wiki.net/adj-${i}`,
      }));

      const vectorSearch = createMockVectorSearch({
        searchByEmbedding: vi.fn().mockResolvedValue(mockResults),
      });

      const result = await getAdjacentArticles(
        testEmbedding,
        [],
        vectorSearch,
        DEFAULT_SERENDIPITY_CONFIG,
        5
      );

      expect(result).toHaveLength(5);
      // 1回のみ呼び出し（緩和不要）
      expect(vectorSearch.searchByEmbedding).toHaveBeenCalledTimes(1);
    });

    it("Level 0で不足時、類似度範囲を拡張して再検索する", async () => {
      const level0Results: VectorSearchResult[] = [
        { id: "adj-1", title: "隣接1", similarity: 0.5, url: "http://ja.scp-wiki.net/adj-1" },
      ];
      const level1Results: VectorSearchResult[] = [
        { id: "adj-2", title: "隣接2", similarity: 0.35, url: "http://ja.scp-wiki.net/adj-2" },
        { id: "adj-3", title: "隣接3", similarity: 0.75, url: "http://ja.scp-wiki.net/adj-3" },
        { id: "adj-4", title: "隣接4", similarity: 0.32, url: "http://ja.scp-wiki.net/adj-4" },
        { id: "adj-5", title: "隣接5", similarity: 0.78, url: "http://ja.scp-wiki.net/adj-5" },
      ];

      const vectorSearch = createMockVectorSearch({
        searchByEmbedding: vi
          .fn()
          .mockResolvedValueOnce(level0Results) // Level 0: [0.4, 0.7]
          .mockResolvedValueOnce(level1Results), // Level 1: [0.3, 0.8]
      });

      const result = await getAdjacentArticles(
        testEmbedding,
        [],
        vectorSearch,
        DEFAULT_SERENDIPITY_CONFIG,
        5
      );

      expect(result).toHaveLength(5);
      expect(vectorSearch.searchByEmbedding).toHaveBeenCalledTimes(2);

      // Level 1の呼び出しで類似度範囲が拡張されていることを確認
      const level1Call = (vectorSearch.searchByEmbedding as ReturnType<typeof vi.fn>).mock
        .calls[1][0];
      expect(level1Call.minSimilarity).toBeCloseTo(0.3);
      expect(level1Call.maxSimilarity).toBeCloseTo(0.8);
    });

    it("最大緩和時に類似度が下限/上限を超えない", async () => {
      const vectorSearch = createMockVectorSearch({
        searchByEmbedding: vi.fn().mockResolvedValue([]),
      });

      const relaxation: AdjacentRelaxationConfig = {
        maxRelaxationLevels: 5,
        minSimilarityStep: 0.2,
        maxSimilarityStep: 0.2,
        minSimilarityFloor: 0.1,
        maxSimilarityCeiling: 0.95,
      };

      await getAdjacentArticles(
        testEmbedding,
        [],
        vectorSearch,
        DEFAULT_SERENDIPITY_CONFIG,
        5,
        relaxation
      );

      const calls = (vectorSearch.searchByEmbedding as ReturnType<typeof vi.fn>).mock.calls;

      // 各レベルの類似度範囲を検証
      for (const call of calls) {
        expect(call[0].minSimilarity).toBeGreaterThanOrEqual(0.1);
        expect(call[0].maxSimilarity).toBeLessThanOrEqual(0.95);
      }
    });

    it("レベル間で重複記事が除去される", async () => {
      const sharedArticle: VectorSearchResult = {
        id: "shared-1",
        title: "共通記事",
        similarity: 0.5,
        url: "http://ja.scp-wiki.net/shared-1",
      };
      const newArticle: VectorSearchResult = {
        id: "new-1",
        title: "新規記事",
        similarity: 0.35,
        url: "http://ja.scp-wiki.net/new-1",
      };

      const vectorSearch = createMockVectorSearch({
        searchByEmbedding: vi
          .fn()
          .mockResolvedValueOnce([sharedArticle]) // Level 0
          .mockResolvedValueOnce([newArticle]) // Level 1 (sharedArticleはexcludeされる)
          .mockResolvedValue([]), // Level 2以降: 空
      });

      const result = await getAdjacentArticles(
        testEmbedding,
        [],
        vectorSearch,
        DEFAULT_SERENDIPITY_CONFIG,
        5
      );

      expect(result).toHaveLength(2);
      const ids = result.map((r) => r.id);
      expect(ids).toContain("shared-1");
      expect(ids).toContain("new-1");
    });

    it("緩和なし(maxRelaxationLevels=0)で従来と同じ動作", async () => {
      const mockResults: VectorSearchResult[] = [
        { id: "adj-1", title: "隣接1", similarity: 0.5, url: "http://ja.scp-wiki.net/adj-1" },
      ];

      const vectorSearch = createMockVectorSearch({
        searchByEmbedding: vi.fn().mockResolvedValue(mockResults),
      });

      const noRelaxation: AdjacentRelaxationConfig = {
        ...DEFAULT_ADJACENT_RELAXATION,
        maxRelaxationLevels: 0,
      };

      const result = await getAdjacentArticles(
        testEmbedding,
        [],
        vectorSearch,
        DEFAULT_SERENDIPITY_CONFIG,
        5,
        noRelaxation
      );

      // 1回のみ呼び出し（緩和なし）
      expect(vectorSearch.searchByEmbedding).toHaveBeenCalledTimes(1);
      expect(result).toHaveLength(1);
    });
  });
});
