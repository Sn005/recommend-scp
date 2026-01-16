/**
 * 差分クロール用DB操作のテスト
 * Subtask: 003-02-03
 */

import { describe, it, expect, vi } from "vitest";
import { DiffDbOperations, type ExtendedSupabaseClient } from "../diff-db-operations";
import type { ArticleContent, DbArticle } from "../../types";

// モックSupabaseクライアント
const createMockClient = () => {
  let selectResult: { data: DbArticle[] | null; error: { message: string } | null } = {
    data: [],
    error: null,
  };
  let updateResult: { error: { message: string } | null } = { error: null };
  let upsertResult: { error: { message: string } | null } = { error: null };

  const mockSelect = vi.fn();
  const mockUpdate = vi.fn();
  const mockUpsert = vi.fn();
  const mockEq = vi.fn();
  const mockOrder = vi.fn();

  const from = vi.fn().mockImplementation(() => {
    // select チェーン
    const selectChain = {
      eq: vi.fn().mockReturnValue({
        order: vi.fn().mockImplementation(() => Promise.resolve(selectResult)),
      }),
    };
    mockSelect.mockReturnValue(selectChain);

    // update チェーン（複数のeqに対応）
    const createUpdateEq = (): ReturnType<typeof vi.fn> => {
      const eqFn = vi.fn().mockImplementation(() => {
        const nestedEq = vi.fn().mockImplementation(() => Promise.resolve(updateResult));
        return Object.assign(Promise.resolve(updateResult), { eq: nestedEq });
      });
      mockEq.mockImplementation(eqFn);
      return eqFn;
    };

    mockUpdate.mockReturnValue({
      eq: createUpdateEq(),
    });

    return {
      select: mockSelect,
      update: mockUpdate,
      upsert: mockUpsert.mockImplementation(() => Promise.resolve(upsertResult)),
    };
  });

  return {
    from,
    mockSelect,
    mockUpdate,
    mockUpsert,
    mockEq,
    mockOrder,
    setSelectResult: (data: DbArticle[] | null, error: { message: string } | null = null) => {
      selectResult = { data, error };
    },
    setUpdateResult: (error: { message: string } | null = null) => {
      updateResult = { error };
    },
    setUpsertResult: (error: { message: string } | null = null) => {
      upsertResult = { error };
    },
  };
};

describe("DiffDbOperations", () => {
  describe("fetchExistingArticles", () => {
    it("指定言語の記事一覧を取得する", async () => {
      const mockClient = createMockClient();
      const expectedArticles: DbArticle[] = [
        {
          article_id: "SCP-001",
          lang: "en",
          title: "SCP-001",
          content: "Content",
          rating: 100,
          tags: ["scp"],
          fetched_at: "2024-01-01T00:00:00Z",
          updated_at: "2024-01-01T00:00:00Z",
          embedding_status: "completed",
          tagging_status: "completed",
          content_hash: "hash",
          is_deleted: false,
        },
      ];
      mockClient.setSelectResult(expectedArticles);

      const dbOps = new DiffDbOperations(mockClient as unknown as ExtendedSupabaseClient);
      const result = await dbOps.fetchExistingArticles("en");

      expect(mockClient.from).toHaveBeenCalledWith("scp_articles");
      expect(mockClient.mockSelect).toHaveBeenCalled();
      expect(result).toEqual(expectedArticles);
    });

    it("エラー時は空配列を返す", async () => {
      const mockClient = createMockClient();
      mockClient.setSelectResult(null, { message: "DB error" });

      const dbOps = new DiffDbOperations(mockClient as unknown as ExtendedSupabaseClient);
      const result = await dbOps.fetchExistingArticles("en");

      expect(result).toEqual([]);
    });
  });

  describe("saveArticle", () => {
    it("新規記事をDBに保存する", async () => {
      const mockClient = createMockClient();
      mockClient.setUpsertResult(null);

      const article: ArticleContent = {
        id: "SCP-001",
        title: "SCP-001",
        content: "Content",
        rating: 100,
        tags: ["scp"],
        createdAt: new Date("2024-01-01"),
        updatedAt: new Date("2024-01-01"),
      };

      const dbOps = new DiffDbOperations(mockClient as unknown as ExtendedSupabaseClient);
      await dbOps.saveArticle(article, "en");

      expect(mockClient.from).toHaveBeenCalledWith("scp_articles");
      expect(mockClient.mockUpsert).toHaveBeenCalledWith(
        expect.objectContaining({
          article_id: "SCP-001",
          lang: "en",
          embedding_status: "pending",
          tagging_status: "pending",
        }),
        { onConflict: "article_id,lang" }
      );
    });

    it("エラー時は例外をスローする", async () => {
      const mockClient = createMockClient();
      mockClient.setUpsertResult({ message: "Insert error" });

      const article: ArticleContent = {
        id: "SCP-001",
        title: "SCP-001",
        content: "Content",
        rating: 100,
        tags: ["scp"],
        createdAt: new Date("2024-01-01"),
        updatedAt: new Date("2024-01-01"),
      };

      const dbOps = new DiffDbOperations(mockClient as unknown as ExtendedSupabaseClient);
      await expect(dbOps.saveArticle(article, "en")).rejects.toThrow("Insert error");
    });
  });

  describe("updateArticle", () => {
    it("記事を更新しステータスをpendingにリセットする", async () => {
      const mockClient = createMockClient();
      mockClient.setUpdateResult(null);

      const updateData = {
        id: "SCP-001",
        lang: "en",
        content: "New content",
        title: "SCP-001 Updated",
        rating: 150,
        tags: ["scp", "keter"],
        content_hash: "newhash",
        embedding_status: "pending" as const,
        tagging_status: "pending" as const,
      };

      const dbOps = new DiffDbOperations(mockClient as unknown as ExtendedSupabaseClient);
      await dbOps.updateArticle(updateData);

      expect(mockClient.from).toHaveBeenCalledWith("scp_articles");
      expect(mockClient.mockUpdate).toHaveBeenCalledWith(
        expect.objectContaining({
          content: "New content",
          title: "SCP-001 Updated",
          rating: 150,
          tags: ["scp", "keter"],
          content_hash: "newhash",
          embedding_status: "pending",
          tagging_status: "pending",
        })
      );
    });
  });

  describe("markAsDeleted", () => {
    it("記事を論理削除する", async () => {
      const mockClient = createMockClient();
      mockClient.setUpdateResult(null);

      const dbOps = new DiffDbOperations(mockClient as unknown as ExtendedSupabaseClient);
      await dbOps.markAsDeleted("SCP-001", "en");

      expect(mockClient.from).toHaveBeenCalledWith("scp_articles");
      expect(mockClient.mockUpdate).toHaveBeenCalledWith({ is_deleted: true });
    });

    it("エラー時は例外をスローする", async () => {
      const mockClient = createMockClient();
      mockClient.setUpdateResult({ message: "Update error" });

      const dbOps = new DiffDbOperations(mockClient as unknown as ExtendedSupabaseClient);
      await expect(dbOps.markAsDeleted("SCP-001", "en")).rejects.toThrow("Update error");
    });
  });
});
