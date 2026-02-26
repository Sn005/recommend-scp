import { describe, it, expect, vi, beforeEach, type Mock } from "vitest";
import { Hono } from "hono";

// Supabaseクライアントをモック
vi.mock("@recommend-scp/shared/lib/supabase", () => ({
  getSupabaseAdmin: vi.fn(),
}));

import { getSupabaseAdmin } from "@recommend-scp/shared/lib/supabase";
import { healthRoutes } from "../health";

// パッケージバージョン
const EXPECTED_VERSION = "0.1.0";

interface HealthResponse {
  status: "ok" | "degraded";
  timestamp: string;
  version: string;
}

const createApp = () => {
  const app = new Hono();
  app.route("/health", healthRoutes);
  return app;
};

const setupMockClient = (success: boolean) => {
  const mockClient = {
    from: vi.fn().mockReturnValue({
      select: vi.fn().mockReturnValue({
        limit: success
          ? vi.fn().mockResolvedValue({
              data: [{ id: 1 }],
              error: null,
            })
          : vi.fn().mockResolvedValue({
              data: null,
              error: { message: "Connection timeout" },
            }),
      }),
    }),
  };
  (getSupabaseAdmin as Mock).mockReturnValue(mockClient);
  return mockClient;
};

describe("GET /health - 正常系", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    setupMockClient(true);
  });

  it("200 OK を返す", async () => {
    const app = createApp();
    const req = new Request("http://localhost/health");

    const res = await app.fetch(req);

    expect(res.status).toBe(200);
  });

  it("JSONレスポンスを返す", async () => {
    const app = createApp();
    const req = new Request("http://localhost/health");

    const res = await app.fetch(req);
    const contentType = res.headers.get("content-type");

    expect(contentType).toContain("application/json");
  });

  it("status: 'ok' を含む", async () => {
    const app = createApp();
    const req = new Request("http://localhost/health");

    const res = await app.fetch(req);
    const body = (await res.json()) as HealthResponse;

    expect(body).toHaveProperty("status", "ok");
  });

  it("timestamp を ISO 8601 形式で返す", async () => {
    const app = createApp();
    const req = new Request("http://localhost/health");

    const res = await app.fetch(req);
    const body = (await res.json()) as HealthResponse;

    expect(body).toHaveProperty("timestamp");
    expect(new Date(body.timestamp).toISOString()).toBe(body.timestamp);
  });

  it("version にパッケージバージョンを含む", async () => {
    const app = createApp();
    const req = new Request("http://localhost/health");

    const res = await app.fetch(req);
    const body = (await res.json()) as HealthResponse;

    expect(body).toHaveProperty("version", EXPECTED_VERSION);
  });
});

describe("GET /health - 異常系（DB接続失敗）", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("DB接続失敗時に503 Service Unavailableを返す", async () => {
    setupMockClient(false);

    const app = createApp();
    const req = new Request("http://localhost/health");

    const res = await app.fetch(req);

    expect(res.status).toBe(503);
  });

  it("DB接続失敗時に status: 'degraded' を返す", async () => {
    setupMockClient(false);

    const app = createApp();
    const req = new Request("http://localhost/health");

    const res = await app.fetch(req);
    const body = (await res.json()) as HealthResponse;

    expect(body).toHaveProperty("status", "degraded");
  });

  it("DB接続失敗時もtimestampとversionを返す", async () => {
    setupMockClient(false);

    const app = createApp();
    const req = new Request("http://localhost/health");

    const res = await app.fetch(req);
    const body = (await res.json()) as HealthResponse;

    expect(body).toHaveProperty("timestamp");
    expect(body).toHaveProperty("version");
  });

  it("DB接続で例外が発生した場合も503を返す", async () => {
    const mockClient = {
      from: vi.fn().mockReturnValue({
        select: vi.fn().mockReturnValue({
          limit: vi.fn().mockRejectedValue(new Error("Network error")),
        }),
      }),
    };
    (getSupabaseAdmin as Mock).mockReturnValue(mockClient);

    const app = createApp();
    const req = new Request("http://localhost/health");

    const res = await app.fetch(req);

    expect(res.status).toBe(503);
  });
});

describe("GET /health - セキュリティ", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    setupMockClient(true);
  });

  it("認証ヘッダーなしでアクセスできる", async () => {
    const app = createApp();
    const req = new Request("http://localhost/health", {
      headers: {
        // Authorization ヘッダーなし
      },
    });

    const res = await app.fetch(req);

    expect(res.status).toBe(200);
    expect(res.status).not.toBe(401);
  });
});

describe("GET /health - パフォーマンス", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    setupMockClient(true);
  });

  it("100ms以内にレスポンスを返す（正常時）", async () => {
    const app = createApp();
    const req = new Request("http://localhost/health");
    const start = performance.now();

    const res = await app.fetch(req);
    const elapsed = performance.now() - start;

    expect(res.status).toBe(200);
    expect(elapsed).toBeLessThan(100);
  });
});

describe("GET /health - エッジケース", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    setupMockClient(true);
  });

  it("timestampが現在時刻から1秒以内である", async () => {
    const app = createApp();
    const req = new Request("http://localhost/health");
    const beforeRequest = new Date();

    const res = await app.fetch(req);
    const body = (await res.json()) as HealthResponse;
    const afterRequest = new Date();

    const responseTime = new Date(body.timestamp);

    expect(responseTime.getTime()).toBeGreaterThanOrEqual(beforeRequest.getTime());
    expect(responseTime.getTime()).toBeLessThanOrEqual(afterRequest.getTime() + 1000);
  });

  it("同時リクエストでも正しく応答する", async () => {
    const app = createApp();
    const fetchPromises = Array.from({ length: 10 }, async () => {
      const res = await app.fetch(new Request("http://localhost/health"));
      return res;
    });

    const responses = await Promise.all(fetchPromises);

    for (const res of responses) {
      expect(res.status).toBe(200);
    }
  });
});
