/**
 * DB保存ユーティリティのテスト
 * Subtask: 003-02-02
 */

import { describe, it, expect, vi } from "vitest";
import { DbSaver } from "../db-saver";
import type { ArticleContent } from "../../types";

/**
 * テスト用モックSupabaseクライアントを作成
 */
const createMockSupabaseClient = () => ({
  from: vi.fn().mockReturnThis(),
  upsert: vi.fn().mockResolvedValue({ error: null }),
});

describe("DbSaver", () => {
  const mockArticle: ArticleContent = {
    id: "SCP-173",
    title: "The Sculpture - The Original",
    content: "Item #: SCP-173 Object Class: Euclid...",
    rating: 7500,
    tags: ["euclid", "sculpture", "autonomous"],
    createdAt: new Date("2007-06-22T00:00:00Z"),
    updatedAt: new Date("2007-06-22T00:00:00Z"),
  };

  describe("saveArticle", () => {
    it("記事をscp_articlesテーブルに保存する", async () => {
      const mockClient = createMockSupabaseClient();
      const saver = new DbSaver(mockClient, { lang: "en" });

      await saver.saveArticle(mockArticle);

      expect(mockClient.from).toHaveBeenCalledWith("scp_articles");
      expect(mockClient.upsert).toHaveBeenCalledWith(
        expect.objectContaining({
          article_id: "SCP-173",
          title: "The Sculpture - The Original",
          content: "Item #: SCP-173 Object Class: Euclid...",
          rating: 7500,
          lang: "en",
        }),
        expect.any(Object)
      );
    });

    it("embedding_statusがpendingで保存される", async () => {
      const mockClient = createMockSupabaseClient();
      const saver = new DbSaver(mockClient, { lang: "en" });

      await saver.saveArticle(mockArticle);

      expect(mockClient.upsert).toHaveBeenCalledWith(
        expect.objectContaining({
          embedding_status: "pending",
        }),
        expect.any(Object)
      );
    });

    it("tagging_statusがpendingで保存される", async () => {
      const mockClient = createMockSupabaseClient();
      const saver = new DbSaver(mockClient, { lang: "en" });

      await saver.saveArticle(mockArticle);

      expect(mockClient.upsert).toHaveBeenCalledWith(
        expect.objectContaining({
          tagging_status: "pending",
        }),
        expect.any(Object)
      );
    });

    it("tagsがJSON配列で保存される", async () => {
      const mockClient = createMockSupabaseClient();
      const saver = new DbSaver(mockClient, { lang: "en" });

      await saver.saveArticle(mockArticle);

      expect(mockClient.upsert).toHaveBeenCalledWith(
        expect.objectContaining({
          tags: ["euclid", "sculpture", "autonomous"],
        }),
        expect.any(Object)
      );
    });

    it("fetched_atが現在時刻で保存される", async () => {
      const mockClient = createMockSupabaseClient();
      const saver = new DbSaver(mockClient, { lang: "en" });
      const beforeSave = new Date();

      await saver.saveArticle(mockArticle);

      const call = mockClient.upsert.mock.calls[0][0] as { fetched_at: string };
      const savedAt = new Date(call.fetched_at);
      expect(savedAt.getTime()).toBeGreaterThanOrEqual(beforeSave.getTime());
    });

    it("upsertで既存記事を更新する", async () => {
      const mockClient = createMockSupabaseClient();
      const saver = new DbSaver(mockClient, { lang: "en" });

      await saver.saveArticle(mockArticle);

      expect(mockClient.upsert).toHaveBeenCalledWith(
        expect.any(Object),
        expect.objectContaining({
          onConflict: "article_id,lang",
        })
      );
    });
  });

  describe("saveArticles", () => {
    it("複数記事をバッチ保存できる", async () => {
      const mockClient = createMockSupabaseClient();
      const saver = new DbSaver(mockClient, { lang: "en" });
      const articles = [mockArticle, { ...mockArticle, id: "SCP-049", title: "Plague Doctor" }];

      const results = await saver.saveArticles(articles);

      expect(results.success).toBe(2);
      expect(results.failed).toBe(0);
    });

    it("一部失敗時も他の記事は保存を続ける", async () => {
      const mockClient = createMockSupabaseClient();
      mockClient.upsert
        .mockResolvedValueOnce({ error: null })
        .mockResolvedValueOnce({ error: { message: "DB error" } })
        .mockResolvedValueOnce({ error: null });

      const saver = new DbSaver(mockClient, { lang: "en" });
      const articles = [
        mockArticle,
        { ...mockArticle, id: "SCP-ERROR" },
        { ...mockArticle, id: "SCP-049" },
      ];

      const results = await saver.saveArticles(articles);

      expect(results.success).toBe(2);
      expect(results.failed).toBe(1);
      expect(results.failedIds).toContain("SCP-ERROR");
    });
  });

  describe("エラーハンドリング", () => {
    it("DB接続エラー時にエラーをスローする", async () => {
      const mockClient = createMockSupabaseClient();
      mockClient.upsert.mockResolvedValue({
        error: { message: "Connection failed" },
      });

      const saver = new DbSaver(mockClient, { lang: "en" });

      await expect(saver.saveArticle(mockArticle)).rejects.toThrow("Connection failed");
    });

    it("onErrorコールバックが呼ばれる", async () => {
      const onError = vi.fn();
      const mockClient = createMockSupabaseClient();
      mockClient.upsert.mockResolvedValue({
        error: { message: "DB error" },
      });

      const saver = new DbSaver(mockClient, { lang: "en", onError });

      await expect(saver.saveArticle(mockArticle)).rejects.toThrow();
      expect(onError).toHaveBeenCalledWith("SCP-173", expect.any(Error));
    });
  });

  describe("ドライラン", () => {
    it("dryRun時はDBに保存しない", async () => {
      const mockClient = createMockSupabaseClient();
      const saver = new DbSaver(mockClient, { lang: "en", dryRun: true });

      await saver.saveArticle(mockArticle);

      expect(mockClient.from).not.toHaveBeenCalled();
      expect(mockClient.upsert).not.toHaveBeenCalled();
    });
  });
});
