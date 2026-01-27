/**
 * @file ArticlesService テスト
 * @description articlesドメインのビジネスロジック層テスト
 * @see specs/005-backend-api/005-04-articles-api/005-04-01.md
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import { ArticlesService } from "../service";
import type { ArticlesRepository } from "../repository";
import { createEmbedding } from "../../../lib/openai";

// openaiモジュールをモック
vi.mock("../../../lib/openai", () => ({
  createEmbedding: vi.fn(),
}));

// モックされた関数への参照を取得
const mockCreateEmbedding = vi.mocked(createEmbedding);

describe("ArticlesService", () => {
  let service: ArticlesService;
  let mockRepository: {
    searchByEmbedding: ReturnType<typeof vi.fn>;
    getArticleById: ReturnType<typeof vi.fn>;
  };

  beforeEach(() => {
    vi.clearAllMocks();
    mockRepository = {
      searchByEmbedding: vi.fn(),
      getArticleById: vi.fn(),
    };
    service = new ArticlesService(mockRepository as unknown as ArticlesRepository);
  });

  describe("インスタンス化", () => {
    it("インスタンス化時にsearchArticlesメソッドを提供する", () => {
      expect(service.searchArticles).toBeDefined();
      expect(typeof service.searchArticles).toBe("function");
    });
  });

  describe("searchArticles", () => {
    it("有効なクエリでEmbedding APIを呼び出す", async () => {
      const mockVector = [0.1, 0.2, 0.3];
      mockCreateEmbedding.mockResolvedValue(mockVector);
      mockRepository.searchByEmbedding.mockResolvedValue([]);

      await service.searchArticles("ホラー系のscp");

      expect(mockCreateEmbedding).toHaveBeenCalledWith("ホラー系のscp");
    });

    it("ベクトル検索RPC関数を呼び出す", async () => {
      const mockVector = [0.1, 0.2, 0.3];
      mockCreateEmbedding.mockResolvedValue(mockVector);
      mockRepository.searchByEmbedding.mockResolvedValue([]);

      await service.searchArticles("test query");

      expect(mockRepository.searchByEmbedding).toHaveBeenCalledWith(mockVector, {
        limit: 10,
      });
    });

    it("類似度降順でソートされた結果を返す", async () => {
      const mockResults = [
        { id: "scp-173", title: "The Sculpture", similarity: 0.95 },
        { id: "scp-096", title: "The Shy Guy", similarity: 0.87 },
        { id: "scp-682", title: "Hard-to-Destroy Reptile", similarity: 0.75 },
      ];
      mockCreateEmbedding.mockResolvedValue([0.1, 0.2]);
      mockRepository.searchByEmbedding.mockResolvedValue(mockResults);

      const result = await service.searchArticles("test");

      expect(result.articles[0].similarity).toBe(0.95);
      expect(result.articles[1].similarity).toBe(0.87);
      expect(result.articles[2].similarity).toBe(0.75);
      expect(result.articles[0].similarity).toBeGreaterThanOrEqual(result.articles[1].similarity);
    });

    it("検索結果のレスポンス形式が正しい", async () => {
      const mockResults = [{ id: "scp-173", title: "The Sculpture", similarity: 0.95 }];
      mockCreateEmbedding.mockResolvedValue([0.1, 0.2]);
      mockRepository.searchByEmbedding.mockResolvedValue(mockResults);

      const result = await service.searchArticles("horror");

      expect(result).toEqual({
        articles: [{ id: "scp-173", title: "The Sculpture", similarity: 0.95 }],
        total: 1,
        query: "horror",
      });
    });

    it("limitオプションが指定された場合、repositoryに渡される", async () => {
      mockCreateEmbedding.mockResolvedValue([0.1, 0.2]);
      mockRepository.searchByEmbedding.mockResolvedValue([]);

      await service.searchArticles("test", { limit: 5 });

      expect(mockRepository.searchByEmbedding).toHaveBeenCalledWith([0.1, 0.2], {
        limit: 5,
      });
    });

    it("検索結果が0件の場合、空配列を返す", async () => {
      mockCreateEmbedding.mockResolvedValue([0.1, 0.2]);
      mockRepository.searchByEmbedding.mockResolvedValue([]);

      const result = await service.searchArticles("nonexistent");

      expect(result.articles).toEqual([]);
      expect(result.total).toBe(0);
    });
  });

  describe("多言語対応", () => {
    it("日本語クエリで検索できる", async () => {
      const mockResults = [{ id: "scp-173", title: "The Sculpture", similarity: 0.9 }];
      mockCreateEmbedding.mockResolvedValue([0.1, 0.2]);
      mockRepository.searchByEmbedding.mockResolvedValue(mockResults);

      const result = await service.searchArticles("ホラー系のscp");

      expect(result.articles).toHaveLength(1);
      expect(mockCreateEmbedding).toHaveBeenCalledWith("ホラー系のscp");
    });

    it("英語クエリで検索できる", async () => {
      const mockResults = [{ id: "scp-096", title: "The Shy Guy", similarity: 0.85 }];
      mockCreateEmbedding.mockResolvedValue([0.3, 0.4]);
      mockRepository.searchByEmbedding.mockResolvedValue(mockResults);

      const result = await service.searchArticles("horror scp");

      expect(result.articles).toHaveLength(1);
      expect(mockCreateEmbedding).toHaveBeenCalledWith("horror scp");
    });

    it("日英混在テキストを正常に処理する", async () => {
      mockCreateEmbedding.mockResolvedValue([0.5, 0.6]);
      mockRepository.searchByEmbedding.mockResolvedValue([]);

      const result = await service.searchArticles("ホラー horror 怖い scary");

      expect(result.articles).toEqual([]);
      expect(mockCreateEmbedding).toHaveBeenCalledWith("ホラー horror 怖い scary");
    });
  });

  describe("異常系", () => {
    it("OpenAI APIエラー時に例外をthrowする", async () => {
      const apiError = new Error("OpenAI API rate limit exceeded");
      mockCreateEmbedding.mockRejectedValue(apiError);

      await expect(service.searchArticles("test")).rejects.toThrow(
        "OpenAI API rate limit exceeded"
      );
    });

    it("RPC関数エラー時に例外をthrowする", async () => {
      mockCreateEmbedding.mockResolvedValue([0.1, 0.2]);
      const dbError = new Error("RPC function not found");
      mockRepository.searchByEmbedding.mockRejectedValue(dbError);

      await expect(service.searchArticles("test")).rejects.toThrow("RPC function not found");
    });
  });
});
