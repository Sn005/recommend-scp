import { describe, it, expect, vi } from "vitest";
import { Hono } from "hono";
import { HTTPException } from "hono/http-exception";
import { zValidator } from "@hono/zod-validator";
import { z } from "zod";
import { createErrorHandler, type Logger } from "../error-handler";
import type { ProblemDetails } from "../../lib/problem-details";
import { NotFoundError, OnboardingRequiredError } from "../../lib/errors";

/**
 * モックロガーを作成
 */
const createMockLogger = (): Logger => ({
  info: vi.fn(),
  warn: vi.fn(),
  error: vi.fn(),
  debug: vi.fn(),
});

/**
 * zValidatorでZodErrorをスローするためのhook
 */
const throwOnValidationError = <T>(result: { success: boolean; error?: z.ZodError<T> }) => {
  if (!result.success && result.error) {
    throw result.error;
  }
};

/**
 * テスト用アプリを作成（app.onError形式）
 */
const createTestApp = (logger: Logger = createMockLogger()) => {
  const app = new Hono();
  app.onError(createErrorHandler(logger));
  return app;
};

describe("エラーハンドリングミドルウェア - Zodバリデーション", () => {
  it("Zodバリデーションエラー時に400とProblemDetailsを返す", async () => {
    const app = createTestApp();
    const schema = z.object({ name: z.string() });

    app.post("/test", zValidator("json", schema, throwOnValidationError), (c) =>
      c.json({ ok: true })
    );

    const res = await app.request("/test", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: 123 }),
    });

    expect(res.status).toBe(400);
    expect(res.headers.get("Content-Type")).toBe("application/problem+json");

    const json = (await res.json()) as ProblemDetails;
    expect(json.type).toContain("validation-error");
    expect(json.title).toBe("Validation Error");
    expect(json.status).toBe(400);
    expect(json.detail).toBeDefined();
    expect(json.instance).toBe("/test");
  });

  it("複数のバリデーションエラーがある場合、すべてのエラーメッセージをdetailに含む", async () => {
    const app = createTestApp();
    const schema = z.object({
      email: z.string().email("Invalid email format"),
      age: z.number().min(0, "Age must be non-negative"),
    });

    app.post("/test", zValidator("json", schema, throwOnValidationError), (c) =>
      c.json({ ok: true })
    );

    const res = await app.request("/test", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: "invalid", age: -1 }),
    });

    const json = (await res.json()) as ProblemDetails;
    expect(json.detail).toContain("email");
    expect(json.detail).toContain("age");
  });
});

describe("エラーハンドリングミドルウェア - NotFoundError", () => {
  it("NotFoundError時に404とProblemDetailsを返す", async () => {
    const app = createTestApp();

    app.get("/visitors/:id", (c) => {
      const id = c.req.param("id");
      throw new NotFoundError("Visitor", id);
    });

    const res = await app.request("/visitors/abc-123", { method: "GET" });

    expect(res.status).toBe(404);
    expect(res.headers.get("Content-Type")).toBe("application/problem+json");

    const json = (await res.json()) as ProblemDetails;
    expect(json.type).toContain("not-found");
    expect(json.title).toBe("Resource Not Found");
    expect(json.status).toBe(404);
    expect(json.detail).toBe("Visitor not found: abc-123");
    expect(json.instance).toBe("/visitors/abc-123");
  });
});

describe("エラーハンドリングミドルウェア - OnboardingRequiredError", () => {
  it("OnboardingRequiredError時に403とProblemDetailsを返す", async () => {
    const app = createTestApp();

    app.post("/recommend", () => {
      throw new OnboardingRequiredError("visitor-456");
    });

    const res = await app.request("/recommend", { method: "POST" });

    expect(res.status).toBe(403);
    expect(res.headers.get("Content-Type")).toBe("application/problem+json");

    const json = (await res.json()) as ProblemDetails;
    expect(json.type).toContain("onboarding-required");
    expect(json.title).toBe("Onboarding Required");
    expect(json.status).toBe(403);
    expect(json.detail).toBe("Onboarding required for visitor: visitor-456");
    expect(json.instance).toBe("/recommend");
  });
});

