/**
 * @file SupabaseTagStorage テスト
 * @description Subtask 004-01-04 のACを検証するテスト
 * @see specs/004-recommend/004-01-recommend-foundation/004-01-04.md
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import type { SupabaseClient } from "@supabase/supabase-js";
import { SupabaseTagStorage } from "./supabase-tag-storage";

/**
 * Supabaseクライアントのモックを作成
 */
function createMockSupabaseClient(options: {
  data?: { tags: { value: string } }[] | null;
  error?: { message: string } | null;
}): SupabaseClient {
  const { data = null, error = null } = options;

  return {
    from: vi.fn().mockReturnValue({
      select: vi.fn().mockReturnValue({
        eq: vi.fn().mockResolvedValue({ data, error }),
      }),
    }),
  } as unknown as SupabaseClient;
}

describe("004-01-04: SupabaseTagStorage", () => {
  describe("AC1: 基本機能 - タグ取得", () => {
    describe("WHEN 記事IDを指定してタグを取得する際", () => {
      describe("GIVEN 該当記事が article_tags テーブルに存在する場合", () => {
        it("THEN システムは関連するタグ値の配列を返す", async () => {
          // Arrange
          const mockSupabase = createMockSupabaseClient({
            data: [{ tags: { value: "horror" } }, { tags: { value: "euclid" } }],
            error: null,
          });
          const storage = new SupabaseTagStorage(mockSupabase);

          // Act
          const tags = await storage.getArticleTags("scp-173");

          // Assert
          expect(tags).toEqual(["horror", "euclid"]);
        });

        it("AND タグはカテゴリに関係なく全て含まれる（object_class, genre, theme, format）", async () => {
          // Arrange
          const mockSupabase = createMockSupabaseClient({
            data: [
              { tags: { value: "safe" } }, // object_class
              { tags: { value: "horror" } }, // genre
              { tags: { value: "cognitohazard" } }, // theme
              { tags: { value: "narrative" } }, // format
            ],
            error: null,
          });
          const storage = new SupabaseTagStorage(mockSupabase);

          // Act
          const tags = await storage.getArticleTags("scp-173");

          // Assert
          expect(tags).toHaveLength(4);
          expect(tags).toContain("safe");
          expect(tags).toContain("horror");
          expect(tags).toContain("cognitohazard");
          expect(tags).toContain("narrative");
        });
      });
    });
  });

  describe("AC2: 基本機能 - 記事が存在しない場合", () => {
    describe("WHEN 記事IDを指定してタグを取得する際", () => {
      describe("GIVEN 該当記事が存在しない、または article_tags にデータがない場合", () => {
        it("THEN システムは空配列 [] を返す（data = []）", async () => {
          // Arrange
          const mockSupabase = createMockSupabaseClient({
            data: [],
            error: null,
          });
          const storage = new SupabaseTagStorage(mockSupabase);

          // Act
          const tags = await storage.getArticleTags("nonexistent-article");

          // Assert
          expect(tags).toEqual([]);
        });

        it("THEN システムは空配列 [] を返す（data = null）", async () => {
          // Arrange
          const mockSupabase = createMockSupabaseClient({
            data: null,
            error: null,
          });
          const storage = new SupabaseTagStorage(mockSupabase);

          // Act
          const tags = await storage.getArticleTags("nonexistent-article");

          // Assert
          expect(tags).toEqual([]);
        });
      });
    });
  });

  describe("AC3: エラーハンドリング", () => {
    describe("WHEN Supabase接続に失敗した際", () => {
      describe("GIVEN ネットワークエラーまたはDB接続エラーが発生した場合", () => {
        it("THEN システムはエラーをスローする", async () => {
          // Arrange
          const mockSupabase = createMockSupabaseClient({
            data: null,
            error: { message: "Network error" },
          });
          const storage = new SupabaseTagStorage(mockSupabase);

          // Act & Assert
          await expect(storage.getArticleTags("scp-173")).rejects.toThrow();
        });

        it("AND エラーメッセージに原因を含める", async () => {
          // Arrange
          const mockSupabase = createMockSupabaseClient({
            data: null,
            error: { message: "Connection timeout" },
          });
          const storage = new SupabaseTagStorage(mockSupabase);

          // Act & Assert
          await expect(storage.getArticleTags("scp-173")).rejects.toThrow(
            "Failed to fetch tags for article scp-173: Connection timeout"
          );
        });
      });
    });
  });

  describe("エッジケース - 入力値", () => {
    it("空文字列IDで空配列を返す", async () => {
      // Arrange
      const mockSupabase = createMockSupabaseClient({
        data: [],
        error: null,
      });
      const storage = new SupabaseTagStorage(mockSupabase);

      // Act
      const tags = await storage.getArticleTags("");

      // Assert
      expect(tags).toEqual([]);
    });

    it("正しいクエリパラメータでSupabaseが呼び出される", async () => {
      // Arrange
      const fromMock = vi.fn().mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockResolvedValue({ data: [], error: null }),
        }),
      });
      const mockSupabase = { from: fromMock } as unknown as SupabaseClient;
      const storage = new SupabaseTagStorage(mockSupabase);

      // Act
      await storage.getArticleTags("scp-173");

      // Assert
      expect(fromMock).toHaveBeenCalledWith("article_tags");
    });
  });

  describe("エッジケース - タグ値の処理", () => {
    it("単一タグの場合でも配列で返す", async () => {
      // Arrange
      const mockSupabase = createMockSupabaseClient({
        data: [{ tags: { value: "horror" } }],
        error: null,
      });
      const storage = new SupabaseTagStorage(mockSupabase);

      // Act
      const tags = await storage.getArticleTags("scp-173");

      // Assert
      expect(tags).toEqual(["horror"]);
      expect(Array.isArray(tags)).toBe(true);
    });

    it("多数のタグを全て返す", async () => {
      // Arrange
      const manyTags = Array.from({ length: 20 }, (_, i) => ({
        tags: { value: `tag-${i}` },
      }));
      const mockSupabase = createMockSupabaseClient({
        data: manyTags,
        error: null,
      });
      const storage = new SupabaseTagStorage(mockSupabase);

      // Act
      const tags = await storage.getArticleTags("scp-173");

      // Assert
      expect(tags).toHaveLength(20);
    });
  });
});
