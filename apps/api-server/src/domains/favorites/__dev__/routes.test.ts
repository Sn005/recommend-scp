/**
 * @file GET/DELETE /favorites エンドポイントテスト
 * @description ACに基づくroutes.tsの統合テスト
 * @see specs/005-backend-api/005-10-favorites-api/005-10-02.md
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import { Hono } from "hono";
import { createFavoritesRoutes } from "../routes";
import { createErrorHandler } from "../../../middleware/error-handler";
import { NotFoundError } from "../../../lib/errors";
import type { FavoritesService } from "../service";
import type { SupabaseClient } from "@supabase/supabase-js";

/**
 * モックサービスの型
 */
interface MockService {
  getFavorites: ReturnType<typeof vi.fn>;
  removeFavorite: ReturnType<typeof vi.fn>;
}

/**
 * モックロガーを作成
 */
const createMockLogger = () => ({
  info: vi.fn(),
  warn: vi.fn(),
  error: vi.fn(),
  debug: vi.fn(),
});

/**
 * テストアプリを作成
 */
const createTestApp = (mockService: MockService) => {
  const app = new Hono();
  const mockSupabase = {} as SupabaseClient;
  const mockLogger = createMockLogger();

  // RFC 7807 Problem Details形式のエラーハンドリング
  app.onError(createErrorHandler(mockLogger));

  // FavoritesServiceをモック注入するためのファクトリ
  const serviceFactory = () => mockService as unknown as FavoritesService;

  app.route("/favorites", createFavoritesRoutes(mockSupabase, serviceFactory));
  return app;
};

/**
 * 有効なUUID
 */
const VALID_VISITOR_ID = "550e8400-e29b-41d4-a716-446655440000";

// ========================================
// GET /favorites テスト
// ========================================

describe("GET /favorites - 正常系", () => {
  let app: Hono;
  let mockService: MockService;

  beforeEach(() => {
    vi.clearAllMocks();
    mockService = {
      getFavorites: vi.fn(),
      removeFavorite: vi.fn(),
    };
    app = createTestApp(mockService);
  });

  it("有効なvisitorIdで200を返す", async () => {
    // Arrange
    mockService.getFavorites.mockResolvedValue([
      {
        id: "fav-1",
        articleId: "scp-173",
        title: "SCP-173 - The Sculpture",
        objectClass: "euclid",
        rating: 2345,
        favoritedAt: "2024-01-01T00:00:00Z",
      },
    ]);

    // Act
    const res = await app.request(`/favorites?visitorId=${VALID_VISITOR_ID}`);

    // Assert
    expect(res.status).toBe(200);
  });

  it("レスポンスにfavorites配列とtotalが含まれる", async () => {
    // Arrange
    const mockFavorites = [
      {
        id: "fav-1",
        articleId: "scp-173",
        title: "SCP-173",
        objectClass: "euclid",
        rating: 2345,
        favoritedAt: "2024-01-01T00:00:00Z",
      },
      {
        id: "fav-2",
        articleId: "scp-096",
        title: "SCP-096",
        objectClass: "euclid",
        rating: 1890,
        favoritedAt: "2024-01-02T00:00:00Z",
      },
    ];
    mockService.getFavorites.mockResolvedValue(mockFavorites);

    // Act
    const res = await app.request(`/favorites?visitorId=${VALID_VISITOR_ID}`);
    const json = (await res.json()) as Record<string, unknown>;

    // Assert
    expect(json).toHaveProperty("favorites");
    expect(json).toHaveProperty("total", 2);
    expect(json.favorites).toHaveLength(2);
  });

  it("お気に入り0件の場合は空配列を返す", async () => {
    // Arrange
    mockService.getFavorites.mockResolvedValue([]);

    // Act
    const res = await app.request(`/favorites?visitorId=${VALID_VISITOR_ID}`);
    const json = (await res.json()) as Record<string, unknown>;

    // Assert
    expect(res.status).toBe(200);
    expect(json.favorites).toEqual([]);
    expect(json.total).toBe(0);
  });

  it("ServiceのgetFavoritesが正しい引数で呼ばれる", async () => {
    // Arrange
    mockService.getFavorites.mockResolvedValue([]);

    // Act
    await app.request(`/favorites?visitorId=${VALID_VISITOR_ID}`);

    // Assert
    expect(mockService.getFavorites).toHaveBeenCalledWith(VALID_VISITOR_ID);
  });
});

