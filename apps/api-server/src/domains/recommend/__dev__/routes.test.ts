/**
 * @file POST /recommend エンドポイントテスト
 * @description ACに基づくroutes.tsの統合テスト
 * @see specs/005-backend-api/005-05-recommend-api/005-05-02.md
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import { Hono } from "hono";
import { createRecommendRoutes } from "../routes";
import { createErrorHandler } from "../../../middleware/error-handler";
import { NotFoundError, OnboardingRequiredError } from "../../../lib/errors";
import type { RecommendService } from "../service";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { RecommendedArticle } from "@recommend-scp/shared/recommendation";

/**
 * モックサービスの型
 */
interface MockService {
  getRecommendations: ReturnType<typeof vi.fn>;
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

  // RecommendServiceをモック注入するためのファクトリ
  const serviceFactory = () => mockService as unknown as RecommendService;

  app.route("/recommend", createRecommendRoutes(mockSupabase, serviceFactory));
  return app;
};

/**
 * 有効なUUID
 */
const VALID_VISITOR_ID = "550e8400-e29b-41d4-a716-446655440000";
const UNKNOWN_VISITOR_ID = "00000000-0000-0000-0000-000000000000";

/**
 * モック推薦記事
 */
const mockRecommendations: RecommendedArticle[] = [
  {
    id: "scp-173",
    title: "彫刻",
    similarityScore: 0.95,
    source: "preference",
    url: "http://scp-jp.wikidot.com/scp-173",
  },
  {
    id: "scp-096",
    title: "シャイガイ",
    similarityScore: 0.87,
    source: "preference",
    url: "http://scp-jp.wikidot.com/scp-096",
  },
  {
    id: "scp-999",
    title: "くすぐりオバケ",
    similarityScore: 0.45,
    source: "serendipity",
    url: "http://scp-jp.wikidot.com/scp-999",
  },
];

describe("POST /recommend - 正常系", () => {
  let app: Hono;
  let mockService: MockService;

  beforeEach(() => {
    vi.clearAllMocks();
    mockService = {
      getRecommendations: vi.fn(),
    };
    app = createTestApp(mockService);
  });

  it("有効なリクエストで200を返す", async () => {
    // Arrange
    mockService.getRecommendations.mockResolvedValue(mockRecommendations);

    // Act
    const res = await app.request("/recommend", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        visitorId: VALID_VISITOR_ID,
        limit: 10,
      }),
    });

    // Assert
    expect(res.status).toBe(200);
  });

  it("レスポンスにrecommendations配列とcountが含まれる", async () => {
    // Arrange
    mockService.getRecommendations.mockResolvedValue(mockRecommendations);

    // Act
    const res = await app.request("/recommend", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        visitorId: VALID_VISITOR_ID,
      }),
    });
    const json = (await res.json()) as Record<string, unknown>;

    // Assert
    expect(json).toHaveProperty("recommendations");
    expect(json).toHaveProperty("count", 3);
    expect(Array.isArray(json.recommendations)).toBe(true);
  });

  it("limitパラメータで結果件数を制限できる", async () => {
    // Arrange
    mockService.getRecommendations.mockResolvedValue([mockRecommendations[0]]);

    // Act
    const res = await app.request("/recommend", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        visitorId: VALID_VISITOR_ID,
        limit: 1,
      }),
    });
    const json = (await res.json()) as Record<string, unknown>;

    // Assert
    expect(res.status).toBe(200);
    expect(mockService.getRecommendations).toHaveBeenCalledWith(VALID_VISITOR_ID, 1);
    expect(json.count).toBe(1);
  });

  it("limit省略時はデフォルト10件", async () => {
    // Arrange
    mockService.getRecommendations.mockResolvedValue([]);

    // Act
    await app.request("/recommend", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        visitorId: VALID_VISITOR_ID,
      }),
    });

    // Assert
    expect(mockService.getRecommendations).toHaveBeenCalledWith(VALID_VISITOR_ID, 10);
  });

  it("推薦結果が0件でも200を返す", async () => {
    // Arrange
    mockService.getRecommendations.mockResolvedValue([]);

    // Act
    const res = await app.request("/recommend", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        visitorId: VALID_VISITOR_ID,
      }),
    });
    const json = (await res.json()) as Record<string, unknown>;

    // Assert
    expect(res.status).toBe(200);
    expect(json.recommendations).toEqual([]);
    expect(json.count).toBe(0);
  });
});

