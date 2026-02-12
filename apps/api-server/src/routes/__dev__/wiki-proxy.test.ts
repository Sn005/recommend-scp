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
    it("ドメインなし絶対パスリンクが /api/wiki-proxy/ 経由に書き換えられる", async () => {
      // Arrange
      const html = `<html><head></head><body><a href="/scp-456">SCP-456</a></body></html>`;
      global.fetch = vi.fn().mockResolvedValue(createHtmlResponse(html));

      const app = createApp();

      // Act
      const res = await app.request("/wiki-proxy/scp-173");
      const text = await res.text();

      // Assert
      expect(text).toContain('href="/api/wiki-proxy/scp-456"');
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
      expect(text).toContain('href="/api/wiki-proxy/hoge-fuga"');
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
      expect(text).toContain('href="/api/wiki-proxy/scp-173"');
      expect(text).toContain('href="/api/wiki-proxy/scp-682"');
      expect(text).toContain('href="/api/wiki-proxy/taboo"');
    });
  });

  describe("プロキシパス済みリンクは二重変換しない", () => {
    it("既に /wiki/ プレフィックス付きの記事リンクはプロキシ経由に変換される", async () => {
      // Arrange: URL_REWRITE_MAPでフルURLが /wiki/ に変換された後の状態を想定
      const html = `<html><head></head><body><a href="/wiki/scp-456">SCP-456</a></body></html>`;
      global.fetch = vi.fn().mockResolvedValue(createHtmlResponse(html));

      const app = createApp();

      // Act
      const res = await app.request("/wiki-proxy/scp-173");
      const text = await res.text();

      // Assert: /wiki/ 記事リンクは /api/wiki-proxy/ に変換される
      expect(text).toContain('href="/api/wiki-proxy/scp-456"');
      expect(text).not.toContain('href="/wiki/wiki/');
      expect(text).not.toContain('href="/api/wiki-proxy/wiki/');
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
      expect(text).not.toContain('href="/api/wiki-proxy/common--theme/');
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
      expect(text).not.toContain('href="/api/wiki-proxy/local--files/');
    });
  });

  describe("フルURL書き換え", () => {
    it("http://scp-jp.wikidot.com/ のhrefリンクがプロキシ経由に書き換えられる", async () => {
      // Arrange
      const html = `<html><head></head><body><a href="http://scp-jp.wikidot.com/scp-456">SCP-456</a></body></html>`;
      global.fetch = vi.fn().mockResolvedValue(createHtmlResponse(html));

      const app = createApp();

      // Act
      const res = await app.request("/wiki-proxy/scp-173");
      const text = await res.text();

      // Assert: 記事hrefはプロキシ経由に変換される
      expect(text).toContain('href="/api/wiki-proxy/scp-456"');
      expect(text).not.toContain("scp-jp.wikidot.com");
    });

    it("http://scp-jp.wikidot.com/ のリソースリンク（common--/local--）は /wiki/ のまま", async () => {
      // Arrange
      const html = `<html><head></head><body><a href="http://scp-jp.wikidot.com/local--files/img.png">img</a></body></html>`;
      global.fetch = vi.fn().mockResolvedValue(createHtmlResponse(html));

      const app = createApp();

      // Act
      const res = await app.request("/wiki-proxy/scp-173");
      const text = await res.text();

      // Assert: リソースパスはプロキシに変換されない
      expect(text).toContain('href="/wiki/local--files/img.png"');
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

  describe("CloudFront URLのプロトコル変換", () => {
    it("http://のCloudFront URLがhttps://に変換される", async () => {
      // Arrange
      const html = `<html><head><link rel="stylesheet" href="http://d3g0gp89917ko0.cloudfront.net/v--7690939296dc/common--theme/base/css/style.css" /></head><body></body></html>`;
      global.fetch = vi.fn().mockResolvedValue(createHtmlResponse(html));

      const app = createApp();

      // Act
      const res = await app.request("/wiki-proxy/scp-096");
      const text = await res.text();

      // Assert
      expect(text).toContain("https://d3g0gp89917ko0.cloudfront.net/");
      expect(text).not.toContain("http://d3g0gp89917ko0.cloudfront.net/");
    });

    it("複数のCloudFront URLが全て変換される", async () => {
      // Arrange
      const html = `<html><head>
        <link href="http://d3g0gp89917ko0.cloudfront.net/v--abc/style.css" />
        <script src="http://d3g0gp89917ko0.cloudfront.net/v--abc/script.js"></script>
      </head><body></body></html>`;
      global.fetch = vi.fn().mockResolvedValue(createHtmlResponse(html));

      const app = createApp();

      // Act
      const res = await app.request("/wiki-proxy/scp-106");
      const text = await res.text();

      // Assert
      expect(text).not.toContain("http://d3g0gp89917ko0.cloudfront.net/");
      expect(text).toMatch(/https:\/\/d3g0gp89917ko0\.cloudfront\.net\//);
    });

    it("異なるCloudFrontディストリビューションIDも変換される", async () => {
      // Arrange
      const html = `<html><head><link href="http://abc123xyz.cloudfront.net/v--def/style.css" /></head><body></body></html>`;
      global.fetch = vi.fn().mockResolvedValue(createHtmlResponse(html));

      const app = createApp();

      // Act
      const res = await app.request("/wiki-proxy/scp-173");
      const text = await res.text();

      // Assert
      expect(text).toContain("https://abc123xyz.cloudfront.net/");
      expect(text).not.toContain("http://abc123xyz.cloudfront.net/");
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
      expect(text).toContain("#print-options,#print-head{display:none!important}");
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

      // Assert: 画像がコンテナ幅を超えないようにする + 上下マージン
      expect(text).toContain(
        "#page-content img{max-width:100%;height:auto;display:block;margin:16px 0}"
      );
    });

    it("大文字の</HEAD>でもCSS注入が動作する", async () => {
      // Arrange
      const html = `<html><HEAD><title>Test</title></HEAD><body></body></html>`;
      global.fetch = vi.fn().mockResolvedValue(createHtmlResponse(html));

      const app = createApp();

      // Act
      const res = await app.request("/wiki-proxy/scp-173");
      const text = await res.text();

      // Assert
      expect(text).toContain("#print-options,#print-head{display:none!important}");
      expect(text).toContain("<style>");
    });

    it("</head>がないHTMLでもCSS注入が動作する（<body>フォールバック）", async () => {
      // Arrange
      const html = `<html><body><p>No head tag</p></body></html>`;
      global.fetch = vi.fn().mockResolvedValue(createHtmlResponse(html));

      const app = createApp();

      // Act
      const res = await app.request("/wiki-proxy/scp-173");
      const text = await res.text();

      // Assert
      expect(text).toContain("#print-options,#print-head{display:none!important}");
    });

    it("コンテンツ領域に左右16pxのパディングが設定される", async () => {
      // Arrange
      const html = `<html><head><title>Test</title></head><body></body></html>`;
      global.fetch = vi.fn().mockResolvedValue(createHtmlResponse(html));

      const app = createApp();

      // Act
      const res = await app.request("/wiki-proxy/scp-173");
      const text = await res.text();

      // Assert: モック準拠の左右余白
      expect(text).toContain("padding:0 16px");
    });
  });

  describe("リンクインターセプトJS注入", () => {
    it("</body>直前にリンクインターセプト用のscriptが注入される", async () => {
      // Arrange
      const html = `<html><head></head><body><p>test</p></body></html>`;
      global.fetch = vi.fn().mockResolvedValue(createHtmlResponse(html));

      const app = createApp();

      // Act
      const res = await app.request("/wiki-proxy/scp-173");
      const text = await res.text();

      // Assert
      expect(text).toContain("<script>");
      expect(text).toContain("addEventListener('click'");
      expect(text).toContain("/api/wiki-proxy/");
      expect(text).toContain("</script></body>");
    });

    it("collapsible-block開閉用のscriptが注入される", async () => {
      // Arrange
      const html = `<html><head></head><body></body></html>`;
      global.fetch = vi.fn().mockResolvedValue(createHtmlResponse(html));

      const app = createApp();

      // Act
      const res = await app.request("/wiki-proxy/scp-2000");
      const text = await res.text();

      // Assert: collapsible-block のトグル処理が含まれる
      expect(text).toContain("a.collapsible-block-link");
      expect(text).toContain(".collapsible-block-folded");
      expect(text).toContain(".collapsible-block-unfolded");
    });

    it("大文字の</BODY>でもJS注入が動作する", async () => {
      // Arrange
      const html = `<html><head></head><BODY><p>test</p></BODY></html>`;
      global.fetch = vi.fn().mockResolvedValue(createHtmlResponse(html));

      const app = createApp();

      // Act
      const res = await app.request("/wiki-proxy/scp-173");
      const text = await res.text();

      // Assert
      expect(text).toContain("<script>");
      expect(text).toContain("addEventListener('click'");
    });

    it("外部リンクをwindow.openで新しいタブに開くコードが含まれる", async () => {
      // Arrange
      const html = `<html><head></head><body></body></html>`;
      global.fetch = vi.fn().mockResolvedValue(createHtmlResponse(html));

      const app = createApp();

      // Act
      const res = await app.request("/wiki-proxy/scp-173");
      const text = await res.text();

      // Assert
      expect(text).toContain("window.open(h,'_blank','noopener')");
    });
  });

  describe("インラインstyle属性の除去", () => {
    it("style属性が除去される", async () => {
      // Arrange
      const html = `<html><head></head><body><div style="text-align: right;">テスト</div></body></html>`;
      global.fetch = vi.fn().mockResolvedValue(createHtmlResponse(html));

      const app = createApp();

      // Act
      const res = await app.request("/wiki-proxy/scp-173");
      const text = await res.text();

      // Assert
      expect(text).toContain("<div>テスト</div>");
      expect(text).not.toContain('style="text-align: right;"');
    });

    it("複数のstyle属性が全て除去される", async () => {
      // Arrange
      const html = `<html><head></head><body><p style="color: red;">赤</p><span style="float: left;">左</span></body></html>`;
      global.fetch = vi.fn().mockResolvedValue(createHtmlResponse(html));

      const app = createApp();

      // Act
      const res = await app.request("/wiki-proxy/scp-173");
      const text = await res.text();

      // Assert
      expect(text).toContain("<p>赤</p>");
      expect(text).toContain("<span>左</span>");
      expect(text).not.toContain('style="');
    });

    it("他の属性は保持される", async () => {
      // Arrange
      const html = `<html><head></head><body><div class="test" style="margin: 0;" id="main">内容</div></body></html>`;
      global.fetch = vi.fn().mockResolvedValue(createHtmlResponse(html));

      const app = createApp();

      // Act
      const res = await app.request("/wiki-proxy/scp-173");
      const text = await res.text();

      // Assert
      expect(text).toContain('class="test"');
      expect(text).toContain('id="main"');
      expect(text).not.toContain('style="');
    });
  });

  describe("block-left/block-right CSSオーバーライド", () => {
    it("block-left/block-rightのfloat無効化CSSが注入される", async () => {
      // Arrange
      const html = `<html><head><title>Test</title></head><body></body></html>`;
      global.fetch = vi.fn().mockResolvedValue(createHtmlResponse(html));

      const app = createApp();

      // Act
      const res = await app.request("/wiki-proxy/scp-173");
      const text = await res.text();

      // Assert
      expect(text).toContain(".block-left");
      expect(text).toContain(".block-right");
      expect(text).toContain("float:none!important");
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
