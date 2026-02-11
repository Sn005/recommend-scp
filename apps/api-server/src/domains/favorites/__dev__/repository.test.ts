/**
 * @file FavoritesRepository テスト
 * @description favoritesテーブルのDB操作層テスト
 * @see specs/005-backend-api/005-10-favorites-api/005-10-01.md
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import type { SupabaseClient } from "@supabase/supabase-js";
import { FavoritesRepository } from "../repository";
import type { FavoriteWithArticle } from "../types";

/** DB行の型（JOIN後のsnake_case） */
interface MockFavoriteRow {
  id: string;
  article_id: string;
  added_at: string;
  scp_articles: {
    title: string | null;
    rating: number | null;
    tags: string[] | null;
  } | null;
}

/** モック結果の型 */
interface MockQueryResult {
  data: MockFavoriteRow | MockFavoriteRow[] | null;
  error: { code: string; message: string } | null;
  count?: number | null;
}

/**
 * Supabase SELECT クエリビルダーのモック作成ヘルパー
 */
const createSelectQueryMock = (result: MockQueryResult) => ({
  select: vi.fn().mockReturnValue({
    eq: vi.fn().mockReturnValue({
      order: vi.fn().mockResolvedValue(result),
    }),
  }),
});

/**
 * Supabase DELETE クエリビルダーのモック作成ヘルパー
 */
const createDeleteQueryMock = (count: number | null, error: MockQueryResult["error"] = null) => ({
  delete: vi.fn().mockReturnValue({
    eq: vi.fn().mockReturnValue({
      eq: vi.fn().mockResolvedValue({ count, error }),
    }),
  }),
});