describe("POST /recommend - レスポンス構造", () => {
  let app: Hono;
  let mockService: MockService;

  beforeEach(() => {
    vi.clearAllMocks();
    mockService = {
      getRecommendations: vi.fn(),
    };
    app = createTestApp(mockService);
  });

  it("各記事にid, title, similarityScore, sourceが含まれる", async () => {
    // Arrange
    mockService.getRecommendations.mockResolvedValue(mockRecommendations);

    // Act
    const res = await app.request("/recommend", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        visitorId: VALID_VISITOR_ID,
      }),
    });
    const json = (await res.json()) as { recommendations: RecommendedArticle[] };

    // Assert
    for (const article of json.recommendations) {
      expect(article).toHaveProperty("id");
      expect(article).toHaveProperty("title");
      expect(article).toHaveProperty("similarityScore");
      expect(article).toHaveProperty("source");
    }
  });

  it("sourceはpreference/serendipityのいずれか", async () => {
    // Arrange
    mockService.getRecommendations.mockResolvedValue(mockRecommendations);

    // Act
    const res = await app.request("/recommend", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        visitorId: VALID_VISITOR_ID,
      }),
    });
    const json = (await res.json()) as { recommendations: RecommendedArticle[] };

    // Assert
    for (const article of json.recommendations) {
      expect(["preference", "serendipity"]).toContain(article.source);
    }
  });

  it("similarityScoreは0-1の範囲", async () => {
    // Arrange
    mockService.getRecommendations.mockResolvedValue(mockRecommendations);

    // Act
    const res = await app.request("/recommend", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        visitorId: VALID_VISITOR_ID,
      }),
    });
    const json = (await res.json()) as { recommendations: RecommendedArticle[] };

    // Assert
    for (const article of json.recommendations) {
      expect(article.similarityScore).toBeGreaterThanOrEqual(0);
      expect(article.similarityScore).toBeLessThanOrEqual(1);
    }
  });
});

describe("POST /recommend - 異常系（visitorId未登録）", () => {
  let app: Hono;
  let mockService: MockService;

  beforeEach(() => {
    vi.clearAllMocks();
    mockService = {
      getRecommendations: vi.fn(),
    };
    app = createTestApp(mockService);
  });

  it("未登録visitorIdで404を返す", async () => {
    // Arrange
    mockService.getRecommendations.mockRejectedValue(
      new NotFoundError("Visitor", UNKNOWN_VISITOR_ID)
    );

    // Act
    const res = await app.request("/recommend", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        visitorId: UNKNOWN_VISITOR_ID,
      }),
    });

    // Assert
    expect(res.status).toBe(404);
  });

  it("404エラー時にRFC 7807形式で返す", async () => {
    // Arrange
    mockService.getRecommendations.mockRejectedValue(
      new NotFoundError("Visitor", UNKNOWN_VISITOR_ID)
    );

    // Act
    const res = await app.request("/recommend", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        visitorId: UNKNOWN_VISITOR_ID,
      }),
    });

    // Assert
    expect(res.headers.get("Content-Type")).toBe("application/problem+json");

    const json = (await res.json()) as Record<string, unknown>;
    expect(json).toHaveProperty("type");
    expect(json.type).toContain("not-found");
    expect(json).toHaveProperty("status", 404);
    expect(json).toHaveProperty("detail");
    expect(json.detail).toContain(UNKNOWN_VISITOR_ID);
  });
});

describe("POST /recommend - 異常系（オンボーディング未完了）", () => {
  let app: Hono;
  let mockService: MockService;

  beforeEach(() => {
    vi.clearAllMocks();
    mockService = {
      getRecommendations: vi.fn(),
    };
    app = createTestApp(mockService);
  });

  it("オンボーディング未完了で400を返す", async () => {
    // Arrange
    mockService.getRecommendations.mockRejectedValue(new OnboardingRequiredError(VALID_VISITOR_ID));

    // Act
    const res = await app.request("/recommend", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        visitorId: VALID_VISITOR_ID,
      }),
    });

    // Assert
    expect(res.status).toBe(400);
  });

  it("onboarding-requiredエラーをRFC 7807形式で返す", async () => {
    // Arrange
    mockService.getRecommendations.mockRejectedValue(new OnboardingRequiredError(VALID_VISITOR_ID));

    // Act
    const res = await app.request("/recommend", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        visitorId: VALID_VISITOR_ID,
      }),
    });

    // Assert
    expect(res.headers.get("Content-Type")).toBe("application/problem+json");

    const json = (await res.json()) as Record<string, unknown>;
    expect(json).toHaveProperty("type");
    expect(json.type).toContain("onboarding-required");
    expect(json).toHaveProperty("title", "Onboarding Required");
    expect(json).toHaveProperty("status", 400);
  });
});

