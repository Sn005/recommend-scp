/**
 * @file POST /feedback エンドポイントテスト
 * @description ACに基づくroutes.tsの統合テスト
 * @see specs/005-backend-api/005-06-feedback-api/005-06-02.md
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import { Hono } from "hono";
import { createFeedbackRoutes } from "../routes";
import { createErrorHandler } from "../../../middleware/error-handler";
import { NotFoundError } from "../../../lib/errors";
import type { FeedbackService } from "../service";
import type { SupabaseClient } from "@supabase/supabase-js";

/**
 * モックサービスの型
 */
interface MockService {
  recordFeedback: ReturnType<typeof vi.fn>;
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

  // FeedbackServiceをモック注入するためのファクトリ
  const serviceFactory = () => mockService as unknown as FeedbackService;

  app.route("/feedback", createFeedbackRoutes(mockSupabase, serviceFactory));
  return app;
};

/**
 * 有効なUUID
 */
const VALID_VISITOR_ID = "550e8400-e29b-41d4-a716-446655440000";
const VALID_ARTICLE_ID = "scp-173";

describe("POST /feedback - 正常系", () => {
  let app: Hono;
  let mockService: MockService;

  beforeEach(() => {
    vi.clearAllMocks();
    mockService = {
      recordFeedback: vi.fn(),
    };
    app = createTestApp(mockService);
  });

  it("有効なリクエストで200を返す", async () => {
    // Arrange
    mockService.recordFeedback.mockResolvedValue(undefined);

    // Act
    const res = await app.request("/feedback", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        visitorId: VALID_VISITOR_ID,
        articleId: VALID_ARTICLE_ID,
        type: "like",
      }),
    });

    // Assert
    expect(res.status).toBe(200);
  });

  it("Likeフィードバックが記録される", async () => {
    // Arrange
    mockService.recordFeedback.mockResolvedValue(undefined);

    // Act
    await app.request("/feedback", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        visitorId: VALID_VISITOR_ID,
        articleId: VALID_ARTICLE_ID,
        type: "like",
      }),
    });

    // Assert
    expect(mockService.recordFeedback).toHaveBeenCalledWith(
      VALID_VISITOR_ID,
      VALID_ARTICLE_ID,
      "like"
    );
  });

  it("Dislikeフィードバックが記録される", async () => {
    // Arrange
    mockService.recordFeedback.mockResolvedValue(undefined);

    // Act
    await app.request("/feedback", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        visitorId: VALID_VISITOR_ID,
        articleId: VALID_ARTICLE_ID,
        type: "dislike",
      }),
    });

    // Assert
    expect(mockService.recordFeedback).toHaveBeenCalledWith(
      VALID_VISITOR_ID,
      VALID_ARTICLE_ID,
      "dislike"
    );
  });

  it("レスポンスにsuccess, visitorId, articleId, typeが含まれる", async () => {
    // Arrange
    mockService.recordFeedback.mockResolvedValue(undefined);

    // Act
    const res = await app.request("/feedback", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        visitorId: VALID_VISITOR_ID,
        articleId: VALID_ARTICLE_ID,
        type: "like",
      }),
    });
    const json = (await res.json()) as Record<string, unknown>;

    // Assert
    expect(json).toEqual({
      success: true,
      visitorId: VALID_VISITOR_ID,
      articleId: VALID_ARTICLE_ID,
      type: "like",
    });
  });

  it("同じ記事への再フィードバックで200を返す（上書き）", async () => {
    // Arrange - 2回目の呼び出しでも正常に動作
    mockService.recordFeedback.mockResolvedValue(undefined);

    // Act - 1回目
    await app.request("/feedback", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        visitorId: VALID_VISITOR_ID,
        articleId: VALID_ARTICLE_ID,
        type: "like",
      }),
    });

    // Act - 2回目（dislikeに変更）
    const res = await app.request("/feedback", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        visitorId: VALID_VISITOR_ID,
        articleId: VALID_ARTICLE_ID,
        type: "dislike",
      }),
    });

    // Assert
    expect(res.status).toBe(200);
    expect(mockService.recordFeedback).toHaveBeenCalledTimes(2);
  });
});

