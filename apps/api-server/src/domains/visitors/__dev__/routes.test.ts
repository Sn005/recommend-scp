/**
 * @file POST /visitors エンドポイントテスト
 * @description ACに基づくroutes.tsの統合テスト
 * @see specs/005-backend-api/005-03-visitors-api/005-03-02.md
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import { Hono } from "hono";
import { createVisitorsRoutes } from "../routes";
import { createErrorHandler } from "../../../middleware/error-handler";
import type { VisitorsService } from "../service";
import type { SupabaseClient } from "@supabase/supabase-js";

/**
 * モックサービスの型
 */
interface MockService {
  registerVisitor: ReturnType<typeof vi.fn>;
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

  // VisitorsServiceをモック注入するためのファクトリ
  const serviceFactory = () => mockService as unknown as VisitorsService;

  app.route("/visitors", createVisitorsRoutes(mockSupabase, serviceFactory));
  return app;
};

/**
 * 有効なUUID
 */
const VALID_UUID = "550e8400-e29b-41d4-a716-446655440000";

describe("POST /visitors - 正常系（新規登録）", () => {
  let app: Hono;
  let mockService: MockService;

  beforeEach(() => {
    vi.clearAllMocks();
    mockService = {
      registerVisitor: vi.fn(),
    };
    app = createTestApp(mockService);
  });

  it("新規visitorIdで201 Createdを返す", async () => {
    // Arrange
    mockService.registerVisitor.mockResolvedValue({
      visitorId: VALID_UUID,
      isNew: true,
      createdAt: "2024-01-01T00:00:00Z",
    });

    // Act
    const res = await app.request("/visitors", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ visitorId: VALID_UUID }),
    });

    // Assert
    expect(res.status).toBe(201);
  });

  it("レスポンスにisNew: trueが含まれる", async () => {
    // Arrange
    mockService.registerVisitor.mockResolvedValue({
      visitorId: VALID_UUID,
      isNew: true,
      createdAt: "2024-01-01T00:00:00Z",
    });

    // Act
    const res = await app.request("/visitors", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ visitorId: VALID_UUID }),
    });
    const json = (await res.json()) as Record<string, unknown>;

    // Assert
    expect(json).toHaveProperty("isNew", true);
  });

  it("レスポンスにvisitorId, createdAtが含まれる", async () => {
    // Arrange
    const expected = {
      visitorId: VALID_UUID,
      isNew: true,
      createdAt: "2024-01-01T00:00:00Z",
    };
    mockService.registerVisitor.mockResolvedValue(expected);

    // Act
    const res = await app.request("/visitors", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ visitorId: VALID_UUID }),
    });
    const json = (await res.json()) as Record<string, unknown>;

    // Assert
    expect(json).toEqual(expected);
  });
});

describe("POST /visitors - 正常系（既存登録）", () => {
  let app: Hono;
  let mockService: MockService;

  beforeEach(() => {
    vi.clearAllMocks();
    mockService = {
      registerVisitor: vi.fn(),
    };
    app = createTestApp(mockService);
  });

  it("既存visitorIdで200 OKを返す", async () => {
    // Arrange
    mockService.registerVisitor.mockResolvedValue({
      visitorId: VALID_UUID,
      isNew: false,
      createdAt: "2024-01-01T00:00:00Z",
    });

    // Act
    const res = await app.request("/visitors", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ visitorId: VALID_UUID }),
    });

    // Assert
    expect(res.status).toBe(200);
  });

  it("レスポンスにisNew: falseが含まれる", async () => {
    // Arrange
    mockService.registerVisitor.mockResolvedValue({
      visitorId: VALID_UUID,
      isNew: false,
      createdAt: "2024-01-01T00:00:00Z",
    });

    // Act
    const res = await app.request("/visitors", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ visitorId: VALID_UUID }),
    });
    const json = (await res.json()) as Record<string, unknown>;

    // Assert
    expect(json).toHaveProperty("isNew", false);
  });
});

