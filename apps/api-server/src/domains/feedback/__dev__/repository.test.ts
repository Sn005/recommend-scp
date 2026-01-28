/**
 * @file FeedbackRepository テスト
 * @description feedbackテーブルのDB操作層テスト
 * @see specs/005-backend-api/005-06-feedback-api/005-06-01.md
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Feedback } from "@recommend-scp/shared/storage/server";
import { FeedbackRepository } from "../repository";

/** モック用DB行の型 */
interface MockFeedbackRow {
  id: string;
  visitor_id: string;
  article_id: string;
  type: "like" | "dislike";
  created_at: string;
}

/** モック結果の型 */
interface MockQueryResult {
  data: MockFeedbackRow | MockFeedbackRow[] | null;
  error: { code: string; message: string } | null;
}

/**
 * Supabase upsert クエリビルダーのモック作成ヘルパー
 */
const createUpsertQueryMock = (result: MockQueryResult) => ({
  upsert: vi.fn().mockReturnValue({
    select: vi.fn().mockReturnValue({
      single: vi.fn().mockResolvedValue(result),
    }),
  }),
  select: vi.fn().mockReturnValue({
    eq: vi.fn().mockResolvedValue(result),
  }),
});

describe("FeedbackRepository", () => {
  let repository: FeedbackRepository;
  let mockSupabase: SupabaseClient;
  let mockFrom: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    vi.clearAllMocks();
    mockFrom = vi.fn();
    mockSupabase = {
      from: mockFrom,
    } as unknown as SupabaseClient;
    repository = new FeedbackRepository(mockSupabase);
  });

  describe("save", () => {
    it("フィードバックを保存できる", async () => {
      const mockRow: MockFeedbackRow = {
        id: "uuid-123",
        visitor_id: "visitor-1",
        article_id: "article-1",
        type: "like",
        created_at: "2025-01-20T10:00:00Z",
      };
      const queryMock = createUpsertQueryMock({ data: mockRow, error: null });
      mockFrom.mockReturnValue(queryMock);

      const result: Feedback = await repository.save({
        visitorId: "visitor-1",
        articleId: "article-1",
        type: "like",
        createdAt: "2025-01-20T10:00:00Z",
      });

      expect(result.id).toBe("uuid-123");
      expect(result.visitorId).toBe("visitor-1");
      expect(result.articleId).toBe("article-1");
      expect(result.type).toBe("like");
      expect(result.createdAt).toBe("2025-01-20T10:00:00Z");
      expect(mockFrom).toHaveBeenCalledWith("feedback");
      expect(queryMock.upsert).toHaveBeenCalledWith(
        {
          visitor_id: "visitor-1",
          article_id: "article-1",
          type: "like",
          created_at: "2025-01-20T10:00:00Z",
        },
        { onConflict: "visitor_id,article_id" }
      );
    });

    it("同じvisitorId+articleIdで上書きできる", async () => {
      const mockRow: MockFeedbackRow = {
        id: "uuid-123",
        visitor_id: "visitor-1",
        article_id: "article-1",
        type: "dislike",
        created_at: "2025-01-20T12:00:00Z",
      };
      const queryMock = createUpsertQueryMock({ data: mockRow, error: null });
      mockFrom.mockReturnValue(queryMock);

      const result: Feedback = await repository.save({
        visitorId: "visitor-1",
        articleId: "article-1",
        type: "dislike",
        createdAt: "2025-01-20T12:00:00Z",
      });

      expect(result.type).toBe("dislike");
      expect(queryMock.upsert).toHaveBeenCalledWith(
        expect.objectContaining({
          visitor_id: "visitor-1",
          article_id: "article-1",
          type: "dislike",
        }),
        { onConflict: "visitor_id,article_id" }
      );
    });

    it("DBエラー時に例外をスローする", async () => {
      const queryMock = createUpsertQueryMock({
        data: null,
        error: { code: "PGRST500", message: "DB Error" },
      });
      mockFrom.mockReturnValue(queryMock);

      await expect(
        repository.save({
          visitorId: "visitor-1",
          articleId: "article-1",
          type: "like",
          createdAt: "2025-01-20T10:00:00Z",
        })
      ).rejects.toEqual({ code: "PGRST500", message: "DB Error" });
    });
  });

  describe("getByVisitorId", () => {
    it("visitorIdに紐づくフィードバック一覧を取得できる", async () => {
      const mockRows: MockFeedbackRow[] = [
        {
          id: "uuid-1",
          visitor_id: "visitor-1",
          article_id: "article-1",
          type: "like",
          created_at: "2025-01-20T10:00:00Z",
        },
        {
          id: "uuid-2",
          visitor_id: "visitor-1",
          article_id: "article-2",
          type: "dislike",
          created_at: "2025-01-20T11:00:00Z",
        },
      ];
      const queryMock = createUpsertQueryMock({ data: mockRows, error: null });
      mockFrom.mockReturnValue(queryMock);

      const result: Feedback[] = await repository.getByVisitorId("visitor-1");

      expect(result).toHaveLength(2);
      expect(result[0].visitorId).toBe("visitor-1");
      expect(result[0].articleId).toBe("article-1");
      expect(result[0].type).toBe("like");
      expect(result[1].articleId).toBe("article-2");
      expect(result[1].type).toBe("dislike");
      expect(mockFrom).toHaveBeenCalledWith("feedback");
    });

    it("フィードバックが存在しない場合は空配列を返す", async () => {
      const queryMock = createUpsertQueryMock({ data: [], error: null });
      mockFrom.mockReturnValue(queryMock);

      const result: Feedback[] = await repository.getByVisitorId("nonexistent");

      expect(result).toEqual([]);
    });

    it("DBエラー時に例外をスローする", async () => {
      const queryMock = createUpsertQueryMock({
        data: null,
        error: { code: "PGRST500", message: "DB Error" },
      });
      mockFrom.mockReturnValue(queryMock);

      await expect(repository.getByVisitorId("visitor-1")).rejects.toEqual({
        code: "PGRST500",
        message: "DB Error",
      });
    });
  });
});
