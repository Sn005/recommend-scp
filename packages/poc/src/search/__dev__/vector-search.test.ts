/**
 * Vector Search Tests
 * TDD: Red -> Green -> Refactor
 */

import { describe, it, expect, vi, beforeEach, Mock } from "vitest";
import {
  vectorSearch,
  VectorSearchParams,
} from "../vector-search";
import { getSupabaseAdmin } from "../../lib/supabase";

// Supabaseクライアントのモック
vi.mock("../../lib/supabase", () => ({
  getSupabaseAdmin: vi.fn(),
}));

// モックデータ
const mockSearchResults = [
  { id: "SCP-096", title: "SCP-096 - The Shy Guy", similarity_score: 0.92 },
  { id: "SCP-106", title: "SCP-106 - The Old Man", similarity_score: 0.88 },
  { id: "SCP-087", title: "SCP-087 - The Stairwell", similarity_score: 0.85 },
  { id: "SCP-049", title: "SCP-049 - Plague Doctor", similarity_score: 0.82 },
  { id: "SCP-682", title: "SCP-682 - Hard-to-Destroy Reptile", similarity_score: 0.79 },
];

const mockQueryArticle = {
  title: "SCP-173 - The Sculpture",
};

describe("vectorSearch", () => {
  let mockRpc: Mock;
  let mockFrom: Mock;

  beforeEach(() => {
    vi.clearAllMocks();

    // Set up nested mock structure
    mockRpc = vi.fn().mockResolvedValue({
      data: mockSearchResults,
      error: null,
    });

    mockFrom = vi.fn().mockReturnValue({
      select: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          single: vi.fn().mockResolvedValue({
            data: mockQueryArticle,
            error: null,
          }),
        }),
      }),
    });

    (getSupabaseAdmin as Mock).mockReturnValue({
      rpc: mockRpc,
      from: mockFrom,
    });
  });

  describe("基本検索", () => {
    it("指定した記事IDで検索できる", async () => {
      const params: VectorSearchParams = {
        queryId: "SCP-173",
        limit: 5,
      };

      const response = await vectorSearch(params);

      expect(response.queryId).toBe("SCP-173");
      expect(response.queryTitle).toBe("SCP-173 - The Sculpture");
      expect(response).toHaveProperty("results");
      expect(response).toHaveProperty("searchTimeMs");
    });

    it("デフォルトで上位5件の結果が返される", async () => {
      const params: VectorSearchParams = {
        queryId: "SCP-173",
      };

      const response = await vectorSearch(params);

      expect(response.results.length).toBe(5);
      expect(mockRpc).toHaveBeenCalledWith("search_similar_articles", {
        query_id: "SCP-173",
        match_count: 5,
      });
    });

    it("limitパラメータで結果件数を制御できる", async () => {
      const params: VectorSearchParams = {
        queryId: "SCP-173",
        limit: 10,
      };

      await vectorSearch(params);

      expect(mockRpc).toHaveBeenCalledWith("search_similar_articles", {
        query_id: "SCP-173",
        match_count: 10,
      });
    });

    it("クエリ記事自身が結果に含まれない", async () => {
      const params: VectorSearchParams = {
        queryId: "SCP-173",
        limit: 5,
      };

      const response = await vectorSearch(params);

      const selfIncluded = response.results.some(
        (r) => r.articleId === params.queryId
      );
      expect(selfIncluded).toBe(false);
    });

    it("各結果にarticleId, title, similarityScoreが含まれる", async () => {
      const params: VectorSearchParams = {
        queryId: "SCP-173",
        limit: 5,
      };

      const response = await vectorSearch(params);

      response.results.forEach((result) => {
        expect(result).toHaveProperty("articleId");
        expect(result).toHaveProperty("title");
        expect(result).toHaveProperty("similarityScore");
      });
    });
  });

  describe("スコアの妥当性", () => {
    it("similarityScoreが0-1の範囲である", async () => {
      const params: VectorSearchParams = {
        queryId: "SCP-173",
        limit: 5,
      };

      const response = await vectorSearch(params);

      response.results.forEach((result) => {
        expect(result.similarityScore).toBeGreaterThanOrEqual(0);
        expect(result.similarityScore).toBeLessThanOrEqual(1);
      });
    });

    it("結果がsimilarityScoreの降順でソートされている", async () => {
      const params: VectorSearchParams = {
        queryId: "SCP-173",
        limit: 5,
      };

      const response = await vectorSearch(params);

      for (let i = 1; i < response.results.length; i++) {
        expect(response.results[i - 1].similarityScore).toBeGreaterThanOrEqual(
          response.results[i].similarityScore
        );
      }
    });
  });

  describe("パフォーマンス", () => {
    it("検索時間がレスポンスに含まれる", async () => {
      const params: VectorSearchParams = {
        queryId: "SCP-173",
        limit: 5,
      };

      const response = await vectorSearch(params);

      expect(response.searchTimeMs).toBeGreaterThanOrEqual(0);
      expect(typeof response.searchTimeMs).toBe("number");
    });
  });

  describe("エラーハンドリング", () => {
    it("存在しない記事IDでエラーをスローする", async () => {
      // Mock article not found
      mockFrom.mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({
              data: null,
              error: { message: "Article not found" },
            }),
          }),
        }),
      });

      const params: VectorSearchParams = {
        queryId: "SCP-NONEXISTENT",
        limit: 5,
      };

      await expect(vectorSearch(params)).rejects.toThrow("記事が見つかりません");
    });

    it("検索エラー時にエラーをスローする", async () => {
      mockRpc.mockResolvedValue({
        data: null,
        error: { message: "Database connection failed" },
      });

      const params: VectorSearchParams = {
        queryId: "SCP-173",
        limit: 5,
      };

      await expect(vectorSearch(params)).rejects.toThrow("検索失敗");
    });
  });
});
