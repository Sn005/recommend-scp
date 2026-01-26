/**
 * @file VisitorsRepository テスト
 * @description visitorsテーブルのDB操作層テスト
 * @see specs/005-backend-api/005-03-visitors-api/005-03-01.md
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import type { SupabaseClient } from "@supabase/supabase-js";
import { VisitorsRepository } from "../repository";

// Supabaseクエリビルダーのモック作成ヘルパー
const createQueryMock = (result: { data: unknown; error: unknown }) => ({
  select: vi.fn().mockReturnValue({
    eq: vi.fn().mockReturnValue({
      single: vi.fn().mockResolvedValue(result),
    }),
  }),
  insert: vi.fn().mockReturnValue({
    select: vi.fn().mockReturnValue({
      single: vi.fn().mockResolvedValue(result),
    }),
  }),
});

const createCountQueryMock = (result: { count: number | null; error: unknown }) => ({
  select: vi.fn().mockReturnValue({
    eq: vi.fn().mockResolvedValue(result),
  }),
});

describe("VisitorsRepository", () => {
  let repository: VisitorsRepository;
  let mockSupabase: SupabaseClient;
  let mockFrom: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    vi.clearAllMocks();
    mockFrom = vi.fn();
    mockSupabase = {
      from: mockFrom,
    } as unknown as SupabaseClient;
    repository = new VisitorsRepository(mockSupabase);
  });

  describe("findByVisitorId", () => {
    it("存在するvisitorIdで既存visitorを取得できる", async () => {
      const mockRow = {
        id: "uuid-123",
        visitor_id: "test-visitor-1",
        created_at: "2025-01-20T10:00:00Z",
        updated_at: "2025-01-20T10:00:00Z",
      };
      const queryMock = createQueryMock({ data: mockRow, error: null });
      mockFrom.mockReturnValue(queryMock);

      const result = await repository.findByVisitorId("test-visitor-1");

      expect(result).not.toBeNull();
      expect(result?.visitorId).toBe("test-visitor-1");
      expect(result?.id).toBe("uuid-123");
      expect(result?.createdAt).toBe("2025-01-20T10:00:00Z");
      expect(result?.updatedAt).toBe("2025-01-20T10:00:00Z");
      expect(mockFrom).toHaveBeenCalledWith("visitors");
    });

    it("存在しないvisitorIdでnullを返す", async () => {
      const queryMock = createQueryMock({
        data: null,
        error: { code: "PGRST116", message: "Not found" },
      });
      mockFrom.mockReturnValue(queryMock);

      const result = await repository.findByVisitorId("nonexistent");

      expect(result).toBeNull();
    });

    it("PGRST116以外のDBエラー時に例外をスローする", async () => {
      const queryMock = createQueryMock({
        data: null,
        error: { code: "PGRST500", message: "DB Error" },
      });
      mockFrom.mockReturnValue(queryMock);

      await expect(repository.findByVisitorId("test")).rejects.toEqual({
        code: "PGRST500",
        message: "DB Error",
      });
    });
  });

  describe("create", () => {
    it("新規visitorを作成できる", async () => {
      const mockRow = {
        id: "uuid-456",
        visitor_id: "new-visitor-1",
        created_at: "2025-01-20T11:00:00Z",
        updated_at: "2025-01-20T11:00:00Z",
      };
      const queryMock = createQueryMock({ data: mockRow, error: null });
      mockFrom.mockReturnValue(queryMock);

      const result = await repository.create("new-visitor-1");

      expect(result.visitorId).toBe("new-visitor-1");
      expect(result.id).toBe("uuid-456");
      expect(result.createdAt).toBe("2025-01-20T11:00:00Z");
      expect(result.updatedAt).toBe("2025-01-20T11:00:00Z");
      expect(mockFrom).toHaveBeenCalledWith("visitors");
    });

    it("insert時のDBエラーで例外をスローする", async () => {
      const queryMock = createQueryMock({
        data: null,
        error: { code: "23505", message: "UNIQUE constraint violation" },
      });
      mockFrom.mockReturnValue(queryMock);

      await expect(repository.create("existing-visitor")).rejects.toEqual({
        code: "23505",
        message: "UNIQUE constraint violation",
      });
    });
  });

  describe("existsByVisitorId", () => {
    it("存在するvisitorIdでtrueを返す", async () => {
      const queryMock = createCountQueryMock({ count: 1, error: null });
      mockFrom.mockReturnValue(queryMock);

      const result = await repository.existsByVisitorId("existing-visitor");

      expect(result).toBe(true);
      expect(mockFrom).toHaveBeenCalledWith("visitors");
    });

    it("存在しないvisitorIdでfalseを返す", async () => {
      const queryMock = createCountQueryMock({ count: 0, error: null });
      mockFrom.mockReturnValue(queryMock);

      const result = await repository.existsByVisitorId("nonexistent");

      expect(result).toBe(false);
    });

    it("countがnullの場合はfalseを返す", async () => {
      const queryMock = createCountQueryMock({ count: null, error: null });
      mockFrom.mockReturnValue(queryMock);

      const result = await repository.existsByVisitorId("test");

      expect(result).toBe(false);
    });

    it("DBエラー時に例外をスローする", async () => {
      const queryMock = createCountQueryMock({
        count: null,
        error: { code: "PGRST500", message: "DB Error" },
      });
      mockFrom.mockReturnValue(queryMock);

      await expect(repository.existsByVisitorId("test")).rejects.toEqual({
        code: "PGRST500",
        message: "DB Error",
      });
    });
  });
});
