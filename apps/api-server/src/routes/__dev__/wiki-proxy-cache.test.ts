/**
 * @file wiki-proxy キャッシュ テスト
 * @description wiki-proxy HTMLレスポンスのRedisキャッシュ動作テスト
 * @see specs/016-article-speed/016-01-redis-cache/016-01-02.md
 */

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { Hono } from "hono";

// cacheヘルパーをモック
const mockCacheGet = vi.fn();
const mockCacheSet = vi.fn();
vi.mock("../../lib/cache", () => ({
  // eslint-disable-next-line @typescript-eslint/no-unsafe-return
  cacheGet: (...args: unknown[]) => mockCacheGet(...args),
  // eslint-disable-next-line @typescript-eslint/no-unsafe-return
  cacheSet: (...args: unknown[]) => mockCacheSet(...args),
}));

import { wikiProxyRoutes } from "../wiki-proxy";

function createWikidotHtml(options?: { pageTitle?: string; pageContent?: string }): string {
  const { pageTitle = "Test Page", pageContent = "<p>Content</p>" } = options ?? {};
  return [
    "<html><head></head><body>",
    '<div id="container">',
    '<div id="main-content">',
    `<div id="page-title">${pageTitle}</div>`,
    `<div id="page-content">${pageContent}</div>`,
    "</div>",
    "</div>",
    "</body></html>",
  ].join("");
}

function createHtmlResponse(body: string): Response {
  return new Response(body, {
    status: 200,
    headers: { "content-type": "text/html; charset=utf-8" },
  });
}

function createCssResponse(body: string): Response {
  return new Response(body, {
    status: 200,
    headers: { "content-type": "text/css; charset=utf-8" },
  });
}

function createApp() {
  return new Hono().route("/wiki-proxy", wikiProxyRoutes);
}

describe("wiki-proxy キャッシュ", () => {
  const originalFetch = global.fetch;

  beforeEach(() => {
    vi.resetAllMocks();
    mockCacheGet.mockResolvedValue(null);
    mockCacheSet.mockResolvedValue(undefined);
  });

  afterEach(() => {
    global.fetch = originalFetch;
  });

  it("キャッシュヒット時は外部fetchを呼ばずキャッシュからHTMLを返す", async () => {
    const cachedHtml =
      "<!DOCTYPE html><html><head></head><body><p>cached content</p></body></html>";
    mockCacheGet.mockResolvedValue(cachedHtml);

    global.fetch = vi.fn();

    const app = createApp();
    const res = await app.request("/wiki-proxy/scp-173");
    const text = await res.text();

    expect(res.status).toBe(200);
    expect(text).toBe(cachedHtml);
    expect(global.fetch).not.toHaveBeenCalled();
    expect(mockCacheGet).toHaveBeenCalledWith("wiki:html:scp-173");
  });

  it("キャッシュミス時は外部fetchしてキャッシュに保存する", async () => {
    const html = createWikidotHtml({ pageTitle: "SCP-173", pageContent: "<p>彫刻</p>" });
    global.fetch = vi.fn().mockResolvedValue(createHtmlResponse(html));

    const app = createApp();
    const res = await app.request("/wiki-proxy/scp-173");

    expect(res.status).toBe(200);
    expect(global.fetch).toHaveBeenCalledWith("http://scp-jp.wikidot.com/scp-173");
    expect(mockCacheSet).toHaveBeenCalledWith("wiki:html:scp-173", expect.any(String), 3600);
  });

  it("非HTMLリソースはキャッシュ保存されない", async () => {
    global.fetch = vi.fn().mockResolvedValue(createCssResponse("body { color: red; }"));

    const app = createApp();
    const res = await app.request("/wiki-proxy/local--files/style.css");

    expect(res.status).toBe(200);
    // cacheGetは呼ばれる（キャッシュチェックはfetch前）がミスする
    // 非HTMLレスポンスの場合、cacheSetは呼ばれない
    expect(mockCacheSet).not.toHaveBeenCalled();
  });

  it("Redis未設定時は既存動作と同一の振る舞いをする", async () => {
    // cacheGet returns null (Redis disabled)
    mockCacheGet.mockResolvedValue(null);

    const html = createWikidotHtml({ pageTitle: "SCP-682" });
    global.fetch = vi.fn().mockResolvedValue(createHtmlResponse(html));

    const app = createApp();
    const res = await app.request("/wiki-proxy/scp-682");
    const text = await res.text();

    expect(res.status).toBe(200);
    expect(text).toContain("SCP-682");
    expect(global.fetch).toHaveBeenCalled();
  });

  it("キャッシュヒット時もCache-Controlヘッダーが維持される", async () => {
    mockCacheGet.mockResolvedValue("<html><body>cached</body></html>");

    const app = createApp();
    const res = await app.request("/wiki-proxy/scp-173");

    expect(res.headers.get("cache-control")).toBe("public, max-age=300, s-maxage=600");
  });

  it("キャッシュキーはarticleIdの小文字正規化を使用する", async () => {
    mockCacheGet.mockResolvedValue("<html><body>cached</body></html>");

    const app = createApp();
    await app.request("/wiki-proxy/SCP-173");

    expect(mockCacheGet).toHaveBeenCalledWith("wiki:html:scp-173");
  });
});
