/**
 * @file FavoritesService テスト
 * @description favoritesドメインのビジネスロジック層テスト
 * @see specs/005-backend-api/005-10-favorites-api/005-10-01.md
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import type { FavoritesRepository } from "../repository";
import type { VisitorsRepository } from "../../visitors/repository";
import { FavoritesService } from "../service";
import { NotFoundError } from "../../../lib/errors";

// cacheヘルパーをモック
const mockCacheGet = vi.fn();
const mockCacheSet = vi.fn();
const mockCacheDelete = vi.fn();
vi.mock("../../../lib/cache", () => ({
  // eslint-disable-next-line @typescript-eslint/no-unsafe-return
  cacheGet: (...args: unknown[]) => mockCacheGet(...args),
  // eslint-disable-next-line @typescript-eslint/no-unsafe-return
  cacheSet: (...args: unknown[]) => mockCacheSet(...args),
  // eslint-disable-next-line @typescript-eslint/no-unsafe-return
  cacheDelete: (...args: unknown[]) => mockCacheDelete(...args),
}));

describe("FavoritesService", () => {
  let service: FavoritesService;
  let mockFavoritesRepo: {
    getByVisitorId: ReturnType<typeof vi.fn>;
    remove: ReturnType<typeof vi.fn>;
    add: ReturnType<typeof vi.fn>;
  };
  let mockVisitorsRepo: {
    findByVisitorId: ReturnType<typeof vi.fn>;
  };

  beforeEach(() => {
    vi.clearAllMocks();
    mockCacheGet.mockResolvedValue(null);
    mockCacheSet.mockResolvedValue(undefined);
    mockCacheDelete.mockResolvedValue(undefined);

    mockFavoritesRepo = {
      getByVisitorId: vi.fn().mockResolvedValue([]),
      remove: vi.fn().mockResolvedValue(true),
      add: vi.fn().mockResolvedValue({
        id: "fav-new",
        articleId: "SCP-173",
        addedAt: "2025-01-20T10:00:00Z",
        isNew: true,
      }),
    };

    mockVisitorsRepo = {
      findByVisitorId: vi.fn().mockResolvedValue({
        id: "uuid-visitor",
        visitorId: "visitor-1",
        createdAt: "2025-01-01T00:00:00Z",
        updatedAt: "2025-01-01T00:00:00Z",
      }),
    };

    service = new FavoritesService(
      mockFavoritesRepo as unknown as FavoritesRepository,
      mockVisitorsRepo as unknown as VisitorsRepository
    );
  });

  describe("getFavorites", () => {
    it("visitorIdの存在確認後、お気に入り一覧を返す", async () => {
      const mockFavorites = [
        {
          id: "fav-1",
          articleId: "SCP-173",
          title: "The Sculpture",
          objectClass: "euclid",
          rating: 850,
          favoritedAt: "2025-01-20T10:00:00Z",
        },
        {
          id: "fav-2",
          articleId: "SCP-682",
          title: "Hard-to-Destroy Reptile",
          objectClass: "keter",
          rating: 1200,
          favoritedAt: "2025-01-20T11:00:00Z",
        },
      ];
      mockFavoritesRepo.getByVisitorId.mockResolvedValue(mockFavorites);

      const result = await service.getFavorites("visitor-1");

      expect(mockVisitorsRepo.findByVisitorId).toHaveBeenCalledWith("visitor-1");
      expect(mockFavoritesRepo.getByVisitorId).toHaveBeenCalledWith("visitor-1");
      expect(result).toHaveLength(2);
      expect(result[0].articleId).toBe("SCP-173");
      expect(result[1].articleId).toBe("SCP-682");
    });

    it("お気に入りが空の場合は空配列を返す", async () => {
      mockFavoritesRepo.getByVisitorId.mockResolvedValue([]);

      const result = await service.getFavorites("visitor-1");

      expect(result).toEqual([]);
    });

    it("存在しないvisitorIdでNotFoundErrorをスローする", async () => {
      mockVisitorsRepo.findByVisitorId.mockResolvedValue(null);

      await expect(service.getFavorites("nonexistent")).rejects.toThrow(NotFoundError);

      expect(mockVisitorsRepo.findByVisitorId).toHaveBeenCalledWith("nonexistent");
      expect(mockFavoritesRepo.getByVisitorId).not.toHaveBeenCalled();
    });

    it("NotFoundErrorのdetailにvisitorIdが含まれる", async () => {
      mockVisitorsRepo.findByVisitorId.mockResolvedValue(null);

      try {
        await service.getFavorites("nonexistent-visitor-id");
        expect.fail("NotFoundErrorがスローされるべき");
      } catch (error) {
        expect(error).toBeInstanceOf(NotFoundError);
        expect((error as NotFoundError).detail).toContain("nonexistent-visitor-id");
      }
    });
  });

  describe("addFavorite", () => {
    it("visitorId存在確認後、Repository.addを呼びお気に入りを追加する", async () => {
      // Arrange
      mockFavoritesRepo.add.mockResolvedValue({
        id: "fav-new",
        articleId: "SCP-173",
        addedAt: "2025-01-20T10:00:00Z",
        isNew: true,
      });

      // Act
      const result = await service.addFavorite("visitor-1", "SCP-173");

      // Assert
      expect(mockVisitorsRepo.findByVisitorId).toHaveBeenCalledWith("visitor-1");
      expect(mockFavoritesRepo.add).toHaveBeenCalledWith("visitor-1", "SCP-173");
      expect(result).toEqual({
        articleId: "SCP-173",
        favoritedAt: "2025-01-20T10:00:00Z",
        isNew: true,
      });
    });

    it("重複追加時はisNew: falseを返す", async () => {
      // Arrange
      mockFavoritesRepo.add.mockResolvedValue({
        id: "fav-existing",
        articleId: "SCP-173",
        addedAt: "2025-01-19T08:00:00Z",
        isNew: false,
      });

      // Act
      const result = await service.addFavorite("visitor-1", "SCP-173");

      // Assert
      expect(result).toEqual({
        articleId: "SCP-173",
        favoritedAt: "2025-01-19T08:00:00Z",
        isNew: false,
      });
    });

    it("存在しないvisitorIdでNotFoundErrorをスローする", async () => {
      // Arrange
      mockVisitorsRepo.findByVisitorId.mockResolvedValue(null);

      // Act & Assert
      await expect(service.addFavorite("nonexistent", "SCP-173")).rejects.toThrow(NotFoundError);
      expect(mockVisitorsRepo.findByVisitorId).toHaveBeenCalledWith("nonexistent");
      expect(mockFavoritesRepo.add).not.toHaveBeenCalled();
    });
  });

  describe("removeFavorite", () => {
    it("visitorId存在確認後、お気に入りを削除する", async () => {
      mockFavoritesRepo.remove.mockResolvedValue(true);

      await service.removeFavorite("visitor-1", "SCP-173");

      expect(mockVisitorsRepo.findByVisitorId).toHaveBeenCalledWith("visitor-1");
      expect(mockFavoritesRepo.remove).toHaveBeenCalledWith("visitor-1", "SCP-173");
    });

    it("存在しないvisitorIdでNotFoundError（Visitor）をスローする", async () => {
      mockVisitorsRepo.findByVisitorId.mockResolvedValue(null);

      try {
        await service.removeFavorite("nonexistent", "SCP-173");
        expect.fail("NotFoundErrorがスローされるべき");
      } catch (error) {
        expect(error).toBeInstanceOf(NotFoundError);
        expect((error as NotFoundError).detail).toContain("Visitor");
      }

      expect(mockFavoritesRepo.remove).not.toHaveBeenCalled();
    });

    it("お気に入りが見つからない場合はNotFoundError（Favorite）をスローする", async () => {
      mockVisitorsRepo.findByVisitorId.mockResolvedValue({
        id: "uuid-visitor",
        visitorId: "visitor-1",
        createdAt: "2025-01-01T00:00:00Z",
        updatedAt: "2025-01-01T00:00:00Z",
      });
      mockFavoritesRepo.remove.mockResolvedValue(false);

      try {
        await service.removeFavorite("visitor-1", "SCP-NONEXISTENT");
        expect.fail("NotFoundErrorがスローされるべき");
      } catch (error) {
        expect(error).toBeInstanceOf(NotFoundError);
        expect((error as NotFoundError).detail).toContain("Favorite");
      }
    });
  });

  describe("キャッシュ動作", () => {
    const mockFavorites = [
      {
        id: "fav-1",
        articleId: "SCP-173",
        title: "The Sculpture",
        objectClass: "euclid",
        rating: 850,
        favoritedAt: "2025-01-20T10:00:00Z",
      },
    ];

    it("getFavorites: キャッシュヒット時はDBアクセスを行わずキャッシュから返す", async () => {
      mockCacheGet.mockResolvedValue(mockFavorites);

      const result = await service.getFavorites("visitor-1");

      expect(result).toEqual(mockFavorites);
      expect(mockCacheGet).toHaveBeenCalledWith("favorites:visitor-1");
      expect(mockFavoritesRepo.getByVisitorId).not.toHaveBeenCalled();
    });

    it("getFavorites: キャッシュミス時はDBから取得しキャッシュに保存する", async () => {
      mockCacheGet.mockResolvedValue(null);
      mockFavoritesRepo.getByVisitorId.mockResolvedValue(mockFavorites);

      const result = await service.getFavorites("visitor-1");

      expect(result).toEqual(mockFavorites);
      expect(mockFavoritesRepo.getByVisitorId).toHaveBeenCalledWith("visitor-1");
      expect(mockCacheSet).toHaveBeenCalledWith("favorites:visitor-1", mockFavorites, 60);
    });

    it("getFavorites: 空配列でもキャッシュに保存する", async () => {
      mockCacheGet.mockResolvedValue(null);
      mockFavoritesRepo.getByVisitorId.mockResolvedValue([]);

      const result = await service.getFavorites("visitor-1");

      expect(result).toEqual([]);
      expect(mockCacheSet).toHaveBeenCalledWith("favorites:visitor-1", [], 60);
    });

    it("getFavorites: visitor不在時はキャッシュに触れない", async () => {
      mockVisitorsRepo.findByVisitorId.mockResolvedValue(null);

      await expect(service.getFavorites("nonexistent")).rejects.toThrow(NotFoundError);

      expect(mockCacheGet).not.toHaveBeenCalled();
      expect(mockCacheSet).not.toHaveBeenCalled();
    });

    it("addFavorite: 追加成功時はキャッシュを無効化する", async () => {
      mockFavoritesRepo.add.mockResolvedValue({
        id: "fav-new",
        articleId: "SCP-173",
        addedAt: "2025-01-20T10:00:00Z",
        isNew: true,
      });

      await service.addFavorite("visitor-1", "SCP-173");

      expect(mockCacheDelete).toHaveBeenCalledWith("favorites:visitor-1");
    });

    it("removeFavorite: 削除成功時はキャッシュを無効化する", async () => {
      mockFavoritesRepo.remove.mockResolvedValue(true);

      await service.removeFavorite("visitor-1", "SCP-173");

      expect(mockCacheDelete).toHaveBeenCalledWith("favorites:visitor-1");
    });

    it("removeFavorite: 削除失敗時はキャッシュ無効化も行わない", async () => {
      mockFavoritesRepo.remove.mockResolvedValue(false);

      await expect(service.removeFavorite("visitor-1", "SCP-NONEXISTENT")).rejects.toThrow(
        NotFoundError
      );

      expect(mockCacheDelete).not.toHaveBeenCalled();
    });
  });
});
