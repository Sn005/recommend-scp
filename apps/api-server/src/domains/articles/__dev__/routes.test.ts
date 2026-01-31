/**
 * @file GET /articles/search エンドポイントテスト
 * @description ACに基づくroutes.tsの統合テスト
 * @see specs/005-backend-api/005-04-articles-api/005-04-02.md
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import { Hono } from "hono";
import { createArticlesRoutes } from "../routes";
import { createErrorHandler } from "../../../middleware/error-handler";
import { NotFoundError } from "../../../lib/errors";
import type { ArticlesService } from "../service";
import type { SupabaseClient } from "@supabase/supabase-js";

/**
 * モックサービスの型
 */
interface MockService {
  searchArticles: ReturnType<typeof vi.fn>;
  updateTranslation: ReturnType<typeof vi.fn>;
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

  // ArticlesServiceをモック注入するためのファクトリ
  const serviceFactory = () => mockService as unknown as ArticlesService;

  app.route("/articles", createArticlesRoutes(mockSupabase, serviceFactory));
  return app;
};

describe("GET /articles/search - 正常系", () => {
  let app: Hono;
  let mockService: MockService;

  beforeEach(() => {
    vi.clearAllMocks();
    mockService = {
      searchArticles: vi.fn(),
      updateTranslation: vi.fn(),
    };
    app = createTestApp(mockService);
  });

  it("有効なクエリで200 OKを返す", async () => {
    // Arrange
    mockService.searchArticles.mockResolvedValue({
      articles: [
        { id: "scp-173", title: "SCP-173", similarity: 0.87 },
        { id: "scp-087", title: "SCP-087", similarity: 0.82 },
      ],
      total: 2,
      query: "ホラー",
    });

    // Act
    const res = await app.request("/articles/search?q=ホラー");

    // Assert
    expect(res.status).toBe(200);
  });

  it("検索結果を返す", async () => {
    // Arrange
    const expected = {
      articles: [
        { id: "scp-173", title: "SCP-173", similarity: 0.87 },
        { id: "scp-087", title: "SCP-087", similarity: 0.82 },
      ],
      total: 2,
      query: "ホラー",
    };
    mockService.searchArticles.mockResolvedValue(expected);

    // Act
    const res = await app.request("/articles/search?q=ホラー");
    const json = (await res.json()) as Record<string, unknown>;

    // Assert
    expect(json).toEqual(expected);
  });

  it("limitパラメータで結果件数を制限できる", async () => {
    // Arrange
    mockService.searchArticles.mockResolvedValue({
      articles: [
        { id: "scp-173", title: "SCP-173", similarity: 0.87 },
        { id: "scp-087", title: "SCP-087", similarity: 0.82 },
        { id: "scp-096", title: "SCP-096", similarity: 0.78 },
        { id: "scp-106", title: "SCP-106", similarity: 0.75 },
        { id: "scp-682", title: "SCP-682", similarity: 0.72 },
      ],
      total: 5,
      query: "ホラー",
    });

    // Act
    const res = await app.request("/articles/search?q=ホラー&limit=5");

    // Assert
    expect(res.status).toBe(200);
    expect(mockService.searchArticles).toHaveBeenCalledWith("ホラー", { limit: 5 });
  });

  it("結果が類似度降順でソートされている", async () => {
    // Arrange
    mockService.searchArticles.mockResolvedValue({
      articles: [
        { id: "scp-173", title: "SCP-173", similarity: 0.87 },
        { id: "scp-087", title: "SCP-087", similarity: 0.82 },
        { id: "scp-096", title: "SCP-096", similarity: 0.78 },
      ],
      total: 3,
      query: "ホラー",
    });

    // Act
    const res = await app.request("/articles/search?q=ホラー");
    const json = (await res.json()) as { articles: { similarity: number }[] };

    // Assert
    const similarities = json.articles.map((a) => a.similarity);
    const sorted = [...similarities].sort((a, b) => b - a);
    expect(similarities).toEqual(sorted);
  });

  it("日本語クエリで検索できる", async () => {
    // Arrange
    mockService.searchArticles.mockResolvedValue({
      articles: [{ id: "scp-173", title: "SCP-173", similarity: 0.87 }],
      total: 1,
      query: "怖い話",
    });

    // Act
    const res = await app.request("/articles/search?q=怖い話");

    // Assert
    expect(res.status).toBe(200);
    expect(mockService.searchArticles).toHaveBeenCalledWith("怖い話", { limit: 10 });
  });

  it("英語クエリで検索できる", async () => {
    // Arrange
    mockService.searchArticles.mockResolvedValue({
      articles: [{ id: "scp-173", title: "SCP-173", similarity: 0.87 }],
      total: 1,
      query: "horror",
    });

    // Act
    const res = await app.request("/articles/search?q=horror");

    // Assert
    expect(res.status).toBe(200);
    expect(mockService.searchArticles).toHaveBeenCalledWith("horror", { limit: 10 });
  });
});

