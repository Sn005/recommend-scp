/* eslint-disable @typescript-eslint/no-unsafe-assignment */
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { Hono } from "hono";

// loggerモジュールのモック
const mockLogger = {
  info: vi.fn(),
  error: vi.fn(),
  warn: vi.fn(),
  debug: vi.fn(),
  child: vi.fn(() => mockLogger),
};

vi.mock("../../lib/logger", () => ({
  logger: mockLogger,
  createChildLogger: vi.fn(() => mockLogger),
}));

describe("requestLogger ミドルウェア", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe("正常系", () => {
    it("リクエストメソッドをログに記録する", async () => {
      const { requestLogger } = await import("../../middleware/request-logger");
      const app = new Hono();
      app.use(requestLogger);
      app.get("/test", (c) => c.json({ ok: true }));

      await app.request("/test");

      expect(mockLogger.info).toHaveBeenCalledWith(
        expect.objectContaining({ method: "GET" }),
        expect.any(String)
      );
    });

    it("リクエストパスをログに記録する", async () => {
      const { requestLogger } = await import("../../middleware/request-logger");
      const app = new Hono();
      app.use(requestLogger);
      app.get("/api/v1/visitors", (c) => c.json({ ok: true }));

      await app.request("/api/v1/visitors");

      expect(mockLogger.info).toHaveBeenCalledWith(
        expect.objectContaining({ path: "/api/v1/visitors" }),
        expect.any(String)
      );
    });

    it("レスポンスステータスをログに記録する", async () => {
      const { requestLogger } = await import("../../middleware/request-logger");
      const app = new Hono();
      app.use(requestLogger);
      app.get("/test", (c) => c.json({ ok: true }, 201));

      await app.request("/test");

      expect(mockLogger.info).toHaveBeenCalledWith(
        expect.objectContaining({ status: 201 }),
        expect.any(String)
      );
    });

    it("レスポンス時間（ms）をログに記録する", async () => {
      const { requestLogger } = await import("../../middleware/request-logger");
      const app = new Hono();
      app.use(requestLogger);
      app.get("/test", async (c) => {
        await new Promise((resolve) => setTimeout(resolve, 10));
        return c.json({ ok: true });
      });

      await app.request("/test");

      expect(mockLogger.info).toHaveBeenCalledWith(
        expect.objectContaining({
          duration: expect.any(Number),
        }),
        expect.any(String)
      );
      const duration = (mockLogger.info.mock.calls[0][0] as { duration: number }).duration;
      expect(duration).toBeGreaterThanOrEqual(10);
    });

    it("visitorIdヘッダーがある場合、ログに含まれる", async () => {
      const { requestLogger } = await import("../../middleware/request-logger");
      const app = new Hono();
      app.use(requestLogger);
      app.get("/test", (c) => c.json({ ok: true }));

      await app.request("/test", {
        headers: { "X-Visitor-Id": "test-visitor-123" },
      });

      expect(mockLogger.info).toHaveBeenCalledWith(
        expect.objectContaining({ visitorId: "test-visitor-123" }),
        expect.any(String)
      );
    });

    it("全ての情報を含む統合ログを記録する", async () => {
      const { requestLogger } = await import("../../middleware/request-logger");
      const app = new Hono();
      app.use(requestLogger);
      app.post("/api/feedback", (c) => c.json({ ok: true }, 200));

      await app.request("/api/feedback", {
        method: "POST",
        headers: { "X-Visitor-Id": "visitor-uuid" },
      });

      expect(mockLogger.info).toHaveBeenCalledWith(
        {
          method: "POST",
          path: "/api/feedback",
          status: 200,
          duration: expect.any(Number),
          visitorId: "visitor-uuid",
        },
        expect.stringMatching(/POST \/api\/feedback 200 \d+ms/)
      );
    });
  });

  describe("異常系", () => {
    it("visitorIdヘッダーがない場合、undefinedを記録する", async () => {
      const { requestLogger } = await import("../../middleware/request-logger");
      const app = new Hono();
      app.use(requestLogger);
      app.get("/test", (c) => c.json({ ok: true }));

      await app.request("/test");

      expect(mockLogger.info).toHaveBeenCalledWith(
        expect.objectContaining({ visitorId: undefined }),
        expect.any(String)
      );
    });

    it("404エラー時もステータスを記録する", async () => {
      const { requestLogger } = await import("../../middleware/request-logger");
      const app = new Hono();
      app.use(requestLogger);
      // ルート定義なし

      await app.request("/not-found");

      expect(mockLogger.info).toHaveBeenCalledWith(
        expect.objectContaining({ status: 404 }),
        expect.any(String)
      );
    });

    it("500エラー時もステータスを記録する", async () => {
      const { requestLogger } = await import("../../middleware/request-logger");
      const app = new Hono();
      app.use(requestLogger);
      app.get("/error", () => {
        throw new Error("Internal Error");
      });
      app.onError((_, c) => c.json({ error: "Internal Server Error" }, 500));

      await app.request("/error");

      expect(mockLogger.info).toHaveBeenCalledWith(
        expect.objectContaining({ status: 500 }),
        expect.any(String)
      );
    });
  });

  describe("エッジケース", () => {
    it("特殊文字を含むパスをエスケープせずに記録する", async () => {
      const { requestLogger } = await import("../../middleware/request-logger");
      const app = new Hono();
      app.use(requestLogger);
      app.get("/api/search", (c) => c.json({ ok: true }));

      await app.request("/api/search?q=%E7%89%B9%E6%AE%8A%E6%96%87%E5%AD%97");

      expect(mockLogger.info).toHaveBeenCalledWith(
        expect.objectContaining({
          path: expect.stringContaining("/api/search"),
        }),
        expect.any(String)
      );
    });

    it("ルートパス `/` を正しく記録する", async () => {
      const { requestLogger } = await import("../../middleware/request-logger");
      const app = new Hono();
      app.use(requestLogger);
      app.get("/", (c) => c.json({ ok: true }));

      await app.request("/");

      expect(mockLogger.info).toHaveBeenCalledWith(
        expect.objectContaining({ path: "/" }),
        expect.any(String)
      );
    });

    it("visitorIdが空文字列の場合、空文字列を記録する", async () => {
      const { requestLogger } = await import("../../middleware/request-logger");
      const app = new Hono();
      app.use(requestLogger);
      app.get("/test", (c) => c.json({ ok: true }));

      await app.request("/test", {
        headers: { "X-Visitor-Id": "" },
      });

      expect(mockLogger.info).toHaveBeenCalledWith(
        expect.objectContaining({ visitorId: "" }),
        expect.any(String)
      );
    });

    it("visitorIdが不正な形式でも記録する", async () => {
      const { requestLogger } = await import("../../middleware/request-logger");
      const app = new Hono();
      app.use(requestLogger);
      app.get("/test", (c) => c.json({ ok: true }));

      await app.request("/test", {
        headers: { "X-Visitor-Id": "not-a-uuid-123" },
      });

      expect(mockLogger.info).toHaveBeenCalledWith(
        expect.objectContaining({ visitorId: "not-a-uuid-123" }),
        expect.any(String)
      );
    });

    it("レスポンス時間が0msに近い場合も記録する", async () => {
      const { requestLogger } = await import("../../middleware/request-logger");
      const app = new Hono();
      app.use(requestLogger);
      app.get("/test", (c) => c.json({ ok: true }));

      await app.request("/test");

      const duration = (mockLogger.info.mock.calls[0][0] as { duration: number }).duration;
      expect(duration).toBeGreaterThanOrEqual(0);
    });

    it("同時リクエストでもそれぞれ正しくログを記録する", async () => {
      const { requestLogger } = await import("../../middleware/request-logger");
      const app = new Hono();
      app.use(requestLogger);
      app.get("/test1", (c) => c.json({ id: 1 }));
      app.get("/test2", (c) => c.json({ id: 2 }));

      await Promise.all([
        app.request("/test1", { headers: { "X-Visitor-Id": "visitor1" } }),
        app.request("/test2", { headers: { "X-Visitor-Id": "visitor2" } }),
      ]);

      expect(mockLogger.info).toHaveBeenCalledTimes(2);
      expect(mockLogger.info).toHaveBeenCalledWith(
        expect.objectContaining({ path: "/test1", visitorId: "visitor1" }),
        expect.any(String)
      );
      expect(mockLogger.info).toHaveBeenCalledWith(
        expect.objectContaining({ path: "/test2", visitorId: "visitor2" }),
        expect.any(String)
      );
    });
  });
});