describe("GET /favorites - 異常系（バリデーション）", () => {
  let app: Hono;
  let mockService: MockService;

  beforeEach(() => {
    vi.clearAllMocks();
    mockService = {
      getFavorites: vi.fn(),
      removeFavorite: vi.fn(),
    };
    app = createTestApp(mockService);
  });

  it("visitorIdなしで400を返す", async () => {
    // Act
    const res = await app.request("/favorites");

    // Assert
    expect(res.status).toBe(400);
  });

  it("無効なUUID形式で400を返す", async () => {
    // Act
    const res = await app.request("/favorites?visitorId=invalid-uuid");

    // Assert
    expect(res.status).toBe(400);
  });

  it("RFC 7807形式のエラーを返す", async () => {
    // Act
    const res = await app.request("/favorites");

    // Assert
    expect(res.headers.get("Content-Type")).toBe("application/problem+json");

    const json = (await res.json()) as Record<string, unknown>;
    expect(json).toHaveProperty("type");
    expect(json.type).toContain("validation-error");
    expect(json).toHaveProperty("status", 400);
    expect(json).toHaveProperty("title", "Validation Error");
  });
});

describe("GET /favorites - 異常系（404）", () => {
  let app: Hono;
  let mockService: MockService;

  beforeEach(() => {
    vi.clearAllMocks();
    mockService = {
      getFavorites: vi.fn(),
      removeFavorite: vi.fn(),
    };
    app = createTestApp(mockService);
  });

  it("未登録visitorIdで404を返す", async () => {
    // Arrange
    mockService.getFavorites.mockRejectedValue(new NotFoundError("Visitor", VALID_VISITOR_ID));

    // Act
    const res = await app.request(`/favorites?visitorId=${VALID_VISITOR_ID}`);

    // Assert
    expect(res.status).toBe(404);
  });

  it("404エラー時にRFC 7807形式で返す", async () => {
    // Arrange
    mockService.getFavorites.mockRejectedValue(new NotFoundError("Visitor", VALID_VISITOR_ID));

    // Act
    const res = await app.request(`/favorites?visitorId=${VALID_VISITOR_ID}`);

    // Assert
    expect(res.headers.get("Content-Type")).toBe("application/problem+json");

    const json = (await res.json()) as Record<string, unknown>;
    expect(json.type).toContain("not-found");
    expect(json.status).toBe(404);
    expect(json.detail).toContain(VALID_VISITOR_ID);
  });
});

// ========================================
// DELETE /favorites/:articleId テスト
// ========================================

describe("DELETE /favorites/:articleId - 正常系", () => {
  let app: Hono;
  let mockService: MockService;

  beforeEach(() => {
    vi.clearAllMocks();
    mockService = {
      getFavorites: vi.fn(),
      removeFavorite: vi.fn(),
    };
    app = createTestApp(mockService);
  });

  it("有効なリクエストで204を返す", async () => {
    // Arrange
    mockService.removeFavorite.mockResolvedValue(undefined);

    // Act
    const res = await app.request("/favorites/scp-173", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ visitorId: VALID_VISITOR_ID }),
    });

    // Assert
    expect(res.status).toBe(204);
  });

  it("レスポンスボディが空である", async () => {
    // Arrange
    mockService.removeFavorite.mockResolvedValue(undefined);

    // Act
    const res = await app.request("/favorites/scp-173", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ visitorId: VALID_VISITOR_ID }),
    });

    // Assert
    const text = await res.text();
    expect(text).toBe("");
  });

  it("ServiceのremoveFavoriteが正しい引数で呼ばれる", async () => {
    // Arrange
    mockService.removeFavorite.mockResolvedValue(undefined);

    // Act
    await app.request("/favorites/scp-173", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ visitorId: VALID_VISITOR_ID }),
    });

    // Assert
    expect(mockService.removeFavorite).toHaveBeenCalledWith(VALID_VISITOR_ID, "scp-173");
  });
});