describe("POST /recommend - バリデーション", () => {
  let app: Hono;
  let mockService: MockService;

  beforeEach(() => {
    vi.clearAllMocks();
    mockService = {
      getRecommendations: vi.fn(),
    };
    app = createTestApp(mockService);
  });

  it("無効なUUID形式で400を返す", async () => {
    // Act
    const res = await app.request("/recommend", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        visitorId: "invalid-uuid",
        limit: 10,
      }),
    });

    // Assert
    expect(res.status).toBe(400);
  });

  it("visitorIdなしで400を返す", async () => {
    // Act
    const res = await app.request("/recommend", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        limit: 10,
      }),
    });

    // Assert
    expect(res.status).toBe(400);
  });

  it("limit=0で400を返す", async () => {
    // Act
    const res = await app.request("/recommend", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        visitorId: VALID_VISITOR_ID,
        limit: 0,
      }),
    });

    // Assert
    expect(res.status).toBe(400);
  });

  it("limit=51で400を返す", async () => {
    // Act
    const res = await app.request("/recommend", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        visitorId: VALID_VISITOR_ID,
        limit: 51,
      }),
    });

    // Assert
    expect(res.status).toBe(400);
  });

  it("limit=1で1件返す（境界値）", async () => {
    // Arrange
    mockService.getRecommendations.mockResolvedValue([mockRecommendations[0]]);

    // Act
    const res = await app.request("/recommend", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        visitorId: VALID_VISITOR_ID,
        limit: 1,
      }),
    });

    // Assert
    expect(res.status).toBe(200);
    expect(mockService.getRecommendations).toHaveBeenCalledWith(VALID_VISITOR_ID, 1);
  });

  it("limit=50で正常に動作（境界値）", async () => {
    // Arrange
    mockService.getRecommendations.mockResolvedValue([]);

    // Act
    const res = await app.request("/recommend", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        visitorId: VALID_VISITOR_ID,
        limit: 50,
      }),
    });

    // Assert
    expect(res.status).toBe(200);
    expect(mockService.getRecommendations).toHaveBeenCalledWith(VALID_VISITOR_ID, 50);
  });

  it("RFC 7807形式のバリデーションエラーを返す", async () => {
    // Act
    const res = await app.request("/recommend", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        visitorId: "invalid-uuid",
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

describe("POST /recommend - エッジケース", () => {
  let app: Hono;
  let mockService: MockService;

  beforeEach(() => {
    vi.clearAllMocks();
    mockService = {
      getRecommendations: vi.fn(),
    };
    app = createTestApp(mockService);
  });

  it("Serviceがエラーをスローした場合500を返す", async () => {
    // Arrange
    mockService.getRecommendations.mockRejectedValue(new Error("DB connection failed"));

    // Act
    const res = await app.request("/recommend", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        visitorId: VALID_VISITOR_ID,
      }),
    });

    // Assert
    expect(res.status).toBe(500);
  });

  it("500エラー時にもRFC 7807形式で返す", async () => {
    // Arrange
    mockService.getRecommendations.mockRejectedValue(new Error("Unexpected error"));

    // Act
    const res = await app.request("/recommend", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        visitorId: VALID_VISITOR_ID,
      }),
    });

    // Assert
    expect(res.headers.get("Content-Type")).toBe("application/problem+json");

    const json = (await res.json()) as Record<string, unknown>;
    expect(json.type).toContain("internal-error");
    expect(json.status).toBe(500);
  });

  it("大文字UUIDを受け入れる", async () => {
    // Arrange
    const upperCaseUuid = VALID_VISITOR_ID.toUpperCase();
    mockService.getRecommendations.mockResolvedValue([]);

    // Act
    const res = await app.request("/recommend", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        visitorId: upperCaseUuid,
      }),
    });

    // Assert
    expect(res.status).toBe(200);
  });
});

describe("POST /recommend - パフォーマンス", () => {
  let app: Hono;
  let mockService: MockService;

  beforeEach(() => {
    vi.clearAllMocks();
    mockService = {
      getRecommendations: vi.fn(),
    };
    app = createTestApp(mockService);
  });

  it("200ms以内にレスポンスを返す", async () => {
    // Arrange
    mockService.getRecommendations.mockResolvedValue(mockRecommendations);

    // Act
    const startTime = performance.now();
    const res = await app.request("/recommend", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        visitorId: VALID_VISITOR_ID,
      }),
    });
    const elapsedTime = performance.now() - startTime;

    // Assert
    expect(res.status).toBe(200);
    expect(elapsedTime).toBeLessThan(200);
  });
});
