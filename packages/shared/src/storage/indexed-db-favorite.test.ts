/**
 * @file IndexedDB お気に入り機能テスト
 * @description Subtask 004-01-06 のACを検証するテスト
 * @see specs/004-recommend/004-01-recommend-foundation/004-01-06.md
 */

import "fake-indexeddb/auto";
import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { IndexedDBStorage } from "./indexed-db";
import type { Favorite } from "./types";

describe("004-01-06: お気に入り機能", () => {
  let storage: IndexedDBStorage;

  beforeEach(async () => {
    // 各テスト前にDBをクリーンアップ
    const dbs = await indexedDB.databases();
    for (const db of dbs as { name?: string }[]) {
      if (db.name) {
        indexedDB.deleteDatabase(db.name);
      }
    }
    storage = new IndexedDBStorage();
  });

  afterEach(async () => {
    // テスト後のクリーンアップ
    if (storage) {
      storage.close();
    }
    indexedDB.deleteDatabase("scp-recommend");
  });

  describe("AC1: お気に入り追加", () => {
    beforeEach(async () => {
      await storage.initialize();
    });

    it("お気に入りを追加すると保存される", async () => {
      // Arrange
      const favorite: Favorite = {
        id: "visitor1_scp-173",
        visitorId: "visitor1",
        articleId: "scp-173",
        addedAt: "2026-01-22T00:00:00Z",
      };

      // Act
      await storage.addFavorite(favorite);

      // Assert
      const favorites = await storage.getFavorites("visitor1");
      expect(favorites).toHaveLength(1);
      expect(favorites[0]).toEqual(favorite);
    });

    it("複数のお気に入りを追加できる", async () => {
      // Arrange
      const favorite1: Favorite = {
        id: "visitor1_scp-173",
        visitorId: "visitor1",
        articleId: "scp-173",
        addedAt: "2026-01-22T00:00:00Z",
      };
      const favorite2: Favorite = {
        id: "visitor1_scp-682",
        visitorId: "visitor1",
        articleId: "scp-682",
        addedAt: "2026-01-22T00:01:00Z",
      };

      // Act
      await storage.addFavorite(favorite1);
      await storage.addFavorite(favorite2);

      // Assert
      const favorites = await storage.getFavorites("visitor1");
      expect(favorites).toHaveLength(2);
    });
  });

  describe("AC2: お気に入り一覧取得", () => {
    beforeEach(async () => {
      await storage.initialize();
    });

    it("お気に入り一覧が追加日時降順で返される", async () => {
      // Arrange
      const favorite1: Favorite = {
        id: "visitor1_scp-173",
        visitorId: "visitor1",
        articleId: "scp-173",
        addedAt: "2026-01-22T00:00:00Z",
      };
      const favorite2: Favorite = {
        id: "visitor1_scp-682",
        visitorId: "visitor1",
        articleId: "scp-682",
        addedAt: "2026-01-22T00:02:00Z", // 後に追加
      };
      await storage.addFavorite(favorite1);
      await storage.addFavorite(favorite2);

      // Act
      const favorites = await storage.getFavorites("visitor1");

      // Assert
      expect(favorites[0].articleId).toBe("scp-682"); // 新しい方が先
      expect(favorites[1].articleId).toBe("scp-173");
    });

    it("お気に入りが0件の場合は空配列を返す", async () => {
      // Act
      const favorites = await storage.getFavorites("non-existent-visitor");

      // Assert
      expect(favorites).toEqual([]);
    });

    it("異なるvisitorIdのお気に入りは混在しない", async () => {
      // Arrange
      await storage.addFavorite({
        id: "visitor1_scp-173",
        visitorId: "visitor1",
        articleId: "scp-173",
        addedAt: "2026-01-22T00:00:00Z",
      });
      await storage.addFavorite({
        id: "visitor2_scp-682",
        visitorId: "visitor2",
        articleId: "scp-682",
        addedAt: "2026-01-22T00:01:00Z",
      });

      // Act
      const visitor1Favorites = await storage.getFavorites("visitor1");

      // Assert
      expect(visitor1Favorites).toHaveLength(1);
      expect(visitor1Favorites[0].articleId).toBe("scp-173");
    });
  });

  describe("AC3: お気に入り解除", () => {
    beforeEach(async () => {
      await storage.initialize();
    });

    it("お気に入りを解除すると削除される", async () => {
      // Arrange
      const favorite: Favorite = {
        id: "visitor1_scp-173",
        visitorId: "visitor1",
        articleId: "scp-173",
        addedAt: "2026-01-22T00:00:00Z",
      };
      await storage.addFavorite(favorite);

      // Act
      await storage.removeFavorite("visitor1", "scp-173");

      // Assert
      const favorites = await storage.getFavorites("visitor1");
      expect(favorites).toHaveLength(0);
    });

    it("お気に入り解除後、他のお気に入りは残る", async () => {
      // Arrange
      await storage.addFavorite({
        id: "visitor1_scp-173",
        visitorId: "visitor1",
        articleId: "scp-173",
        addedAt: "2026-01-22T00:00:00Z",
      });
      await storage.addFavorite({
        id: "visitor1_scp-682",
        visitorId: "visitor1",
        articleId: "scp-682",
        addedAt: "2026-01-22T00:01:00Z",
      });

      // Act
      await storage.removeFavorite("visitor1", "scp-173");

      // Assert
      const favorites = await storage.getFavorites("visitor1");
      expect(favorites).toHaveLength(1);
      expect(favorites[0].articleId).toBe("scp-682");
    });

    it("存在しないお気に入りを解除してもエラーにならない", async () => {
      // Act & Assert
      await expect(
        storage.removeFavorite("visitor1", "non-existent-article")
      ).resolves.not.toThrow();
    });
  });

  describe("AC4: 重複追加時の動作", () => {
    beforeEach(async () => {
      await storage.initialize();
    });

    it("同じ記事を再度追加すると追加日時が更新される", async () => {
      // Arrange
      const favorite1: Favorite = {
        id: "visitor1_scp-173",
        visitorId: "visitor1",
        articleId: "scp-173",
        addedAt: "2026-01-22T00:00:00Z",
      };
      const favorite2: Favorite = {
        id: "visitor1_scp-173",
        visitorId: "visitor1",
        articleId: "scp-173",
        addedAt: "2026-01-22T01:00:00Z", // 1時間後
      };

      // Act
      await storage.addFavorite(favorite1);
      await storage.addFavorite(favorite2);

      // Assert
      const favorites = await storage.getFavorites("visitor1");
      expect(favorites).toHaveLength(1); // レコード数は1のまま
      expect(favorites[0].addedAt).toBe("2026-01-22T01:00:00Z"); // 更新されている
    });

    it("重複エラーが発生しない", async () => {
      // Arrange
      const favorite: Favorite = {
        id: "visitor1_scp-173",
        visitorId: "visitor1",
        articleId: "scp-173",
        addedAt: "2026-01-22T00:00:00Z",
      };

      // Act & Assert
      await expect(storage.addFavorite(favorite)).resolves.not.toThrow();
      await expect(storage.addFavorite(favorite)).resolves.not.toThrow(); // 2回目もエラーなし
    });
  });

  describe("AC5: PreferenceStorageインターフェース拡張", () => {
    beforeEach(async () => {
      await storage.initialize();
    });

    it("getFavoritesメソッドが存在する", () => {
      expect(typeof storage.getFavorites).toBe("function");
    });

    it("addFavoriteメソッドが存在する", () => {
      expect(typeof storage.addFavorite).toBe("function");
    });

    it("removeFavoriteメソッドが存在する", () => {
      expect(typeof storage.removeFavorite).toBe("function");
    });
  });

  describe("データベース初期化", () => {
    it("初期化時にfavoritesオブジェクトストアが作成される", async () => {
      // Act
      await storage.initialize();

      // Assert
      const storeNames = storage.getStoreNames();
      expect(storeNames).toContain("favorites");
    });

    it("favoritesストアにbyVisitorインデックスが作成される", async () => {
      // Act
      await storage.initialize();

      // Assert
      const indexNames = storage.getIndexNames("favorites");
      expect(indexNames).toContain("byVisitor");
    });

    it("既にDBが存在する状態で再初期化しても既存お気に入りは保持される", async () => {
      // Arrange
      await storage.initialize();
      const favorite: Favorite = {
        id: "visitor1_scp-173",
        visitorId: "visitor1",
        articleId: "scp-173",
        addedAt: "2026-01-22T00:00:00Z",
      };
      await storage.addFavorite(favorite);
      storage.close();

      // Act
      const newStorage = new IndexedDBStorage();
      await newStorage.initialize();

      // Assert
      const favorites = await newStorage.getFavorites("visitor1");
      expect(favorites).toHaveLength(1);
      expect(favorites[0]).toEqual(favorite);

      newStorage.close();
    });
  });
});
