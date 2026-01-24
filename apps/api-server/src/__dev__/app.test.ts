import { describe, it, expect } from "vitest";
import { app } from "../app";
import type { AppType } from "../app";

describe("Honoアプリケーション", () => {
  it("Hono インスタンスが export される", () => {
    expect(app).toBeDefined();
    expect(app.fetch).toBeInstanceOf(Function);
  });

  it("AppType 型が export される", () => {
    const _typeCheck: AppType = app;
    expect(_typeCheck).toBe(app);
  });

  it("基本的なHTTPリクエストに応答できる", async () => {
    const req = new Request("http://localhost/health");
    const res = await app.fetch(req);

    expect(res.status).toBe(200);
  });

  it("GET /health はJSONレスポンスを返す", async () => {
    const req = new Request("http://localhost/health");
    const res = await app.fetch(req);
    const body = await res.json();

    expect(body).toHaveProperty("status", "ok");
  });

  it("存在しないパスは404を返す", async () => {
    const req = new Request("http://localhost/not-found");
    const res = await app.fetch(req);

    expect(res.status).toBe(404);
  });
});