describe("POST /feedback - 異常系（visitorId未登録）", () => {
  let app: Hono;
  let mockService: MockService;

  beforeEach(() => {
    vi.clearAllMocks();
    mockService = {
      recordFeedback: vi.fn(),
    };
    app = createTestApp(mockService);
  });

  it("未登録visitorIdで404を返す", async () => {
    // Arrange
    mockService.recordFeedback.mockRejectedValue(new NotFoundError("Visitor", VALID_VISITOR_ID));

    // Act
    const res = await app.request("/feedback", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        visitorId: VALID_VISITOR_ID,
        articleId: VALID_ARTICLE_ID,
        type: "like",
      }),
    });

    // Assert
    expect(res.status).toBe(404);
  });

  it("404エラー時にRFC 7807形式で返す", async () => {
    // Arrange
    mockService.recordFeedback.mockRejectedValue(new NotFoundError("Visitor", VALID_VISITOR_ID));

    // Act
    const res = await app.request("/feedback", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        visitorId: VALID_VISITOR_ID,
        articleId: VALID_ARTICLE_ID,
        type: "like",
      }),
    });

    // Assert
    expect(res.headers.get("Content-Type")).toBe("application/problem+json");

    const json = (await res.json()) as Record<string, unknown>;
    expect(json).toHaveProperty("type");
    expect(json.type).toContain("not-found");
    expect(json).toHaveProperty("status", 404);
    expect(json).toHaveProperty("detail");
    expect(json.detail).toContain(VALID_VISITOR_ID);
  });
});

describe("POST /feedback - 異常系（バリデーションエラー）", () => {
  let app: Hono;
  let mockService: MockService;

  beforeEach(() => {
    vi.clearAllMocks();
    mockService = {
      recordFeedback: vi.fn(),
    };
    app = createTestApp(mockService);
  });

  it("無効なtypeで400を返す", async () => {
    // Act
    const res = await app.request("/feedback", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        visitorId: VALID_VISITOR_ID,
        articleId: VALID_ARTICLE_ID,
        type: "invalid",
      }),
    });

    // Assert
    expect(res.status).toBe(400);
  });

  it("無効なUUID形式で400を返す", async () => {
    // Act
    const res = await app.request("/feedback", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        visitorId: "invalid-uuid",
        articleId: VALID_ARTICLE_ID,
        type: "like",
      }),
    });

    // Assert
    expect(res.status).toBe(400);
  });

  it("空のarticleIdで400を返す", async () => {
    // Act
    const res = await app.request("/feedback", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        visitorId: VALID_VISITOR_ID,
        articleId: "",
        type: "like",
      }),
    });

    // Assert
    expect(res.status).toBe(400);
  });

  it("visitorIdなしで400を返す", async () => {
    // Act
    const res = await app.request("/feedback", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        articleId: VALID_ARTICLE_ID,
        type: "like",
      }),
    });

    // Assert
    expect(res.status).toBe(400);
  });

  it("articleIdなしで400を返す", async () => {
    // Act
    const res = await app.request("/feedback", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        visitorId: VALID_VISITOR_ID,
        type: "like",
      }),
    });

    // Assert
    expect(res.status).toBe(400);
  });

  it("typeなしで400を返す", async () => {
    // Act
    const res = await app.request("/feedback", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        visitorId: VALID_VISITOR_ID,
        articleId: VALID_ARTICLE_ID,
      }),
    });

    // Assert
    expect(res.status).toBe(400);
  });

  it("RFC 7807形式のエラーを返す", async () => {
    // Act
    const res = await app.request("/feedback", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        visitorId: VALID_VISITOR_ID,
        articleId: VALID_ARTICLE_ID,
        type: "invalid",
      }),
    });

    // Assert
    expect(res.headers.get("Content-Type")).toBe("application/problem+json");

    const json = (await res.json()) as Record<string, unknown>;
    expect(json).toHaveProperty("type");
    expect(json.type).toContain("validation-error");
    expect(json).toHaveProperty("title", "Validation Error");
    expect(json).toHaveProperty("status", 400);
  });
});

describe("POST /feedback - エッジケース", () => {
  let app: Hono;
  let mockService: MockService;

  beforeEach(() => {
    vi.clearAllMocks();
    mockService = {
      recordFeedback: vi.fn(),
    };
    app = createTestApp(mockService);
  });

  it("Serviceがエラーをスローした場合500を返す", async () => {
    // Arrange
    mockService.recordFeedback.mockRejectedValue(new Error("DB connection failed"));

    // Act
    const res = await app.request("/feedback", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        visitorId: VALID_VISITOR_ID,
        articleId: VALID_ARTICLE_ID,
        type: "like",
      }),
    });

    // Assert
    expect(res.status).toBe(500);
  });

  it("500エラー時にもRFC 7807形式で返す", async () => {
    // Arrange
    mockService.recordFeedback.mockRejectedValue(new Error("Unexpected error"));

    // Act
    const res = await app.request("/feedback", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        visitorId: VALID_VISITOR_ID,
        articleId: VALID_ARTICLE_ID,
        type: "like",
      }),
    });

    // Assert
    expect(res.headers.get("Content-Type")).toBe("application/problem+json");

    const json = (await res.json()) as Record<string, unknown>;
    expect(json.type).toContain("internal-error");
    expect(json.status).toBe(500);
  });
});