describe("エラーハンドリングミドルウェア - HTTPException", () => {
  it("HTTPException（404）時にnot-found typeを返す", async () => {
    const app = createTestApp();

    app.get("/test/:id", () => {
      throw new HTTPException(404, { message: "Visitor not found" });
    });

    const res = await app.request("/test/abc123", { method: "GET" });

    expect(res.status).toBe(404);
    expect(res.headers.get("Content-Type")).toBe("application/problem+json");

    const json = (await res.json()) as ProblemDetails;
    expect(json.type).toContain("not-found");
    expect(json.title).toBe("Visitor not found");
    expect(json.status).toBe(404);
    expect(json.instance).toBe("/test/abc123");
  });

  it("HTTPException（401）時も適切にProblemDetailsを返す", async () => {
    const app = createTestApp();

    app.get("/test", () => {
      throw new HTTPException(401, { message: "Unauthorized" });
    });

    const res = await app.request("/test", { method: "GET" });

    expect(res.status).toBe(401);
    const json = (await res.json()) as ProblemDetails;
    expect(json.status).toBe(401);
    expect(json.title).toBe("Unauthorized");
  });

  it("HTTPExceptionのメッセージが未定義の場合デフォルトメッセージを使用する", async () => {
    const app = createTestApp();

    app.get("/test", () => {
      throw new HTTPException(404);
    });

    const res = await app.request("/test", { method: "GET" });

    const json = (await res.json()) as ProblemDetails;
    expect(json.title).toBe("Not Found");
  });
});

describe("エラーハンドリングミドルウェア - 予期しないエラー", () => {
  it("予期しないエラー時に500とProblemDetailsを返す", async () => {
    const mockLogger = createMockLogger();
    const app = createTestApp(mockLogger);

    app.get("/test", () => {
      throw new Error("Unexpected database error");
    });

    const res = await app.request("/test", { method: "GET" });

    expect(res.status).toBe(500);
    expect(res.headers.get("Content-Type")).toBe("application/problem+json");

    const json = (await res.json()) as ProblemDetails;
    expect(json.type).toContain("internal-error");
    expect(json.title).toBe("Internal Server Error");
    expect(json.status).toBe(500);
    expect(json.instance).toBe("/test");
  });

  it("スタックトレースがレスポンスに含まれない", async () => {
    const mockLogger = createMockLogger();
    const app = createTestApp(mockLogger);

    app.get("/test", () => {
      const error = new Error("Test error");
      error.stack = "Error: Test error\n    at Object.<anonymous> (/path/to/file.ts:10:15)";
      throw error;
    });

    const res = await app.request("/test", { method: "GET" });
    const json = (await res.json()) as ProblemDetails;

    expect(json).not.toHaveProperty("stack");
    expect(json).not.toHaveProperty("trace");
    expect(JSON.stringify(json)).not.toContain("at ");
    expect(JSON.stringify(json)).not.toContain("Test error");
  });

  it("エラー詳細がログに記録される", async () => {
    const mockLogger = createMockLogger();
    const app = createTestApp(mockLogger);

    app.get("/test", () => {
      throw new Error("Critical error");
    });

    await app.request("/test", { method: "GET" });

    /* eslint-disable @typescript-eslint/no-unsafe-assignment */
    const expectedArg = expect.objectContaining({
      err: expect.any(Error),
      path: "/test",
    });
    /* eslint-enable @typescript-eslint/no-unsafe-assignment */
    expect(mockLogger.error).toHaveBeenCalledWith(expectedArg, "Unexpected error");
  });

  it("エラーオブジェクトに追加プロパティがあっても漏洩しない", async () => {
    const mockLogger = createMockLogger();
    const app = createTestApp(mockLogger);

    app.get("/test", () => {
      const error = Object.assign(new Error("Test"), { secret: "sensitive-data" });
      throw error;
    });

    const res = await app.request("/test", { method: "GET" });
    const json = (await res.json()) as ProblemDetails;

    expect(JSON.stringify(json)).not.toContain("sensitive-data");
    expect(json).not.toHaveProperty("secret");
  });
});

describe("エラーハンドリングミドルウェア - Content-Type", () => {
  it("すべてのエラーレスポンスでContent-Typeがapplication/problem+jsonである", async () => {
    const testCases = [
      {
        name: "ZodError",
        setup: (app: Hono) => {
          app.post(
            "/zod",
            zValidator("json", z.object({ name: z.string() }), throwOnValidationError),
            (c) => c.json({ ok: true })
          );
        },
        request: () =>
          new Request("http://localhost/zod", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ name: 123 }),
          }),
      },
      {
        name: "HTTPException",
        setup: (app: Hono) => {
          app.get("/http", () => {
            throw new HTTPException(404);
          });
        },
        request: () => new Request("http://localhost/http", { method: "GET" }),
      },
      {
        name: "Unknown Error",
        setup: (app: Hono) => {
          app.get("/unknown", () => {
            throw new Error("Unknown");
          });
        },
        request: () => new Request("http://localhost/unknown", { method: "GET" }),
      },
    ];

    for (const { setup, request } of testCases) {
      const app = createTestApp();
      setup(app);
      const res = await app.request(request());

      expect(res.headers.get("Content-Type")).toBe("application/problem+json");
    }
  });
});
