/**
 * @file ArticlesRepository テスト
 * @description articlesドメインのDB操作層テスト
 * @see specs/005-backend-api/005-04-articles-api/005-04-01.md
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import { ArticlesRepository } from "../repository";
import type { SupabaseClient } from "@supabase/supabase-js";

describe("ArticlesRepository", () => {
  let repository: ArticlesRepository;
  let mockSupabase: {
    rpc: ReturnType<typeof vi.fn>;
    from: ReturnType<typeof vi.fn>;
  };

  beforeEach(() => {
    vi.clearAllMocks();
    mockSupabase = {
      rpc: vi.fn(),
      from: vi.fn(),
    };
    repository = new ArticlesRepository(mockSupabase as unknown as SupabaseClient);
  });

  describe("インスタンス化", () => {
    it("インスタンス化時にsearchByEmbeddingメソッドを提供する", () => {
      expect(repository.searchByEmbedding).toBeDefined();
      expect(typeof repository.searchByEmbedding).toBe("function");
    });

    it("インスタンス化時にgetArticleByIdメソッドを提供する", () => {
      expect(repository.getArticleById).toBeDefined();
      expect(typeof repository.getArticleById).toBe("function");
    });
  });

  describe("searchByEmbedding", () => {
    it("ベクトル検索結果を取得できる", async () => {
      const mockResults = [
        { id: "scp-173", title: "The Sculpture", similarity: 0.95 },
        { id: "scp-096", title: "The Shy Guy", similarity: 0.87 },
      ];
      mockSupabase.rpc.mockResolvedValue({ data: mockResults, error: null });

      const result = await repository.searchByEmbedding([0.1, 0.2, 0.3]);

      expect(result).toEqual(mockResults);
      expect(mockSupabase.rpc).toHaveBeenCalledWith("search_articles_by_embedding", {
        query_vector: [0.1, 0.2, 0.3],
        exclude_ids: [],
        match_count: 10,
      });
    });

    it("limitを指定して検索できる", async () => {
      mockSupabase.rpc.mockResolvedValue({ data: [], error: null });

      await repository.searchByEmbedding([0.1, 0.2], { limit: 5 });

      expect(mockSupabase.rpc).toHaveBeenCalledWith(
        "search_articles_by_embedding",
        expect.objectContaining({ match_count: 5 })
      );
    });

    it("excludeIdsを指定して検索できる", async () => {
      mockSupabase.rpc.mockResolvedValue({ data: [], error: null });

      await repository.searchByEmbedding([0.1, 0.2], {
        excludeIds: ["scp-173", "scp-096"],
      });

      expect(mockSupabase.rpc).toHaveBeenCalledWith(
        "search_articles_by_embedding",
        expect.objectContaining({ exclude_ids: ["scp-173", "scp-096"] })
      );
    });

    it("dataがnullの場合、空配列を返す", async () => {
      mockSupabase.rpc.mockResolvedValue({ data: null, error: null });

      const result = await repository.searchByEmbedding([0.1, 0.2]);

      expect(result).toEqual([]);
    });

    it("RPC関数エラー時に例外をthrowする", async () => {
      const mockError = { code: "ERROR", message: "RPC function not found" };
      mockSupabase.rpc.mockResolvedValue({ data: null, error: mockError });

      await expect(repository.searchByEmbedding([0.1, 0.2])).rejects.toEqual(mockError);
    });
  });

  describe("getArticleById", () => {
    it("記事詳細を取得できる", async () => {
      const mockArticle = {
        id: "scp-173",
        title: "The Sculpture",
        url: "https://scp-wiki.wikidot.com/scp-173",
        tags: ["safe", "sculpture"],
        rating: 1500,
      };
      const mockChain = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({ data: mockArticle, error: null }),
      };
      mockSupabase.from.mockReturnValue(mockChain);

      const result = await repository.getArticleById("scp-173");

      expect(result).toEqual(mockArticle);
      expect(mockSupabase.from).toHaveBeenCalledWith("scp_articles");
      expect(mockChain.select).toHaveBeenCalledWith("id, title, url, tags, rating");
      expect(mockChain.eq).toHaveBeenCalledWith("id", "scp-173");
    });

    it("存在しない記事IDでnullを返す", async () => {
      const mockChain = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({ data: null, error: { code: "PGRST116" } }),
      };
      mockSupabase.from.mockReturnValue(mockChain);

      const result = await repository.getArticleById("nonexistent");

      expect(result).toBeNull();
    });

    it("ratingがnullの記事を取得できる", async () => {
      const mockArticle = {
        id: "scp-unknown",
        title: "Unknown",
        url: "https://example.com",
        tags: [],
        rating: null,
      };
      const mockChain = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({ data: mockArticle, error: null }),
      };
      mockSupabase.from.mockReturnValue(mockChain);

      const result = await repository.getArticleById("scp-unknown");

      expect(result?.rating).toBeNull();
    });

    it("PGRST116以外のDBエラー時に例外をthrowする", async () => {
      const mockError = { code: "PGRST500", message: "DB Error" };
      const mockChain = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({ data: null, error: mockError }),
      };
      mockSupabase.from.mockReturnValue(mockChain);

      await expect(repository.getArticleById("test")).rejects.toEqual(mockError);
    });
  });
});