describe("DELETE /favorites/:articleId - 異常系（バリデーション）", () => {
  let app: Hono;
  let mockService: MockService;

  beforeEach(() => {
    vi.clearAllMocks();
    mockService = {
      getFavorites: vi.fn(),
      removeFavorite: vi.fn(),
    };
    app = createTestApp(mockService);
  });

  it("visitorIdなしで400を返す", async () => {
    // Act
    const res = await app.request("/favorites/scp-173", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({}),
    });

    // Assert
    expect(res.status).toBe(400);
  });

  it("無効なUUID形式で400を返す", async () => {
    // Act
    const res = await app.request("/favorites/scp-173", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ visitorId: "invalid-uuid" }),
    });

    // Assert
    expect(res.status).toBe(400);
  });

  it("RFC 7807形式のエラーを返す", async () => {
    // Act
    const res = await app.request("/favorites/scp-173", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({}),
    });

    // Assert
    expect(res.headers.get("Content-Type")).toBe("application/problem+json");

    const json = (await res.json()) as Record<string, unknown>;
    expect(json.type).toContain("validation-error");
    expect(json.status).toBe(400);
  });
});

describe("DELETE /favorites/:articleId - 異常系（404）", () => {
  let app: Hono;
  let mockService: MockService;

  beforeEach(() => {
    vi.clearAllMocks();
    mockService = {
      getFavorites: vi.fn(),
      removeFavorite: vi.fn(),
    };
    app = createTestApp(mockService);
  });

  it("存在しないお気に入りで404を返す", async () => {
    // Arrange
    mockService.removeFavorite.mockRejectedValue(new NotFoundError("Favorite", "scp-999"));

    // Act
    const res = await app.request("/favorites/scp-999", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ visitorId: VALID_VISITOR_ID }),
    });

    // Assert
    expect(res.status).toBe(404);
  });

  it("未登録visitorIdで404を返す", async () => {
    // Arrange
    mockService.removeFavorite.mockRejectedValue(new NotFoundError("Visitor", VALID_VISITOR_ID));

    // Act
    const res = await app.request("/favorites/scp-173", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ visitorId: VALID_VISITOR_ID }),
    });

    // Assert
    expect(res.status).toBe(404);
  });

  it("404エラー時にRFC 7807形式で返す", async () => {
    // Arrange
    mockService.removeFavorite.mockRejectedValue(new NotFoundError("Favorite", "scp-999"));

    // Act
    const res = await app.request("/favorites/scp-999", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ visitorId: VALID_VISITOR_ID }),
    });

    // Assert
    expect(res.headers.get("Content-Type")).toBe("application/problem+json");

    const json = (await res.json()) as Record<string, unknown>;
    expect(json.type).toContain("not-found");
    expect(json.status).toBe(404);
  });
});

// ========================================
// エッジケース
// ========================================

describe("エッジケース", () => {
  let app: Hono;
  let mockService: MockService;

  beforeEach(() => {
    vi.clearAllMocks();
    mockService = {
      getFavorites: vi.fn(),
      removeFavorite: vi.fn(),
    };
    app = createTestApp(mockService);
  });

  it("Serviceがエラーをスローした場合500を返す（GET）", async () => {
    // Arrange
    mockService.getFavorites.mockRejectedValue(new Error("DB connection failed"));

    // Act
    const res = await app.request(`/favorites?visitorId=${VALID_VISITOR_ID}`);

    // Assert
    expect(res.status).toBe(500);
  });

  it("Serviceがエラーをスローした場合500を返す（DELETE）", async () => {
    // Arrange
    mockService.removeFavorite.mockRejectedValue(new Error("DB connection failed"));

    // Act
    const res = await app.request("/favorites/scp-173", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ visitorId: VALID_VISITOR_ID }),
    });

    // Assert
    expect(res.status).toBe(500);
  });

  it("500エラー時にもRFC 7807形式で返す", async () => {
    // Arrange
    mockService.getFavorites.mockRejectedValue(new Error("Unexpected error"));

    // Act
    const res = await app.request(`/favorites?visitorId=${VALID_VISITOR_ID}`);

    // Assert
    expect(res.headers.get("Content-Type")).toBe("application/problem+json");

    const json = (await res.json()) as Record<string, unknown>;
    expect(json.type).toContain("internal-error");
    expect(json.status).toBe(500);
  });
});