describe("GET /articles/search - 異常系（バリデーションエラー）", () => {
  let app: Hono;
  let mockService: MockService;

  beforeEach(() => {
    vi.clearAllMocks();
    mockService = {
      searchArticles: vi.fn(),
      updateTranslation: vi.fn(),
    };
    app = createTestApp(mockService);
  });

  it("クエリなしで400 Bad Requestを返す", async () => {
    // Act
    const res = await app.request("/articles/search");

    // Assert
    expect(res.status).toBe(400);
  });

  it("クエリなしでRFC 7807形式のエラーを返す", async () => {
    // Act
    const res = await app.request("/articles/search");

    // Assert
    expect(res.headers.get("Content-Type")).toBe("application/problem+json");

    const json = (await res.json()) as Record<string, unknown>;
    expect(json).toHaveProperty("type");
    expect(json.type).toContain("validation-error");
    expect(json).toHaveProperty("title", "Validation Error");
    expect(json).toHaveProperty("status", 400);
    expect(json).toHaveProperty("detail");
  });

  it("1文字クエリで400 Bad Requestを返す", async () => {
    // Act
    const res = await app.request("/articles/search?q=a");

    // Assert
    expect(res.status).toBe(400);
  });

  it("1文字クエリでバリデーションエラーメッセージを含む", async () => {
    // Act
    const res = await app.request("/articles/search?q=あ");
    const json = (await res.json()) as Record<string, unknown>;

    // Assert
    expect(json.detail).toContain("at least 2 characters");
  });

  it("空文字クエリで400を返す", async () => {
    // Act
    const res = await app.request("/articles/search?q=");

    // Assert
    expect(res.status).toBe(400);
  });

  it("limitが0で400を返す", async () => {
    // Act
    const res = await app.request("/articles/search?q=ホラー&limit=0");

    // Assert
    expect(res.status).toBe(400);
  });

  it("limitが51以上で400を返す", async () => {
    // Act
    const res = await app.request("/articles/search?q=ホラー&limit=51");

    // Assert
    expect(res.status).toBe(400);
  });

  it("limitが負数で400を返す", async () => {
    // Act
    const res = await app.request("/articles/search?q=ホラー&limit=-1");

    // Assert
    expect(res.status).toBe(400);
  });

  it("limitが数値でない場合400を返す", async () => {
    // Act
    const res = await app.request("/articles/search?q=ホラー&limit=abc");

    // Assert
    expect(res.status).toBe(400);
  });
});

