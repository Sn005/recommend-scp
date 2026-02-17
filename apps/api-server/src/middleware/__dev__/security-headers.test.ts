import { describe, it, expect, vi } from "vitest";
import { Hono } from "hono";
import { securityHeaders } from "../security-headers";

// CORSテスト用のモック
vi.mock("@recommend-scp/shared/lib/env", () => ({
  env: {
    get ALLOWED_ORIGINS() {
      return "http://localhost:3000";
    },
  },
}));

describe("セキュリティヘッダーミドルウェア", () => {
  const createApp = () => {
    const app = new Hono();
    app.use(securityHeaders);
    app.get("/test", (c) => c.json({ ok: true }));
    app.post("/test", (c) => c.json({ ok: true }));
    return app;
  };

  describe("AC-2: セキュリティヘッダーの設定", () => {
    it("X-Content-Type-Optionsヘッダーがnosniffに設定される", async () => {
      const app = createApp();
      const res = await app.request("/test");
      expect(res.headers.get("X-Content-Type-Options")).toBe("nosniff");
    });

    it("X-Frame-OptionsヘッダーがDENYに設定される", async () => {
      const app = createApp();
      const res = await app.request("/test");
      expect(res.headers.get("X-Frame-Options")).toBe("DENY");
    });

    it("X-XSS-Protectionヘッダーが0に設定される", async () => {
      const app = createApp();
      const res = await app.request("/test");
      expect(res.headers.get("X-XSS-Protection")).toBe("0");
    });

    it("Referrer-Policyヘッダーがstrict-origin-when-cross-originに設定される", async () => {
      const app = createApp();
      const res = await app.request("/test");
      expect(res.headers.get("Referrer-Policy")).toBe("strict-origin-when-cross-origin");
    });

    it("Permissions-Policyヘッダーが設定される", async () => {
      const app = createApp();
      const res = await app.request("/test");
      expect(res.headers.get("Permissions-Policy")).toBe(
        "camera=(), microphone=(), geolocation=()"
      );
    });

    it("すべてのセキュリティヘッダーが一度のレスポンスで付与される", async () => {
      const app = createApp();
      const res = await app.request("/test");

      expect(res.headers.get("X-Content-Type-Options")).toBe("nosniff");
      expect(res.headers.get("X-Frame-Options")).toBe("DENY");
      expect(res.headers.get("X-XSS-Protection")).toBe("0");
      expect(res.headers.get("Referrer-Policy")).toBe("strict-origin-when-cross-origin");
      expect(res.headers.get("Permissions-Policy")).toBe(
        "camera=(), microphone=(), geolocation=()"
      );
    });
  });

  describe("AC-4: 既存ヘッダーとの共存", () => {
    it("既存のContent-Typeヘッダーに影響しない", async () => {
      const app = createApp();
      const res = await app.request("/test");

      expect(res.headers.get("Content-Type")).toContain("application/json");
      expect(res.headers.get("X-Content-Type-Options")).toBe("nosniff");
    });

    it("CORSヘッダーと共存する", async () => {
      const { corsMiddleware } = await import("../cors");
      const app = new Hono();
      app.use(corsMiddleware);
      app.use(securityHeaders);
      app.get("/test", (c) => c.json({ ok: true }));

      const res = await app.request("/test", {
        headers: { Origin: "http://localhost:3000" },
      });

      expect(res.headers.get("Access-Control-Allow-Origin")).toBe("http://localhost:3000");
      expect(res.headers.get("X-Frame-Options")).toBe("DENY");
    });

    it("アプリケーション固有のカスタムヘッダーに影響しない", async () => {
      const app = new Hono();
      app.use(securityHeaders);
      app.get("/test", (c) => {
        c.header("X-Custom-Header", "custom-value");
        return c.json({ ok: true });
      });

      const res = await app.request("/test");

      expect(res.headers.get("X-Custom-Header")).toBe("custom-value");
      expect(res.headers.get("X-Frame-Options")).toBe("DENY");
    });
  });

  describe("エッジケース: HTTPメソッド", () => {
    it("POSTリクエストでもセキュリティヘッダーが付与される", async () => {
      const app = createApp();
      const res = await app.request("/test", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ data: "test" }),
      });

      expect(res.headers.get("X-Content-Type-Options")).toBe("nosniff");
      expect(res.headers.get("X-Frame-Options")).toBe("DENY");
    });
  });

  describe("エッジケース: エラーレスポンス", () => {
    it("404レスポンスでもセキュリティヘッダーが付与される", async () => {
      const app = new Hono();
      app.use(securityHeaders);
      // ルートを定義しないのでHonoのデフォルト404が返る

      const res = await app.request("/nonexistent");

      expect(res.status).toBe(404);
      expect(res.headers.get("X-Frame-Options")).toBe("DENY");
    });
  });
});
