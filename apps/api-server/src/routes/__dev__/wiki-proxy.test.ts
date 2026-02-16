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

    it("colmod（coltop/colend）開閉用のscriptが注入される", async () => {
      // Arrange
      const html = `<html><head></head><body></body></html>`;
      global.fetch = vi.fn().mockResolvedValue(createHtmlResponse(html));

      const app = createApp();

      // Act
      const res = await app.request("/wiki-proxy/scp-7992");
      const text = await res.text();

      // Assert: colmod のトグル処理が含まれる
      expect(text).toContain(".colmod-link-top a");
      expect(text).toContain(".colmod-link-end a");
      expect(text).toContain("classList.replace('folded','unfolded')");
      expect(text).toContain("classList.replace('unfolded','folded')");
    });

    it("YUI TabView切り替え用のscriptが注入される", async () => {
      // Arrange
      const html = `<html><head></head><body></body></html>`;
      global.fetch = vi.fn().mockResolvedValue(createHtmlResponse(html));

      const app = createApp();

      // Act
      const res = await app.request("/wiki-proxy/scp-7992");
      const text = await res.text();

      // Assert: YUI TabView のタブ切り替え処理が含まれる
      expect(text).toContain(".yui-nav a");
      expect(text).toContain(".yui-navset");
      expect(text).toContain(".yui-content>div");
      expect(text).toContain("classList.add('selected')");
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
      expect(text).not.toContain('style="color: red;"');
      expect(text).not.toContain('style="float: left;"');
    });

    it("display:noneを含むstyle属性は保持される", async () => {
      // Arrange: Wikidotコンポーネントの隠し要素パターン
      const html = `<html><head></head><body><div style="display: none;"><div class="collapsible-block">コード</div></div></body></html>`;
      global.fetch = vi.fn().mockResolvedValue(createHtmlResponse(html));

      const app = createApp();

      // Act
      const res = await app.request("/wiki-proxy/scp-173");
      const text = await res.text();

      // Assert
      expect(text).toContain('style="display: none;"');
    });

    it("display:none（スペースなし）を含むstyle属性も保持される", async () => {
      // Arrange
      const html = `<html><head></head><body><div style="display:none"><span>隠し要素</span></div></body></html>`;
      global.fetch = vi.fn().mockResolvedValue(createHtmlResponse(html));

      const app = createApp();

      // Act
      const res = await app.request("/wiki-proxy/scp-173");
      const text = await res.text();

      // Assert
      expect(text).toContain('style="display:none"');
    });

    it("display:noneと他のプロパティが混在するstyle属性も保持される", async () => {
      // Arrange
      const html = `<html><head></head><body><div style="margin: 0; display: none; color: red;">隠し</div></body></html>`;
      global.fetch = vi.fn().mockResolvedValue(createHtmlResponse(html));

      const app = createApp();

      // Act
      const res = await app.request("/wiki-proxy/scp-173");
      const text = await res.text();

      // Assert
      expect(text).toContain('style="margin: 0; display: none; color: red;"');
    });

    it("display:block等のnone以外のdisplay値は除去される", async () => {
      // Arrange
      const html = `<html><head></head><body><div style="display: block;">表示要素</div></body></html>`;
      global.fetch = vi.fn().mockResolvedValue(createHtmlResponse(html));

      const app = createApp();

      // Act
      const res = await app.request("/wiki-proxy/scp-173");
      const text = await res.text();

      // Assert
      expect(text).not.toContain('style="display: block;"');
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
      expect(text).not.toContain('style="margin: 0;"');
    });
  });

  describe("コンポーネントコードビューア非表示CSS", () => {
    it("コンポーネントコードビューアを非表示にするCSSが注入される", async () => {
      // Arrange
      const html = `<html><head><title>Test</title></head><body></body></html>`;
      global.fetch = vi.fn().mockResolvedValue(createHtmlResponse(html));

      const app = createApp();

      // Act
      const res = await app.request("/wiki-proxy/scp-173");
      const text = await res.text();

      // Assert
      expect(text).toContain(
        ".collapsible-block:has(>.collapsible-block-unfolded>.collapsible-block-content>.code){display:none!important}"
      );
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

  describe("パスの大文字小文字正規化", () => {
    it("大文字のarticle IDが小文字に正規化されてfetchされる", async () => {
      // Arrange: お気に入り経由で大文字の "SCP-2000" が渡されるケース
      const html = `<html><head></head><body><div id="page-content">SCP-2000</div></body></html>`;
      global.fetch = vi.fn().mockResolvedValue(createHtmlResponse(html));

      const app = createApp();

      // Act
      const res = await app.request("/wiki-proxy/SCP-2000");

      // Assert: printer--friendly URLが小文字で構築される
      expect(res.status).toBe(200);
      expect(global.fetch).toHaveBeenCalledWith(
        "http://scp-jp.wikidot.com/printer--friendly/scp-2000"
      );
    });

    it("混在ケース（Scp-173）も小文字に正規化される", async () => {
      // Arrange
      const html = `<html><head></head><body></body></html>`;
      global.fetch = vi.fn().mockResolvedValue(createHtmlResponse(html));

      const app = createApp();

      // Act
      await app.request("/wiki-proxy/Scp-173");

      // Assert
      expect(global.fetch).toHaveBeenCalledWith(
        "http://scp-jp.wikidot.com/printer--friendly/scp-173"
      );
    });

    it("既に小文字のパスはそのままfetchされる", async () => {
      // Arrange
      const html = `<html><head></head><body></body></html>`;
      global.fetch = vi.fn().mockResolvedValue(createHtmlResponse(html));

      const app = createApp();

      // Act
      await app.request("/wiki-proxy/scp-173");

      // Assert
      expect(global.fetch).toHaveBeenCalledWith(
        "http://scp-jp.wikidot.com/printer--friendly/scp-173"
      );
    });
  });

  describe("エラーハンドリング", () => {
    it("パスが指定されない場合、400エラーを返す", async () => {
      // Arrange
      const app = createApp();

      // Act
      const res = await app.request("/wiki-proxy/");

      // Assert: パスが空なのでエラー
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

  describe("basePath経由のルーティング（Next.js API Route相当）", () => {
    /**
     * Next.js API Routeでは basePath("/api") でラップされた状態で
     * wiki-proxyにリクエストが到達する。
     * extractProxyPathはc.req.pathの完全パスからwiki-proxy以降を抽出するため、
     * basePath有無に関わらず正しくパスを抽出できることを検証。
     */
    function createAppWithBasePath() {
      return new Hono()
        .basePath("/api")
        .route("/", new Hono().route("/wiki-proxy", wikiProxyRoutes));
    }

    it("basePath付きでもprinter-friendlyコンテンツが返される", async () => {
      // Arrange
      const html = `<html><head></head><body><div id="page-content">SCP-173</div></body></html>`;
      global.fetch = vi.fn().mockResolvedValue(createHtmlResponse(html));

      const app = createAppWithBasePath();

      // Act
      const res = await app.request("/api/wiki-proxy/scp-173");
      const text = await res.text();

      // Assert
      expect(res.status).toBe(200);
      expect(text).toContain("SCP-173");
      expect(text).toContain("<style>");
      expect(text).toContain("<script>");

      // printer--friendly URLでfetchされることを確認
      expect(global.fetch).toHaveBeenCalledWith(
        "http://scp-jp.wikidot.com/printer--friendly/scp-173"
      );
    });

    it("basePath付きでも絶対パスリンクが正しく書き換えられる", async () => {
      // Arrange
      const html = `<html><head></head><body><a href="/scp-682">SCP-682</a></body></html>`;
      global.fetch = vi.fn().mockResolvedValue(createHtmlResponse(html));

      const app = createAppWithBasePath();

      // Act
      const res = await app.request("/api/wiki-proxy/scp-173");
      const text = await res.text();

      // Assert
      expect(text).toContain('href="/api/wiki-proxy/scp-682"');
    });

    it("basePath付きでパスが空の場合、400エラーを返す", async () => {
      // Arrange
      const app = createAppWithBasePath();

      // Act
      const res = await app.request("/api/wiki-proxy/");

      // Assert
      expect(res.status).toBe(400);
    });
  });
});
