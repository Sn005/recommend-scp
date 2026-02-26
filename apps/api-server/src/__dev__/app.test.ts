import { describe, it, expect, vi, beforeEach, type Mock } from "vitest";

// Supabaseクライアントをモック
vi.mock("@recommend-scp/shared/lib/supabase", () => ({
  getSupabaseAdmin: vi.fn(),
}));

import { getSupabaseAdmin } from "@recommend-scp/shared/lib/supabase";
import { createApp, createRoutes } from "../app";
import type { AppType } from "../app";

describe("Honoアプリケーション", () => {
  let app: ReturnType<typeof createApp>;

  beforeEach(() => {
    vi.clearAllMocks();
    // 正常なDB接続をモック
    const mockClient = {
      from: vi.fn().mockReturnValue({
        select: vi.fn().mockReturnValue({
          limit: vi.fn().mockResolvedValue({
            data: [{ id: 1 }],
            error: null,
          }),
        }),
      }),
    };
    (getSupabaseAdmin as Mock).mockReturnValue(mockClient);

    // テスト用にアプリケーションを作成
    app = createApp(getSupabaseAdmin());
  });

  it("Hono インスタンスが export される", () => {
    expect(app).toBeDefined();
    expect(app.fetch).toBeInstanceOf(Function);
  });

  it("AppType 型が export される", () => {
    const routes = createRoutes(getSupabaseAdmin());
    const _typeCheck: AppType = routes;
    expect(_typeCheck).toBeDefined();
  });

  it("基本的なHTTPリクエストに応答できる", async () => {
    const req = new Request("http://localhost/health");
    const res = await app.fetch(req);

    expect(res.status).toBe(200);
  });

  it("GET /health はJSONレスポンスを返す", async () => {
    const req = new Request("http://localhost/health");
    const res = await app.fetch(req);
    const body = (await res.json()) as Record<string, unknown>;

    expect(body).toHaveProperty("status", "ok");
  });

  it("存在しないパスは404を返す", async () => {
    const req = new Request("http://localhost/not-found");
    const res = await app.fetch(req);

    expect(res.status).toBe(404);
  });
});
