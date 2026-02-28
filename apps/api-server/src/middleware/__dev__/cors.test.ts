import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { Hono } from "hono";
import type { MiddlewareHandler } from "hono";

// 環境変数のモック用変数
let mockAllowedOrigins: string | undefined;

// envモジュールをモック
vi.mock("@recommend-scp/shared/lib/env", () => ({
  env: {
    get ALLOWED_ORIGINS() {
      return mockAllowedOrigins;
    },
  },
}));

describe("CORSミドルウェア", () => {
  let app: Hono;
  let corsMiddleware: MiddlewareHandler;

  beforeEach(async () => {
    // デフォルトの環境変数設定
    mockAllowedOrigins = "https://scpicks.app,http://localhost:3000";

    // モジュールキャッシュをクリアして再インポート
    vi.resetModules();
    const corsModule = await import("../cors");
    corsMiddleware = corsModule.corsMiddleware;

    // テスト用Honoアプリをセットアップ
    app = new Hono();
    app.use(corsMiddleware);
    app.get("/test", (c) => c.json({ ok: true }));
    app.post("/test", (c) => c.json({ ok: true }));
    app.put("/test", (c) => c.json({ ok: true }));
    app.delete("/test", (c) => c.json({ ok: true }));
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe("AC1: 許可されたオリジンからリクエストがあった際", () => {
    it("Access-Control-Allow-Origin ヘッダーを設定する", async () => {
      const res = await app.request("/test", {
        headers: { Origin: "https://scpicks.app" },
      });

      expect(res.headers.get("Access-Control-Allow-Origin")).toBe("https://scpicks.app");
    });

    it("複数の許可オリジンのうち、リクエストのオリジンと一致するものを返す", async () => {
      const res = await app.request("/test", {
        headers: { Origin: "http://localhost:3000" },
      });

      expect(res.headers.get("Access-Control-Allow-Origin")).toBe("http://localhost:3000");
    });

    it("許可されていないオリジンからのリクエストはCORSヘッダーを設定しない", async () => {
      const res = await app.request("/test", {
        headers: { Origin: "https://evil.com" },
      });

      expect(res.headers.get("Access-Control-Allow-Origin")).toBeNull();
    });
  });

  describe("AC2: プリフライトリクエスト（OPTIONS）があった際", () => {
    it("204 No Content を返す", async () => {
      const res = await app.request("/test", {
        method: "OPTIONS",
        headers: {
          Origin: "https://scpicks.app",
          "Access-Control-Request-Method": "POST",
        },
      });

      expect(res.status).toBe(204);
    });

    it("必要なCORSヘッダーを設定する", async () => {
      const res = await app.request("/test", {
        method: "OPTIONS",
        headers: {
          Origin: "https://scpicks.app",
          "Access-Control-Request-Method": "POST",
          "Access-Control-Request-Headers": "Content-Type,X-Visitor-Id",
        },
      });

      expect(res.headers.get("Access-Control-Allow-Origin")).toBe("https://scpicks.app");
      expect(res.headers.get("Access-Control-Allow-Methods")).toContain("POST");
      expect(res.headers.get("Access-Control-Max-Age")).toBe("86400");
    });

    it("Access-Control-Allow-Credentials ヘッダーが true を返す", async () => {
      const res = await app.request("/test", {
        method: "OPTIONS",
        headers: {
          Origin: "https://scpicks.app",
        },
      });

      expect(res.headers.get("Access-Control-Allow-Credentials")).toBe("true");
    });
  });

  describe("AC3: CORS設定で許可するメソッド・ヘッダー・Credentials", () => {
    it("GET, POST, PUT, DELETE, OPTIONS を許可する", async () => {
      const res = await app.request("/test", {
        method: "OPTIONS",
        headers: {
          Origin: "https://scpicks.app",
        },
      });

      const methods = res.headers.get("Access-Control-Allow-Methods");
      expect(methods).toContain("GET");
      expect(methods).toContain("POST");
      expect(methods).toContain("PUT");
      expect(methods).toContain("DELETE");
      expect(methods).toContain("OPTIONS");
    });

    it("Content-Type, X-Visitor-Id, Authorization ヘッダーを許可する", async () => {
      const res = await app.request("/test", {
        method: "OPTIONS",
        headers: {
          Origin: "https://scpicks.app",
          "Access-Control-Request-Headers": "Content-Type,X-Visitor-Id,Authorization",
        },
      });

      const headers = res.headers.get("Access-Control-Allow-Headers");
      expect(headers).toContain("Content-Type");
      expect(headers).toContain("X-Visitor-Id");
      expect(headers).toContain("Authorization");
    });

    it("Credentials: true を許可する", async () => {
      const res = await app.request("/test", {
        headers: { Origin: "https://scpicks.app" },
      });

      expect(res.headers.get("Access-Control-Allow-Credentials")).toBe("true");
    });
  });

  describe("AC4: 環境変数 ALLOWED_ORIGINS が設定されている際", () => {
    it("指定されたオリジンのみを許可する", async () => {
      // 許可オリジン
      const res1 = await app.request("/test", {
        headers: { Origin: "https://scpicks.app" },
      });
      expect(res1.headers.get("Access-Control-Allow-Origin")).toBe("https://scpicks.app");

      // 非許可オリジン
      const res2 = await app.request("/test", {
        headers: { Origin: "https://evil.com" },
      });
      expect(res2.headers.get("Access-Control-Allow-Origin")).toBeNull();
    });

    it("カンマ区切りの複数オリジンを正しくパースする", async () => {
      const origins = ["https://scpicks.app", "http://localhost:3000"];

      for (const origin of origins) {
        const res = await app.request("/test", {
          headers: { Origin: origin },
        });
        expect(res.headers.get("Access-Control-Allow-Origin")).toBe(origin);
      }
    });

    it("スペースを含むカンマ区切りオリジンを正しくtrimする", async () => {
      mockAllowedOrigins = "https://app1.com, https://app2.com , http://app3.com";
      vi.resetModules();
      const corsModule = await import("../cors");

      const testApp = new Hono();
      testApp.use(corsModule.corsMiddleware);
      testApp.get("/test", (c) => c.json({ ok: true }));

      const res = await testApp.request("/test", {
        headers: { Origin: "https://app2.com" },
      });
      expect(res.headers.get("Access-Control-Allow-Origin")).toBe("https://app2.com");
    });
  });

  describe("AC5: 開発環境で ALLOWED_ORIGINS が未設定の際", () => {
    it("localhost:3000 を許可する", async () => {
      mockAllowedOrigins = undefined;
      vi.resetModules();
      const corsModule = await import("../cors");

      const testApp = new Hono();
      testApp.use(corsModule.corsMiddleware);
      testApp.get("/test", (c) => c.json({ ok: true }));

      const res = await testApp.request("/test", {
        headers: { Origin: "http://localhost:3000" },
      });

      expect(res.headers.get("Access-Control-Allow-Origin")).toBe("http://localhost:3000");
    });

    it("localhost:3000 以外のオリジンは拒否される", async () => {
      mockAllowedOrigins = undefined;
      vi.resetModules();
      const corsModule = await import("../cors");

      const testApp = new Hono();
      testApp.use(corsModule.corsMiddleware);
      testApp.get("/test", (c) => c.json({ ok: true }));

      const res = await testApp.request("/test", {
        headers: { Origin: "http://localhost:4000" },
      });

      expect(res.headers.get("Access-Control-Allow-Origin")).toBeNull();
    });
  });

  describe("エッジケース: X-Visitor-Idヘッダー", () => {
    it("X-Visitor-Idヘッダーが許可される", async () => {
      const res = await app.request("/test", {
        method: "OPTIONS",
        headers: {
          Origin: "https://scpicks.app",
          "Access-Control-Request-Headers": "X-Visitor-Id",
        },
      });

      expect(res.headers.get("Access-Control-Allow-Headers")).toContain("X-Visitor-Id");
    });
  });

  describe("エッジケース: 異なるポート番号", () => {
    it("localhost:3001 は許可されない（3000のみ許可）", async () => {
      mockAllowedOrigins = undefined;
      vi.resetModules();
      const corsModule = await import("../cors");

      const testApp = new Hono();
      testApp.use(corsModule.corsMiddleware);
      testApp.get("/test", (c) => c.json({ ok: true }));

      const res = await testApp.request("/test", {
        headers: { Origin: "http://localhost:3001" },
      });

      expect(res.headers.get("Access-Control-Allow-Origin")).toBeNull();
    });
  });

  describe("統合テスト: 実リクエスト", () => {
    it("プリフライト後の実POSTリクエストでもCORSヘッダーが適用される", async () => {
      const res = await app.request("/test", {
        method: "POST",
        headers: {
          Origin: "https://scpicks.app",
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ data: "test" }),
      });

      expect(res.status).toBe(200);
      expect(res.headers.get("Access-Control-Allow-Origin")).toBe("https://scpicks.app");
      expect(res.headers.get("Access-Control-Allow-Credentials")).toBe("true");
    });
  });

  describe("セキュリティ: ワイルドカード禁止", () => {
    it("credentials: true の場合、ワイルドカードオリジンを使用しない", async () => {
      const res = await app.request("/test", {
        headers: { Origin: "https://scpicks.app" },
      });

      // credentials: true なので、"*" ではなく具体的なオリジンを返す
      expect(res.headers.get("Access-Control-Allow-Origin")).not.toBe("*");
      expect(res.headers.get("Access-Control-Allow-Origin")).toBe("https://scpicks.app");
    });
  });
});
