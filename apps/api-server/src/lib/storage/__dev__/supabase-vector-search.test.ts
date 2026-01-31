/**
 * @file SupabaseVectorSearch テスト
 * @description VectorSearchClientインターフェースのSupabase実装テスト
 * @see specs/005-backend-api/005-02-server-storage/005-02-03.md
 */

/* eslint-disable @typescript-eslint/unbound-method */

import { describe, it, expect, vi, beforeEach } from "vitest";
import type { SupabaseClient } from "@supabase/supabase-js";
import { SupabaseVectorSearch } from "../supabase-vector-search";

/**
 * モックレスポンス型
 * テスト用にシンプルな型定義
 */
interface MockResponse<T> {
  data: T;
  error: MockError | null;
  count: null;
  status: number;
  statusText: string;
}

interface MockError {
  name: string;
  message: string;
  details: string;
  hint: string;
  code: string;
}

/**
 * PostgrestSingleResponse互換のモックレスポンスを作成
 */
const createMockRpcResponse = <T>(data: T, error: MockError | null = null): MockResponse<T> => ({
  data,
  error,
  count: null,
  status: error !== null ? 400 : 200,
  statusText: error !== null ? "Bad Request" : "OK",
});

/**
 * PostgrestError互換のモックエラーを作成
 */
const createMockPostgrestError = (message: string): MockError => ({
  name: "PostgrestError",
  message,
  details: "",
  hint: "",
  code: "ERROR",
});