describe("FavoritesRepository", () => {
  let repository: FavoritesRepository;
  let mockSupabase: SupabaseClient;
  let mockFrom: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    vi.clearAllMocks();
    mockFrom = vi.fn();
    mockSupabase = {
      from: mockFrom,
    } as unknown as SupabaseClient;
    repository = new FavoritesRepository(mockSupabase);
  });

  describe("getByVisitorId", () => {
    it("visitorIdに紐づくお気に入り一覧を取得できる（記事情報付き）", async () => {
      const mockRows: MockFavoriteRow[] = [
        {
          id: "fav-uuid-1",
          article_id: "SCP-173",
          added_at: "2025-01-20T10:00:00Z",
          scp_articles: {
            title: "The Sculpture - The Original",
            rating: 850,
            tags: ["euclid", "sculpture", "hostile"],
          },
        },
        {
          id: "fav-uuid-2",
          article_id: "SCP-682",
          added_at: "2025-01-20T11:00:00Z",
          scp_articles: {
            title: "Hard-to-Destroy Reptile",
            rating: 1200,
            tags: ["keter", "reptile", "indestructible"],
          },
        },
      ];
      const queryMock = createSelectQueryMock({ data: mockRows, error: null });
      mockFrom.mockReturnValue(queryMock);

      const result: FavoriteWithArticle[] = await repository.getByVisitorId("visitor-1");

      expect(result).toHaveLength(2);
      expect(result[0]).toMatchObject({
        id: "fav-uuid-1",
        articleId: "SCP-173",
        title: "The Sculpture - The Original",
        objectClass: "euclid",
        rating: 850,
        favoritedAt: "2025-01-20T10:00:00Z",
      });
      expect(result[1]).toMatchObject({
        id: "fav-uuid-2",
        articleId: "SCP-682",
        title: "Hard-to-Destroy Reptile",
        objectClass: "keter",
        rating: 1200,
      });
      expect(mockFrom).toHaveBeenCalledWith("favorites");
    });

    it("お気に入りが存在しない場合は空配列を返す", async () => {
      const queryMock = createSelectQueryMock({ data: [], error: null });
      mockFrom.mockReturnValue(queryMock);

      const result: FavoriteWithArticle[] = await repository.getByVisitorId("visitor-empty");

      expect(result).toEqual([]);
    });

    it("記事情報がJOINできない場合はnullフィールドを含む", async () => {
      const mockRows: MockFavoriteRow[] = [
        {
          id: "fav-uuid-1",
          article_id: "SCP-DELETED",
          added_at: "2025-01-20T10:00:00Z",
          scp_articles: null,
        },
      ];
      const queryMock = createSelectQueryMock({ data: mockRows, error: null });
      mockFrom.mockReturnValue(queryMock);

      const result: FavoriteWithArticle[] = await repository.getByVisitorId("visitor-1");

      expect(result).toHaveLength(1);
      expect(result[0]).toMatchObject({
        id: "fav-uuid-1",
        articleId: "SCP-DELETED",
        title: null,
        objectClass: null,
        rating: null,
      });
    });

    it("DBエラー時に例外をスローする", async () => {
      const queryMock = createSelectQueryMock({
        data: null,
        error: { code: "PGRST500", message: "DB Error" },
      });
      mockFrom.mockReturnValue(queryMock);

      await expect(repository.getByVisitorId("visitor-1")).rejects.toEqual({
        code: "PGRST500",
        message: "DB Error",
      });
    });

    describe("ObjectClass抽出", () => {
      it("tagsからObjectClassを抽出する（safe）", async () => {
        const mockRows: MockFavoriteRow[] = [
          {
            id: "fav-1",
            article_id: "SCP-999",
            added_at: "2025-01-20T10:00:00Z",
            scp_articles: {
              title: "The Tickle Monster",
              rating: 1500,
              tags: ["safe", "slime", "friendly"],
            },
          },
        ];
        const queryMock = createSelectQueryMock({ data: mockRows, error: null });
        mockFrom.mockReturnValue(queryMock);

        const result = await repository.getByVisitorId("visitor-1");

        expect(result[0].objectClass).toBe("safe");
      });

      it("大文字小文字混在でもObjectClassを抽出する", async () => {
        const mockRows: MockFavoriteRow[] = [
          {
            id: "fav-1",
            article_id: "SCP-001",
            added_at: "2025-01-20T10:00:00Z",
            scp_articles: {
              title: "The Gate Guardian",
              rating: 2000,
              tags: ["KETER", "Angel", "Guardian"],
            },
          },
        ];
        const queryMock = createSelectQueryMock({ data: mockRows, error: null });
        mockFrom.mockReturnValue(queryMock);

        const result = await repository.getByVisitorId("visitor-1");

        expect(result[0].objectClass).toBe("keter");
      });

      it("tagsにObjectClassがない場合はnullを返す", async () => {
        const mockRows: MockFavoriteRow[] = [
          {
            id: "fav-1",
            article_id: "SCP-001",
            added_at: "2025-01-20T10:00:00Z",
            scp_articles: {
              title: "Some Article",
              rating: 100,
              tags: ["horror", "mystery", "japan"],
            },
          },
        ];
        const queryMock = createSelectQueryMock({ data: mockRows, error: null });
        mockFrom.mockReturnValue(queryMock);

        const result = await repository.getByVisitorId("visitor-1");

        expect(result[0].objectClass).toBeNull();
      });

      it("tagsがnullの場合はnullを返す", async () => {
        const mockRows: MockFavoriteRow[] = [
          {
            id: "fav-1",
            article_id: "SCP-001",
            added_at: "2025-01-20T10:00:00Z",
            scp_articles: {
              title: "Some Article",
              rating: 100,
              tags: null,
            },
          },
        ];
        const queryMock = createSelectQueryMock({ data: mockRows, error: null });
        mockFrom.mockReturnValue(queryMock);

        const result = await repository.getByVisitorId("visitor-1");

        expect(result[0].objectClass).toBeNull();
      });

      it("tagsが空配列の場合はnullを返す", async () => {
        const mockRows: MockFavoriteRow[] = [
          {
            id: "fav-1",
            article_id: "SCP-001",
            added_at: "2025-01-20T10:00:00Z",
            scp_articles: {
              title: "Some Article",
              rating: 100,
              tags: [],
            },
          },
        ];
        const queryMock = createSelectQueryMock({ data: mockRows, error: null });
        mockFrom.mockReturnValue(queryMock);

        const result = await repository.getByVisitorId("visitor-1");

        expect(result[0].objectClass).toBeNull();
      });

      it("マイナーなObjectClass（apollyon, thaumiel, archon）を抽出する", async () => {
        const mockRows: MockFavoriteRow[] = [
          {
            id: "fav-1",
            article_id: "SCP-001",
            added_at: "2025-01-20T10:00:00Z",
            scp_articles: {
              title: "Apollyon Article",
              rating: 100,
              tags: ["apollyon", "xk-class"],
            },
          },
          {
            id: "fav-2",
            article_id: "SCP-002",
            added_at: "2025-01-20T11:00:00Z",
            scp_articles: {
              title: "Thaumiel Article",
              rating: 200,
              tags: ["thaumiel", "utility"],
            },
          },
          {
            id: "fav-3",
            article_id: "SCP-003",
            added_at: "2025-01-20T12:00:00Z",
            scp_articles: {
              title: "Archon Article",
              rating: 300,
              tags: ["archon", "containment-exception"],
            },
          },
        ];
        const queryMock = createSelectQueryMock({ data: mockRows, error: null });
        mockFrom.mockReturnValue(queryMock);

        const result = await repository.getByVisitorId("visitor-1");

        expect(result[0].objectClass).toBe("apollyon");
        expect(result[1].objectClass).toBe("thaumiel");
        expect(result[2].objectClass).toBe("archon");
      });
    });
  });

  describe("add", () => {
    it("新規お気に入りを追加してレコードを返す", async () => {
      // Arrange: 既存チェック → 存在しない → INSERT
      mockFrom
        .mockReturnValueOnce({
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                maybeSingle: vi.fn().mockResolvedValue({ data: null, error: null }),
              }),
            }),
          }),
        })
        .mockReturnValueOnce({
          insert: vi.fn().mockReturnValue({
            select: vi.fn().mockReturnValue({
              single: vi.fn().mockResolvedValue({
                data: {
                  id: "fav-uuid-new",
                  article_id: "SCP-173",
                  added_at: "2025-01-20T10:00:00Z",
                },
                error: null,
              }),
            }),
          }),
        });

      // Act
      const result = await repository.add("visitor-1", "SCP-173");

      // Assert
      expect(result).toEqual({
        id: "fav-uuid-new",
        articleId: "SCP-173",
        addedAt: "2025-01-20T10:00:00Z",
        isNew: true,
      });
      expect(mockFrom).toHaveBeenCalledTimes(2);
    });

    it("重複時に既存レコードを返す（UPSERT）", async () => {
      // Arrange: 既存チェック → 存在する
      mockFrom.mockReturnValueOnce({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              maybeSingle: vi.fn().mockResolvedValue({
                data: {
                  id: "fav-uuid-existing",
                  article_id: "SCP-173",
                  added_at: "2025-01-19T08:00:00Z",
                },
                error: null,
              }),
            }),
          }),
        }),
      });

      // Act
      const result = await repository.add("visitor-1", "SCP-173");

      // Assert
      expect(result).toEqual({
        id: "fav-uuid-existing",
        articleId: "SCP-173",
        addedAt: "2025-01-19T08:00:00Z",
        isNew: false,
      });
      // INSERTは呼ばれない（1回のみ）
      expect(mockFrom).toHaveBeenCalledTimes(1);
    });

    it("DB挿入エラー時に例外をスローする", async () => {
      // Arrange: 既存チェック → 存在しない → INSERT失敗
      mockFrom
        .mockReturnValueOnce({
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                maybeSingle: vi.fn().mockResolvedValue({ data: null, error: null }),
              }),
            }),
          }),
        })
        .mockReturnValueOnce({
          insert: vi.fn().mockReturnValue({
            select: vi.fn().mockReturnValue({
              single: vi.fn().mockResolvedValue({
                data: null,
                error: { code: "23503", message: "Foreign key violation" },
              }),
            }),
          }),
        });

      // Act & Assert
      await expect(repository.add("visitor-1", "SCP-INVALID")).rejects.toEqual({
        code: "23503",
        message: "Foreign key violation",
      });
    });
  });

  describe("remove", () => {
    it("お気に入りを削除できる（true返却）", async () => {
      const queryMock = createDeleteQueryMock(1);
      mockFrom.mockReturnValue(queryMock);

      const result = await repository.remove("visitor-1", "SCP-173");

      expect(result).toBe(true);
      expect(mockFrom).toHaveBeenCalledWith("favorites");
    });

    it("該当レコードなしでfalseを返す", async () => {
      const queryMock = createDeleteQueryMock(0);
      mockFrom.mockReturnValue(queryMock);

      const result = await repository.remove("visitor-1", "SCP-NONEXISTENT");

      expect(result).toBe(false);
    });

    it("DBエラー時に例外をスローする", async () => {
      const queryMock = createDeleteQueryMock(null, {
        code: "PGRST500",
        message: "DB Error",
      });
      mockFrom.mockReturnValue(queryMock);

      await expect(repository.remove("visitor-1", "SCP-173")).rejects.toEqual({
        code: "PGRST500",
        message: "DB Error",
      });
    });
  });
});