describe("GET /articles/search - エッジケース", () => {
  let app: Hono;
  let mockService: MockService;

  beforeEach(() => {
    vi.clearAllMocks();
    mockService = {
      searchArticles: vi.fn(),
      updateTranslation: vi.fn(),
    };
    app = createTestApp(mockService);
  });

  it("2文字クエリを受け入れる", async () => {
    // Arrange
    mockService.searchArticles.mockResolvedValue({
      articles: [],
      total: 0,
      query: "ab",
    });

    // Act
    const res = await app.request("/articles/search?q=ab");

    // Assert
    expect(res.status).toBe(200);
  });

  it("limit=1を受け入れる", async () => {
    // Arrange
    mockService.searchArticles.mockResolvedValue({
      articles: [{ id: "scp-173", title: "SCP-173", similarity: 0.87 }],
      total: 1,
      query: "ホラー",
    });

    // Act
    const res = await app.request("/articles/search?q=ホラー&limit=1");

    // Assert
    expect(res.status).toBe(200);
    expect(mockService.searchArticles).toHaveBeenCalledWith("ホラー", { limit: 1 });
  });

  it("limit=50を受け入れる", async () => {
    // Arrange
    mockService.searchArticles.mockResolvedValue({
      articles: [],
      total: 0,
      query: "ホラー",
    });

    // Act
    const res = await app.request("/articles/search?q=ホラー&limit=50");

    // Assert
    expect(res.status).toBe(200);
    expect(mockService.searchArticles).toHaveBeenCalledWith("ホラー", { limit: 50 });
  });

  it("limitなしでデフォルト10が適用される", async () => {
    // Arrange
    mockService.searchArticles.mockResolvedValue({
      articles: [],
      total: 0,
      query: "ホラー",
    });

    // Act
    const res = await app.request("/articles/search?q=ホラー");

    // Assert
    expect(res.status).toBe(200);
    expect(mockService.searchArticles).toHaveBeenCalledWith("ホラー", { limit: 10 });
  });

  it("検索結果が0件の場合も200を返す", async () => {
    // Arrange
    mockService.searchArticles.mockResolvedValue({
      articles: [],
      total: 0,
      query: "存在しないクエリ",
    });

    // Act
    const res = await app.request("/articles/search?q=存在しないクエリ");
    const json = (await res.json()) as Record<string, unknown>;

    // Assert
    expect(res.status).toBe(200);
    expect(json).toEqual({
      articles: [],
      total: 0,
      query: "存在しないクエリ",
    });
  });

  it("特殊文字を含むクエリを処理できる", async () => {
    // Arrange
    mockService.searchArticles.mockResolvedValue({
      articles: [],
      total: 0,
      query: "SCP-173",
    });

    // Act
    const res = await app.request("/articles/search?q=SCP-173");

    // Assert
    expect(res.status).toBe(200);
    expect(mockService.searchArticles).toHaveBeenCalledWith("SCP-173", { limit: 10 });
  });

  it("URLエンコードされたクエリを処理できる", async () => {
    // Arrange
    mockService.searchArticles.mockResolvedValue({
      articles: [],
      total: 0,
      query: "ホラー & SF",
    });

    // Act
    const res = await app.request("/articles/search?q=" + encodeURIComponent("ホラー & SF"));

    // Assert
    expect(res.status).toBe(200);
  });
});

describe("GET /articles/search - サービスエラー", () => {
  let app: Hono;
  let mockService: MockService;

  beforeEach(() => {
    vi.clearAllMocks();
    mockService = {
      searchArticles: vi.fn(),
      updateTranslation: vi.fn(),
    };
    app = createTestApp(mockService);
  });

  it("Serviceがエラーをスローした場合500を返す", async () => {
    // Arrange
    mockService.searchArticles.mockRejectedValue(new Error("OpenAI API error"));

    // Act
    const res = await app.request("/articles/search?q=ホラー");

    // Assert
    expect(res.status).toBe(500);
  });

  it("500エラー時にもRFC 7807形式で返す", async () => {
    // Arrange
    mockService.searchArticles.mockRejectedValue(new Error("Unexpected error"));

    // Act
    const res = await app.request("/articles/search?q=ホラー");

    // Assert
    expect(res.headers.get("Content-Type")).toBe("application/problem+json");

    const json = (await res.json()) as Record<string, unknown>;
    expect(json.type).toContain("internal-error");
    expect(json.status).toBe(500);
  });
});

// ============================================
// PATCH /articles/:articleId/translation
// ============================================

describe("PATCH /articles/:articleId/translation - 正常系", () => {
  let app: Hono;
  let mockService: MockService;

  beforeEach(() => {
    vi.clearAllMocks();
    mockService = {
      searchArticles: vi.fn(),
      updateTranslation: vi.fn(),
    };
    app = createTestApp(mockService);
  });

  it("有効なリクエストで200 OKを返す", async () => {
    // Arrange
    mockService.updateTranslation.mockResolvedValue({
      articleId: "scp-173",
      lang: "ja",
      hasTranslation: false,
      checkedAt: "2026-01-31T12:00:00Z",
    });

    // Act
    const res = await app.request("/articles/scp-173/translation", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        lang: "ja",
        hasTranslation: false,
      }),
    });

    // Assert
    expect(res.status).toBe(200);
  });

  it("レスポンスにsuccess: trueとdataが含まれる", async () => {
    // Arrange
    const expected = {
      articleId: "scp-173",
      lang: "ja",
      hasTranslation: false,
      checkedAt: "2026-01-31T12:00:00Z",
    };
    mockService.updateTranslation.mockResolvedValue(expected);

    // Act
    const res = await app.request("/articles/scp-173/translation", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        lang: "ja",
        hasTranslation: false,
      }),
    });
    const json = (await res.json()) as { success: boolean; data: unknown };

    // Assert
    expect(json.success).toBe(true);
    expect(json.data).toEqual(expected);
  });

  it("hasTranslation=trueで更新できる", async () => {
    // Arrange
    mockService.updateTranslation.mockResolvedValue({
      articleId: "scp-173",
      lang: "ja",
      hasTranslation: true,
      checkedAt: "2026-01-31T12:00:00Z",
    });

    // Act
    const res = await app.request("/articles/scp-173/translation", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        lang: "ja",
        hasTranslation: true,
      }),
    });

    // Assert
    expect(res.status).toBe(200);
    expect(mockService.updateTranslation).toHaveBeenCalledWith("scp-173", "ja", true);
  });

  it("特殊文字を含むarticleIdを処理できる", async () => {
    // Arrange
    mockService.updateTranslation.mockResolvedValue({
      articleId: "SCP-173-JP",
      lang: "ja",
      hasTranslation: false,
      checkedAt: "2026-01-31T12:00:00Z",
    });

    // Act
    const res = await app.request("/articles/SCP-173-JP/translation", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        lang: "ja",
        hasTranslation: false,
      }),
    });

    // Assert
    expect(res.status).toBe(200);
    expect(mockService.updateTranslation).toHaveBeenCalledWith("SCP-173-JP", "ja", false);
  });
});