describe("POST /visitors - 異常系（バリデーションエラー）", () => {
  let app: Hono;
  let mockService: MockService;

  beforeEach(() => {
    vi.clearAllMocks();
    mockService = {
      registerVisitor: vi.fn(),
    };
    app = createTestApp(mockService);
  });

  it("無効なUUID形式で400 Bad Requestを返す", async () => {
    // Act
    const res = await app.request("/visitors", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ visitorId: "invalid-uuid" }),
    });

    // Assert
    expect(res.status).toBe(400);
  });

  it("RFC 7807形式のエラーを返す", async () => {
    // Act
    const res = await app.request("/visitors", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ visitorId: "invalid-uuid" }),
    });

    // Assert
    expect(res.headers.get("Content-Type")).toBe("application/problem+json");

    const json = (await res.json()) as Record<string, unknown>;
    expect(json).toHaveProperty("type");
    expect(json.type).toContain("validation-error");
    expect(json).toHaveProperty("title", "Validation Error");
    expect(json).toHaveProperty("status", 400);
    expect(json).toHaveProperty("detail");
  });

  it("visitorIdなしで400 Bad Requestを返す", async () => {
    // Act
    const res = await app.request("/visitors", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({}),
    });

    // Assert
    expect(res.status).toBe(400);
  });

  it("visitorIdがnullで400 Bad Requestを返す", async () => {
    // Act
    const res = await app.request("/visitors", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ visitorId: null }),
    });

    // Assert
    expect(res.status).toBe(400);
  });
});

describe("POST /visitors - エッジケース（入力値）", () => {
  let app: Hono;
  let mockService: MockService;

  beforeEach(() => {
    vi.clearAllMocks();
    mockService = {
      registerVisitor: vi.fn(),
    };
    app = createTestApp(mockService);
  });

  it("空文字列のvisitorIdで400を返す", async () => {
    const res = await app.request("/visitors", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ visitorId: "" }),
    });

    expect(res.status).toBe(400);
  });

  it("数値型のvisitorIdで400を返す", async () => {
    const res = await app.request("/visitors", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ visitorId: 123 }),
    });

    expect(res.status).toBe(400);
  });

  it("配列型のvisitorIdで400を返す", async () => {
    const res = await app.request("/visitors", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ visitorId: [] }),
    });

    expect(res.status).toBe(400);
  });

  it("オブジェクト型のvisitorIdで400を返す", async () => {
    const res = await app.request("/visitors", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ visitorId: {} }),
    });

    expect(res.status).toBe(400);
  });

  it("大文字UUIDを受け入れる", async () => {
    const upperCaseUuid = "550E8400-E29B-41D4-A716-446655440000";
    mockService.registerVisitor.mockResolvedValue({
      visitorId: upperCaseUuid,
      isNew: true,
      createdAt: "2024-01-01T00:00:00Z",
    });

    const res = await app.request("/visitors", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ visitorId: upperCaseUuid }),
    });

    expect(res.status).toBe(201);
  });

  it("ハイフンなしUUIDで400を返す", async () => {
    const res = await app.request("/visitors", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ visitorId: "550e8400e29b41d4a716446655440000" }),
    });

    expect(res.status).toBe(400);
  });

  it("SQLインジェクション試行で400を返す", async () => {
    const res = await app.request("/visitors", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ visitorId: "' OR '1'='1" }),
    });

    expect(res.status).toBe(400);
  });
});

describe("POST /visitors - エッジケース（状態・タイミング）", () => {
  let app: Hono;
  let mockService: MockService;

  beforeEach(() => {
    vi.clearAllMocks();
    mockService = {
      registerVisitor: vi.fn(),
    };
    app = createTestApp(mockService);
  });

  it("同じvisitorIdの同時リクエストで正しく処理される", async () => {
    mockService.registerVisitor.mockResolvedValue({
      visitorId: VALID_UUID,
      isNew: true,
      createdAt: "2024-01-01T00:00:00Z",
    });

    const createRequest = () =>
      app.request("/visitors", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ visitorId: VALID_UUID }),
      });

    const responses = await Promise.all([
      createRequest(),
      createRequest(),
      createRequest(),
      createRequest(),
      createRequest(),
    ]);

    for (const res of responses) {
      expect([200, 201]).toContain(res.status);
    }
  });

  it("Serviceがエラーをスローした場合500を返す", async () => {
    mockService.registerVisitor.mockRejectedValue(new Error("DB connection failed"));

    const res = await app.request("/visitors", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ visitorId: VALID_UUID }),
    });

    expect(res.status).toBe(500);
  });

  it("500エラー時にもRFC 7807形式で返す", async () => {
    mockService.registerVisitor.mockRejectedValue(new Error("Unexpected error"));

    const res = await app.request("/visitors", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ visitorId: VALID_UUID }),
    });

    expect(res.headers.get("Content-Type")).toBe("application/problem+json");

    const json = (await res.json()) as Record<string, unknown>;
    expect(json.type).toContain("internal-error");
    expect(json.status).toBe(500);
  });
});