describe("SupabaseVectorSearch", () => {
  let mockSupabase: SupabaseClient;
  let vectorSearch: SupabaseVectorSearch;

  beforeEach(() => {
    mockSupabase = {
      rpc: vi.fn(),
      from: vi.fn(),
    } as unknown as SupabaseClient;

    vectorSearch = new SupabaseVectorSearch(mockSupabase);
  });

  // ============================================
  // searchByEmbedding
  // ============================================
  describe("searchByEmbedding", () => {
    describe("正常系", () => {
      it("クエリベクトルに類似した記事を取得できる", async () => {
        // Arrange
        const mockData = [
          {
            id: "scp-173",
            title: "The Sculpture",
            similarity: 0.95,
            url: "http://scp-jp.wikidot.com/scp-173",
          },
          {
            id: "scp-096",
            title: "The Shy Guy",
            similarity: 0.87,
            url: "http://scp-jp.wikidot.com/scp-096",
          },
        ];

        vi.mocked(mockSupabase.rpc).mockResolvedValue(createMockRpcResponse(mockData) as never);

        // Act
        const result = await vectorSearch.searchByEmbedding({
          queryVector: [0.1, 0.2, 0.3],
          limit: 10,
        });

        // Assert
        expect(result).toEqual([
          {
            id: "scp-173",
            title: "The Sculpture",
            similarity: 0.95,
            url: "http://scp-jp.wikidot.com/scp-173",
          },
          {
            id: "scp-096",
            title: "The Shy Guy",
            similarity: 0.87,
            url: "http://scp-jp.wikidot.com/scp-096",
          },
        ]);

        expect(mockSupabase.rpc).toHaveBeenCalledWith("search_articles_by_embedding", {
          query_vector: [0.1, 0.2, 0.3],
          exclude_ids: [],
          match_count: 10,
          min_similarity: 0,
          max_similarity: 1,
        });
      });

      it("結果が類似度降順でソートされている", async () => {
        // Arrange
        const mockData = [
          { id: "scp-173", title: "The Sculpture", similarity: 0.95 },
          { id: "scp-096", title: "The Shy Guy", similarity: 0.87 },
          { id: "scp-682", title: "Hard-to-Destroy Reptile", similarity: 0.75 },
        ];

        vi.mocked(mockSupabase.rpc).mockResolvedValue(createMockRpcResponse(mockData) as never);

        // Act
        const result = await vectorSearch.searchByEmbedding({
          queryVector: [0.1, 0.2, 0.3],
          limit: 10,
        });

        // Assert
        expect(result[0].similarity).toBeGreaterThanOrEqual(result[1].similarity);
        expect(result[1].similarity).toBeGreaterThanOrEqual(result[2].similarity);
      });

      it("excludeIdsに含まれる記事が除外される", async () => {
        // Arrange
        const mockData = [{ id: "scp-096", title: "The Shy Guy", similarity: 0.87 }];

        vi.mocked(mockSupabase.rpc).mockResolvedValue(createMockRpcResponse(mockData) as never);

        // Act
        const result = await vectorSearch.searchByEmbedding({
          queryVector: [0.1, 0.2, 0.3],
          excludeIds: ["scp-173"],
          limit: 10,
        });

        // Assert
        expect(result).not.toContainEqual(expect.objectContaining({ id: "scp-173" }));
        expect(mockSupabase.rpc).toHaveBeenCalledWith(
          "search_articles_by_embedding",
          expect.objectContaining({ exclude_ids: ["scp-173"] })
        );
      });

      it("minSimilarityフィルタが動作する", async () => {
        // Arrange
        const mockData = [{ id: "scp-173", title: "The Sculpture", similarity: 0.95 }];

        vi.mocked(mockSupabase.rpc).mockResolvedValue(createMockRpcResponse(mockData) as never);

        // Act
        await vectorSearch.searchByEmbedding({
          queryVector: [0.1, 0.2, 0.3],
          limit: 10,
          minSimilarity: 0.8,
        });

        // Assert
        expect(mockSupabase.rpc).toHaveBeenCalledWith(
          "search_articles_by_embedding",
          expect.objectContaining({ min_similarity: 0.8 })
        );
      });

      it("maxSimilarityフィルタが動作する", async () => {
        // Arrange
        vi.mocked(mockSupabase.rpc).mockResolvedValue(createMockRpcResponse([]) as never);

        // Act
        await vectorSearch.searchByEmbedding({
          queryVector: [0.1, 0.2, 0.3],
          limit: 10,
          maxSimilarity: 0.9,
        });

        // Assert
        expect(mockSupabase.rpc).toHaveBeenCalledWith(
          "search_articles_by_embedding",
          expect.objectContaining({ max_similarity: 0.9 })
        );
      });
    });

    describe("エッジケース", () => {
      it("excludeIdsが空配列の場合、デフォルト値[]が渡される", async () => {
        // Arrange
        vi.mocked(mockSupabase.rpc).mockResolvedValue(createMockRpcResponse([]) as never);

        // Act
        await vectorSearch.searchByEmbedding({
          queryVector: [0.1, 0.2, 0.3],
          excludeIds: [],
          limit: 10,
        });

        // Assert
        expect(mockSupabase.rpc).toHaveBeenCalledWith(
          "search_articles_by_embedding",
          expect.objectContaining({ exclude_ids: [] })
        );
      });

      it("excludeIdsがundefinedの場合、デフォルト値[]が渡される", async () => {
        // Arrange
        vi.mocked(mockSupabase.rpc).mockResolvedValue(createMockRpcResponse([]) as never);

        // Act
        await vectorSearch.searchByEmbedding({
          queryVector: [0.1, 0.2, 0.3],
          limit: 10,
        });

        // Assert
        expect(mockSupabase.rpc).toHaveBeenCalledWith(
          "search_articles_by_embedding",
          expect.objectContaining({ exclude_ids: [] })
        );
      });

      it("minSimilarityがundefinedの場合、デフォルト値0が渡される", async () => {
        // Arrange
        vi.mocked(mockSupabase.rpc).mockResolvedValue(createMockRpcResponse([]) as never);

        // Act
        await vectorSearch.searchByEmbedding({
          queryVector: [0.1, 0.2, 0.3],
          limit: 10,
        });

        // Assert
        expect(mockSupabase.rpc).toHaveBeenCalledWith(
          "search_articles_by_embedding",
          expect.objectContaining({ min_similarity: 0 })
        );
      });

      it("maxSimilarityがundefinedの場合、デフォルト値1が渡される", async () => {
        // Arrange
        vi.mocked(mockSupabase.rpc).mockResolvedValue(createMockRpcResponse([]) as never);

        // Act
        await vectorSearch.searchByEmbedding({
          queryVector: [0.1, 0.2, 0.3],
          limit: 10,
        });

        // Assert
        expect(mockSupabase.rpc).toHaveBeenCalledWith(
          "search_articles_by_embedding",
          expect.objectContaining({ max_similarity: 1 })
        );
      });

      it("検索結果が0件の場合、空配列を返す", async () => {
        // Arrange
        vi.mocked(mockSupabase.rpc).mockResolvedValue(createMockRpcResponse([]) as never);

        // Act
        const result = await vectorSearch.searchByEmbedding({
          queryVector: [0.1, 0.2, 0.3],
          limit: 10,
        });

        // Assert
        expect(result).toEqual([]);
      });

      it("dataがnullの場合、空配列を返す", async () => {
        // Arrange
        vi.mocked(mockSupabase.rpc).mockResolvedValue(createMockRpcResponse(null) as never);

        // Act
        const result = await vectorSearch.searchByEmbedding({
          queryVector: [0.1, 0.2, 0.3],
          limit: 10,
        });

        // Assert
        expect(result).toEqual([]);
      });
    });

    describe("異常系", () => {
      it("RPC関数がエラーを返した場合、例外をthrowする", async () => {
        // Arrange
        const mockError = createMockPostgrestError("RPC function error");
        vi.mocked(mockSupabase.rpc).mockResolvedValue(
          createMockRpcResponse(null, mockError) as never
        );

        // Act & Assert
        await expect(
          vectorSearch.searchByEmbedding({
            queryVector: [0.1, 0.2, 0.3],
            limit: 10,
          })
        ).rejects.toThrow();
      });
    });
  });

  // ============================================
  // getEmbedding
  // ============================================
  describe("getEmbedding", () => {
    const createMockChain = (data: unknown, error: unknown = null) => ({
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      single: vi.fn().mockResolvedValue({ data, error }),
    });

    describe("正常系", () => {
      it("記事のembeddingを取得できる", async () => {
        // Arrange
        const mockEmbedding = [0.1, 0.2, 0.3, 0.4, 0.5];
        const mockChain = createMockChain({ embedding: mockEmbedding });
        vi.mocked(mockSupabase.from).mockReturnValue(mockChain as never);

        // Act
        const result = await vectorSearch.getEmbedding("scp-173");

        // Assert
        expect(result).toEqual(mockEmbedding);
        expect(mockSupabase.from).toHaveBeenCalledWith("scp_articles");
        expect(mockChain.select).toHaveBeenCalledWith("embedding");
        expect(mockChain.eq).toHaveBeenCalledWith("id", "scp-173");
        expect(mockChain.single).toHaveBeenCalled();
      });

      it("存在しない記事にnullを返す", async () => {
        // Arrange
        const mockChain = createMockChain(null, { code: "PGRST116" });
        vi.mocked(mockSupabase.from).mockReturnValue(mockChain as never);

        // Act
        const result = await vectorSearch.getEmbedding("nonexistent-id");

        // Assert
        expect(result).toBeNull();
      });
    });

    describe("エッジケース", () => {
      it("embeddingがnullの記事の場合、nullを返す", async () => {
        // Arrange
        const mockChain = createMockChain({ embedding: null });
        vi.mocked(mockSupabase.from).mockReturnValue(mockChain as never);

        // Act
        const result = await vectorSearch.getEmbedding("scp-173");

        // Assert
        expect(result).toBeNull();
      });

      it("dataがnullの場合、nullを返す", async () => {
        // Arrange
        const mockChain = createMockChain(null);
        vi.mocked(mockSupabase.from).mockReturnValue(mockChain as never);

        // Act
        const result = await vectorSearch.getEmbedding("scp-173");

        // Assert
        expect(result).toBeNull();
      });
    });

    describe("異常系", () => {
      it("クエリがエラーを返した場合、nullを返す", async () => {
        // Arrange
        const mockChain = createMockChain(null, createMockPostgrestError("Database error"));
        vi.mocked(mockSupabase.from).mockReturnValue(mockChain as never);

        // Act
        const result = await vectorSearch.getEmbedding("scp-173");

        // Assert
        expect(result).toBeNull();
      });
    });
  });

  // ============================================
  // searchByUnexploredTags
  // ============================================
  describe("searchByUnexploredTags", () => {
    describe("正常系", () => {
      it("未探索タグの記事を取得できる", async () => {
        // Arrange
        const mockData = [
          { id: "scp-173", title: "The Sculpture" },
          { id: "scp-096", title: "The Shy Guy" },
        ];

        vi.mocked(mockSupabase.rpc).mockResolvedValue(createMockRpcResponse(mockData) as never);

        // Act
        const result = await vectorSearch.searchByUnexploredTags({
          exploredTags: ["safe", "keter"],
          limit: 10,
          orderBy: "rating",
        });

        // Assert
        expect(result).toHaveLength(2);
        expect(result[0].id).toBe("scp-173");
        expect(result[1].id).toBe("scp-096");
      });

      it("orderBy=ratingでソートされる", async () => {
        // Arrange
        vi.mocked(mockSupabase.rpc).mockResolvedValue(createMockRpcResponse([]) as never);

        // Act
        await vectorSearch.searchByUnexploredTags({
          exploredTags: ["safe"],
          limit: 10,
          orderBy: "rating",
        });

        // Assert
        expect(mockSupabase.rpc).toHaveBeenCalledWith(
          "search_articles_by_unexplored_tags",
          expect.objectContaining({ order_by: "rating" })
        );
      });

      it("orderBy=randomでランダム順になる", async () => {
        // Arrange
        vi.mocked(mockSupabase.rpc).mockResolvedValue(createMockRpcResponse([]) as never);

        // Act
        await vectorSearch.searchByUnexploredTags({
          exploredTags: ["safe"],
          limit: 10,
          orderBy: "random",
        });

        // Assert
        expect(mockSupabase.rpc).toHaveBeenCalledWith(
          "search_articles_by_unexplored_tags",
          expect.objectContaining({ order_by: "random" })
        );
      });

      it("excludeIdsが動作する", async () => {
        // Arrange
        vi.mocked(mockSupabase.rpc).mockResolvedValue(createMockRpcResponse([]) as never);

        // Act
        await vectorSearch.searchByUnexploredTags({
          exploredTags: ["safe"],
          excludeIds: ["scp-173"],
          limit: 10,
          orderBy: "rating",
        });

        // Assert
        expect(mockSupabase.rpc).toHaveBeenCalledWith(
          "search_articles_by_unexplored_tags",
          expect.objectContaining({ exclude_ids: ["scp-173"] })
        );
      });
    });

    describe("エッジケース", () => {
      it("exploredTagsが空配列の場合、全タグを未探索として扱う", async () => {
        // Arrange
        vi.mocked(mockSupabase.rpc).mockResolvedValue(createMockRpcResponse([]) as never);

        // Act
        await vectorSearch.searchByUnexploredTags({
          exploredTags: [],
          limit: 10,
          orderBy: "rating",
        });

        // Assert
        expect(mockSupabase.rpc).toHaveBeenCalledWith(
          "search_articles_by_unexplored_tags",
          expect.objectContaining({ explored_tags: [] })
        );
      });

      it("excludeIdsがundefinedの場合、デフォルト値[]が渡される", async () => {
        // Arrange
        vi.mocked(mockSupabase.rpc).mockResolvedValue(createMockRpcResponse([]) as never);

        // Act
        await vectorSearch.searchByUnexploredTags({
          exploredTags: ["safe"],
          limit: 10,
          orderBy: "rating",
        });

        // Assert
        expect(mockSupabase.rpc).toHaveBeenCalledWith(
          "search_articles_by_unexplored_tags",
          expect.objectContaining({ exclude_ids: [] })
        );
      });

      it("検索結果が0件の場合、空配列を返す", async () => {
        // Arrange
        vi.mocked(mockSupabase.rpc).mockResolvedValue(createMockRpcResponse([]) as never);

        // Act
        const result = await vectorSearch.searchByUnexploredTags({
          exploredTags: ["safe"],
          limit: 10,
          orderBy: "rating",
        });

        // Assert
        expect(result).toEqual([]);
      });

      it("similarityが固定値0.5である", async () => {
        // Arrange
        const mockData = [
          { id: "scp-173", title: "The Sculpture" },
          { id: "scp-096", title: "The Shy Guy" },
        ];

        vi.mocked(mockSupabase.rpc).mockResolvedValue(createMockRpcResponse(mockData) as never);

        // Act
        const result = await vectorSearch.searchByUnexploredTags({
          exploredTags: ["safe"],
          limit: 10,
          orderBy: "rating",
        });

        // Assert
        expect(result[0].similarity).toBe(0.5);
        expect(result[1].similarity).toBe(0.5);
      });
    });

    describe("異常系", () => {
      it("RPC関数がエラーを返した場合、例外をthrowする", async () => {
        // Arrange
        const mockError = createMockPostgrestError("RPC function error");
        vi.mocked(mockSupabase.rpc).mockResolvedValue(
          createMockRpcResponse(null, mockError) as never
        );

        // Act & Assert
        await expect(
          vectorSearch.searchByUnexploredTags({
            exploredTags: ["safe"],
            limit: 10,
            orderBy: "rating",
          })
        ).rejects.toThrow();
      });
    });
  });
});