describe("PATCH /articles/:articleId/translation - 異常系", () => {
  let app: Hono;
  let mockService: MockService;

  beforeEach(() => {
    vi.clearAllMocks();
    mockService = {
      searchArticles: vi.fn(),
      updateTranslation: vi.fn(),
    };
    app = createTestApp(mockService);
  });

  it("存在しない翻訳レコードで404を返す", async () => {
    // Arrange
    mockService.updateTranslation.mockRejectedValue(
      new NotFoundError("Translation", "nonexistent/ja")
    );

    // Act
    const res = await app.request("/articles/nonexistent/translation", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        lang: "ja",
        hasTranslation: false,
      }),
    });

    // Assert
    expect(res.status).toBe(404);
  });

  it("404エラー時にRFC 7807形式で返す", async () => {
    // Arrange
    mockService.updateTranslation.mockRejectedValue(
      new NotFoundError("Translation", "nonexistent/ja")
    );

    // Act
    const res = await app.request("/articles/nonexistent/translation", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        lang: "ja",
        hasTranslation: false,
      }),
    });

    // Assert
    expect(res.headers.get("Content-Type")).toBe("application/problem+json");

    const json = (await res.json()) as Record<string, unknown>;
    expect(json).toHaveProperty("type");
    expect(json.type).toContain("not-found");
    expect(json).toHaveProperty("status", 404);
  });
});

describe("PATCH /articles/:articleId/translation - バリデーション", () => {
  let app: Hono;
  let mockService: MockService;

  beforeEach(() => {
    vi.clearAllMocks();
    mockService = {
      searchArticles: vi.fn(),
      updateTranslation: vi.fn(),
    };
    app = createTestApp(mockService);
  });

  it("langが1文字で400を返す", async () => {
    // Act
    const res = await app.request("/articles/scp-173/translation", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        lang: "x",
        hasTranslation: false,
      }),
    });

    // Assert
    expect(res.status).toBe(400);
  });

  it("langが6文字以上で400を返す", async () => {
    // Act
    const res = await app.request("/articles/scp-173/translation", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        lang: "toolong",
        hasTranslation: false,
      }),
    });

    // Assert
    expect(res.status).toBe(400);
  });

  it("langが空文字列で400を返す", async () => {
    // Act
    const res = await app.request("/articles/scp-173/translation", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        lang: "",
        hasTranslation: false,
      }),
    });

    // Assert
    expect(res.status).toBe(400);
  });

  it("hasTranslationが文字列で400を返す", async () => {
    // Act
    const res = await app.request("/articles/scp-173/translation", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        lang: "ja",
        hasTranslation: "true",
      }),
    });

    // Assert
    expect(res.status).toBe(400);
  });

  it("リクエストボディなしで400を返す", async () => {
    // Act
    const res = await app.request("/articles/scp-173/translation", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
    });

    // Assert
    expect(res.status).toBe(400);
  });

  it("langがない場合400を返す", async () => {
    // Act
    const res = await app.request("/articles/scp-173/translation", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        hasTranslation: false,
      }),
    });

    // Assert
    expect(res.status).toBe(400);
  });

  it("hasTranslationがない場合400を返す", async () => {
    // Act
    const res = await app.request("/articles/scp-173/translation", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        lang: "ja",
      }),
    });

    // Assert
    expect(res.status).toBe(400);
  });

  it("バリデーションエラー時にRFC 7807形式で返す", async () => {
    // Act
    const res = await app.request("/articles/scp-173/translation", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        lang: "x",
        hasTranslation: false,
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
