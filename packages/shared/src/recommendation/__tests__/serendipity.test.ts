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
  type SerendipityConfig,
} from "../serendipity";
import type { VectorSearchClient, VectorSearchResult } from "../../search/vector-search-client";

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
        { id: "article-1", title: "記事1", similarity: 0.65 },
        { id: "article-2", title: "記事2", similarity: 0.55 },
        { id: "article-3", title: "記事3", similarity: 0.45 },
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
        { id: "article-1", title: "記事1（ミステリー）", similarity: 0 },
        { id: "article-2", title: "記事2（科学）", similarity: 0 },
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
        { id: "article-1", title: "記事1", similarity: 0 },
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
      }));

      const unexploredResults: VectorSearchResult[] = Array.from({ length: 10 }, (_, i) => ({
        id: `unexplored-${i}`,
        title: `未探索${i}`,
        similarity: 0,
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
        { id: "article-1", title: "記事1", similarity: 0.5 },
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
        { id: "article-1", title: "記事1", similarity: 0.5 },
        { id: "article-2", title: "記事2", similarity: 0.45 },
      ];

      const unexploredResults: VectorSearchResult[] = [
        { id: "article-2", title: "記事2", similarity: 0 }, // 重複
        { id: "article-3", title: "記事3", similarity: 0 },
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

    it("両方の検索で結果が少ない場合、取得可能分のみ返す", async () => {
      const adjacentResults: VectorSearchResult[] = [
        { id: "adjacent-0", title: "隣接0", similarity: 0.5 },
      ];

      const unexploredResults: VectorSearchResult[] = [
        { id: "unexplored-0", title: "未探索0", similarity: 0 },
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

      // limit=10だが、取得可能なのは2件
      expect(result).toHaveLength(2);
    });

    it("limit=1、adjacentRatio=0.5の場合、隣接1件のみ", async () => {
      const adjacentResults: VectorSearchResult[] = [
        { id: "adjacent-0", title: "隣接0", similarity: 0.5 },
      ];

      const unexploredResults: VectorSearchResult[] = [
        { id: "unexplored-0", title: "未探索0", similarity: 0 },
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
});
