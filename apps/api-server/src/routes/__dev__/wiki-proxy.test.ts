/**
 * @file Wikiプロキシ テスト
 * @description SCP WikiプロキシのHTML書き換えロジックのテスト
 */

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { Hono } from "hono";
import { wikiProxyRoutes } from "../wiki-proxy";

describe("GET /wiki-proxy/*", () => {
  const originalFetch = global.fetch;

  beforeEach(() => {
    vi.resetAllMocks();
  });

  afterEach(() => {
    global.fetch = originalFetch;
  });

  function createHtmlResponse(body: string): Response {
    return new Response(body, {
      status: 200,
      headers: { "content-type": "text/html; charset=utf-8" },
    });
  }

  function createApp() {
    return new Hono().route("/wiki-proxy", wikiProxyRoutes);
  }

  describe("絶対パスリンクの書き換え", () => {
    it("ドメインなし絶対パスリンクが /wiki/ プレフィックス付きに書き換えられる", async () => {
      // Arrange
      const html = `<html><head></head><body><a href="/scp-456">SCP-456</a></body></html>`;
      global.fetch = vi.fn().mockResolvedValue(createHtmlResponse(html));

      const app = createApp();

      // Act
      const res = await app.request("/wiki-proxy/scp-173");
      const text = await res.text();

      // Assert
      expect(text).toContain('href="/wiki/scp-456"');
      expect(text).not.toContain('href="/scp-456"');
    });

    it("tale等のSCP記事以外のパスも書き換えられる", async () => {
      // Arrange
      const html = `<html><head></head><body><a href="/hoge-fuga">ほげふが</a></body></html>`;
      global.fetch = vi.fn().mockResolvedValue(createHtmlResponse(html));

      const app = createApp();

      // Act
      const res = await app.request("/wiki-proxy/scp-173");
      const text = await res.text();

      // Assert
      expect(text).toContain('href="/wiki/hoge-fuga"');
    });

    it("複数の絶対パスリンクが全て書き換えられる", async () => {
      // Arrange
      const html = `<html><head></head><body>
        <a href="/scp-173">SCP-173</a>
        <a href="/scp-682">SCP-682</a>
        <a href="/taboo">Taboo</a>
      </body></html>`;
      global.fetch = vi.fn().mockResolvedValue(createHtmlResponse(html));

      const app = createApp();

      // Act
      const res = await app.request("/wiki-proxy/scp-173");
      const text = await res.text();

      // Assert
      expect(text).toContain('href="/wiki/scp-173"');
      expect(text).toContain('href="/wiki/scp-682"');
      expect(text).toContain('href="/wiki/taboo"');
    });
  });

  describe("プロキシパス済みリンクは二重変換しない", () => {
    it("既に /wiki/ プレフィックス付きのリンクは変換しない", async () => {
      // Arrange: URL_REWRITE_MAPでフルURLが /wiki/ に変換された後の状態を想定
      const html = `<html><head></head><body><a href="/wiki/scp-456">SCP-456</a></body></html>`;
      global.fetch = vi.fn().mockResolvedValue(createHtmlResponse(html));

      const app = createApp();

      // Act
      const res = await app.request("/wiki-proxy/scp-173");
      const text = await res.text();

      // Assert: /wiki/wiki/scp-456 にはならない
      expect(text).toContain('href="/wiki/scp-456"');
      expect(text).not.toContain('href="/wiki/wiki/');
    });

    it("wdfilesプロキシパスは変換しない", async () => {
      // Arrange
      const html = `<html><head></head><body><img src="/wdfiles-scp-jp/local--files/image.png" /></body></html>`;
      global.fetch = vi.fn().mockResolvedValue(createHtmlResponse(html));

      const app = createApp();

      // Act
      const res = await app.request("/wiki-proxy/scp-173");
      const text = await res.text();

      // Assert
      expect(text).not.toContain("/wiki/wdfiles-");
    });

    it("common--theme等のWikidotリソースパスは変換しない", async () => {
      // Arrange
      const html = `<html><head><link href="/common--theme/base.css" /></head><body></body></html>`;
      global.fetch = vi.fn().mockResolvedValue(createHtmlResponse(html));

      const app = createApp();

      // Act
      const res = await app.request("/wiki-proxy/scp-173");
      const text = await res.text();

      // Assert: href="/common--theme/..." は書き換え対象外
      expect(text).toContain('href="/common--theme/base.css"');
      expect(text).not.toContain('href="/wiki/common--theme/');
    });

    it("local--filesパスは変換しない", async () => {
      // Arrange
      const html = `<html><head></head><body><a href="/local--files/component:theme/style.css">CSS</a></body></html>`;
      global.fetch = vi.fn().mockResolvedValue(createHtmlResponse(html));

      const app = createApp();

      // Act
      const res = await app.request("/wiki-proxy/scp-173");
      const text = await res.text();

      // Assert
      expect(text).toContain('href="/local--files/');
      expect(text).not.toContain('href="/wiki/local--files/');
    });
  });

  describe("フルURL書き換え（既存動作）", () => {
    it("http://scp-jp.wikidot.com/ が /wiki/ に書き換えられる", async () => {
      // Arrange
      const html = `<html><head></head><body><a href="http://scp-jp.wikidot.com/scp-456">SCP-456</a></body></html>`;
      global.fetch = vi.fn().mockResolvedValue(createHtmlResponse(html));

      const app = createApp();

      // Act
      const res = await app.request("/wiki-proxy/scp-173");
      const text = await res.text();

      // Assert
      expect(text).toContain('href="/wiki/scp-456"');
      expect(text).not.toContain("scp-jp.wikidot.com");
    });

    it("wdfilesのURLがプロキシパスに書き換えられる", async () => {
      // Arrange
      const html = `<html><head></head><body><img src="http://scp-jp.wdfiles.com/local--files/image.png" /></body></html>`;
      global.fetch = vi.fn().mockResolvedValue(createHtmlResponse(html));

      const app = createApp();

      // Act
      const res = await app.request("/wiki-proxy/scp-173");
      const text = await res.text();

      // Assert
      expect(text).toContain('src="/wdfiles-scp-jp/local--files/image.png"');
    });
  });

  describe("CSS注入", () => {
    it("print-optionsを非表示にするCSSが注入される", async () => {
      // Arrange
      const html = `<html><head><title>Test</title></head><body></body></html>`;
      global.fetch = vi.fn().mockResolvedValue(createHtmlResponse(html));

      const app = createApp();

      // Act
      const res = await app.request("/wiki-proxy/scp-173");
      const text = await res.text();

      // Assert
      expect(text).toContain("#print-options{display:none!important}");
    });

    it("記事可読性向上のためのline-heightとfont-sizeが注入される", async () => {
      // Arrange
      const html = `<html><head><title>Test</title></head><body></body></html>`;
      global.fetch = vi.fn().mockResolvedValue(createHtmlResponse(html));

      const app = createApp();

      // Act
      const res = await app.request("/wiki-proxy/scp-173");
      const text = await res.text();

      // Assert: モックアップ準拠の可読性スタイル
      expect(text).toContain("line-height:1.8");
      expect(text).toContain("font-size:15px");
    });

    it("画像のレスポンシブスタイルが注入される", async () => {
      // Arrange
      const html = `<html><head><title>Test</title></head><body></body></html>`;
      global.fetch = vi.fn().mockResolvedValue(createHtmlResponse(html));

      const app = createApp();

      // Act
      const res = await app.request("/wiki-proxy/scp-173");
      const text = await res.text();

      // Assert: 画像がコンテナ幅を超えないようにする
      expect(text).toContain("#page-content img{max-width:100%;height:auto}");
    });
  });

  describe("エラーハンドリング", () => {
    it("パスが指定されない場合、400エラーを返す", async () => {
      // Arrange
      const app = createApp();

      // Act
      const res = await app.request("/wiki-proxy/");

      // Assert: パスが空なのでエラー
      // extractProxyPathが空文字を返す → 400
      // ただし Hono のルーティングで /wiki-proxy/ がマッチするか確認が必要
      expect(res.status).toBe(400);
    });

    it("fetchがエラーの場合、502を返す", async () => {
      // Arrange
      global.fetch = vi.fn().mockRejectedValue(new Error("Network error"));

      const app = createApp();

      // Act
      const res = await app.request("/wiki-proxy/scp-173");

      // Assert
      expect(res.status).toBe(502);
    });
  });
});
