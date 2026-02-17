/**
 * @file Wikiプロキシ テスト
 * @description SCP WikiプロキシのDOM抽出・HTML再構築・URL書き換えロジックのテスト
 */

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { Hono } from "hono";
import {
  wikiProxyRoutes,
  extractContent,
  buildHtml,
  rewriteUrls,
  isArticleScript,
} from "../wiki-proxy";

// ============================================================
// テストヘルパー
// ============================================================

/**
 * Wikidot通常ページのHTML構造を再現するモック生成
 */
function createWikidotHtml(options?: {
  pageTitle?: string;
  pageContent?: string;
  headStyles?: string[];
  headLinks?: string[];
  bodyScripts?: string[];
  platformScripts?: boolean;
}): string {
  const {
    pageTitle = "Test Page",
    pageContent = "<p>Content</p>",
    headStyles = [],
    headLinks = [],
    bodyScripts = [],
    platformScripts = true,
  } = options ?? {};

  const platformLinkTag = platformScripts
    ? '<link rel="stylesheet" href="http://d3g0gp89917ko0.cloudfront.net/v--abc/common--theme/base/css/style.css">'
    : "";
  const platformScriptTag = platformScripts
    ? '<script src="http://d3g0gp89917ko0.cloudfront.net/v--abc/WIKIDOT.combined.js"></script>'
    : "";
  const platformInlineScript = platformScripts
    ? "<script>WIKIDOT.page = { listeners: {} };</script>"
    : "";

  return [
    "<html><head>",
    platformLinkTag,
    platformScriptTag,
    ...headLinks,
    ...headStyles.map((s) => `<style>${s}</style>`),
    "</head><body>",
    '<div id="container">',
    '<div id="side-bar">Sidebar</div>',
    '<div id="main-content">',
    `<div id="page-title">${pageTitle}</div>`,
    `<div id="page-content">${pageContent}</div>`,
    "</div>",
    '<div id="footer">Footer</div>',
    "</div>",
    platformInlineScript,
    ...bodyScripts.map((s) => `<script>${s}</script>`),
    "</body></html>",
  ].join("");
}

function createHtmlResponse(body: string): Response {
  return new Response(body, {
    status: 200,
    headers: { "content-type": "text/html; charset=utf-8" },
  });
}

function createApp() {
  return new Hono().route("/wiki-proxy", wikiProxyRoutes);
}

// ============================================================
// テスト
// ============================================================

describe("GET /wiki-proxy/*", () => {
  const originalFetch = global.fetch;

  beforeEach(() => {
    vi.resetAllMocks();
  });

  afterEach(() => {
    global.fetch = originalFetch;
  });

  // ----------------------------------------------------------
  // DOM抽出（extractContent）
  // ----------------------------------------------------------
  describe("DOM抽出（extractContent）", () => {
    it("#main-contentのouterHTMLが抽出される", async () => {
      const html = createWikidotHtml({
        pageTitle: "SCP-173",
        pageContent: "<p>彫刻</p>",
        platformScripts: false,
      });

      const result = await extractContent(html);

      expect(result.mainContentHtml).toContain('id="main-content"');
      expect(result.mainContentHtml).toContain('id="page-title"');
      expect(result.mainContentHtml).toContain("SCP-173");
      expect(result.mainContentHtml).toContain('id="page-content"');
      expect(result.mainContentHtml).toContain("<p>彫刻</p>");
    });

    it("サイドバー・フッターは抽出されない", async () => {
      const html = createWikidotHtml({ platformScripts: false });

      const result = await extractContent(html);

      expect(result.mainContentHtml).not.toContain("Sidebar");
      expect(result.mainContentHtml).not.toContain("Footer");
    });

    it("#main-contentが存在しない場合、body全体にフォールバック", async () => {
      const html = "<html><head></head><body><p>No main content</p></body></html>";

      const result = await extractContent(html);

      expect(result.mainContentHtml).toContain("<p>No main content</p>");
    });

    it("head内のstyleタグが収集される", async () => {
      const html = createWikidotHtml({
        headStyles: [".custom-theme { color: red; }"],
        platformScripts: false,
      });

      const result = await extractContent(html);

      expect(result.headStyleTags).toHaveLength(1);
      expect(result.headStyleTags[0]).toContain(".custom-theme { color: red; }");
    });

    it("head内の複数のstyleタグが全て収集される", async () => {
      const html = createWikidotHtml({
        headStyles: ["body { background: black; }", ".title { color: white; }"],
        platformScripts: false,
      });

      const result = await extractContent(html);

      expect(result.headStyleTags).toHaveLength(2);
    });

    it("head内のlink[rel=stylesheet]タグが収集される", async () => {
      const html = createWikidotHtml({
        headLinks: [
          '<link rel="stylesheet" href="http://scp-jp.wikidot.com/local--files/component:theme/style.css">',
        ],
        platformScripts: false,
      });

      const result = await extractContent(html);

      // headLinksで指定した1つ（platformScripts=falseなのでプラットフォームCSSなし）
      expect(result.headLinkTags).toHaveLength(1);
      expect(result.headLinkTags[0]).toContain("component:theme/style.css");
    });

    it("プラットフォームのlink[rel=stylesheet]も収集される", async () => {
      const html = createWikidotHtml({ platformScripts: true });

      const result = await extractContent(html);

      // プラットフォームのbase CSSリンクが含まれる
      expect(result.headLinkTags.length).toBeGreaterThanOrEqual(1);
      expect(result.headLinkTags[0]).toContain("cloudfront.net");
    });
  });

  // ----------------------------------------------------------
  // スクリプトフィルタリング（isArticleScript）
  // ----------------------------------------------------------
  describe("スクリプトフィルタリング（isArticleScript）", () => {
    it("プラットフォーム外部スクリプト（cloudfront）は除外される", () => {
      const result = isArticleScript({
        src: "http://d3g0gp89917ko0.cloudfront.net/v--abc/WIKIDOT.combined.js",
        textContent: null,
      });
      expect(result).toBe(false);
    });

    it("プラットフォーム外部スクリプト（wikidot.com）は除外される", () => {
      const result = isArticleScript({
        src: "http://static.wikidot.com/v--abc/jquery.min.js",
        textContent: null,
      });
      expect(result).toBe(false);
    });

    it("プラットフォーム外部スクリプト（wdfiles.com）は除外される", () => {
      const result = isArticleScript({
        src: "http://scp-jp.wdfiles.com/some-script.js",
        textContent: null,
      });
      expect(result).toBe(false);
    });

    it("WIKIDOT初期化コードを含むインラインスクリプトは除外される", () => {
      const result = isArticleScript({
        src: "",
        textContent: "WIKIDOT.page = { listeners: {} };",
      });
      expect(result).toBe(false);
    });

    it("OZONE初期化コードを含むインラインスクリプトは除外される", () => {
      const result = isArticleScript({
        src: "",
        textContent: "OZONE.init = function() {};",
      });
      expect(result).toBe(false);
    });

    it("YAHOO初期化コードを含むインラインスクリプトは除外される", () => {
      const result = isArticleScript({
        src: "",
        textContent: "YAHOO.util = {};",
      });
      expect(result).toBe(false);
    });

    it("空のスクリプトは除外される", () => {
      const result = isArticleScript({ src: "", textContent: "   " });
      expect(result).toBe(false);
    });

    it("記事固有のインラインスクリプトは保持される", () => {
      const result = isArticleScript({
        src: "",
        textContent: 'document.addEventListener("DOMContentLoaded", function() { /* custom */ });',
      });
      expect(result).toBe(true);
    });

    it("記事固有の外部スクリプト（非プラットフォームURL）は保持される", () => {
      const result = isArticleScript({
        src: "https://example.com/custom-article-script.js",
        textContent: null,
      });
      expect(result).toBe(true);
    });
  });

  // ----------------------------------------------------------
  // DOM抽出経由のスクリプトフィルタリング
  // ----------------------------------------------------------
  describe("DOM抽出経由のスクリプトフィルタリング", () => {
    it("プラットフォームスクリプトが除外され記事スクリプトが保持される", async () => {
      const html = createWikidotHtml({
        platformScripts: true,
        bodyScripts: ["// カスタムアニメーション\nvar x = 1;"],
      });

      const result = await extractContent(html);

      // プラットフォームスクリプト（WIKIDOT.combined.js, WIKIDOT.page=...）は除外
      const allScripts = result.articleScripts.join("");
      expect(allScripts).not.toContain("WIKIDOT.combined.js");
      expect(allScripts).not.toContain("WIKIDOT.page =");

      // 記事固有スクリプトは保持
      expect(allScripts).toContain("カスタムアニメーション");
    });
  });

  // ----------------------------------------------------------
  // HTML再構築（buildHtml）
  // ----------------------------------------------------------
  describe("HTML再構築（buildHtml）", () => {
    it("正しいHTML構造が生成される", async () => {
      const content = await extractContent(
        createWikidotHtml({
          pageTitle: "SCP-173",
          pageContent: "<p>彫刻</p>",
          platformScripts: false,
        })
      );

      const result = buildHtml(content);

      expect(result).toContain("<!DOCTYPE html>");
      expect(result).toContain('<meta charset="utf-8">');
      expect(result).toContain(
        '<meta name="viewport" content="width=device-width, initial-scale=1">'
      );
      expect(result).toContain("<style>");
      expect(result).toContain("</head><body>");
      expect(result).toContain("SCP-173");
      expect(result).toContain("</body></html>");
    });

    it("WIKIDOTスタブが注入される", async () => {
      const content = await extractContent(createWikidotHtml({ platformScripts: false }));

      const result = buildHtml(content);

      expect(result).toContain("window.WIKIDOT={page:{listeners:{}},modules:{}}");
    });

    it("記事CSSの後に注入CSSが配置される", async () => {
      const content = await extractContent(
        createWikidotHtml({
          headStyles: [".article-css { color: red; }"],
          platformScripts: false,
        })
      );

      const result = buildHtml(content);

      const articleCssPos = result.indexOf(".article-css");
      const injectedCssPos = result.indexOf("#main-content{margin:0!important");
      expect(articleCssPos).toBeLessThan(injectedCssPos);
    });

    it("注入JSが末尾に配置される", async () => {
      const content = await extractContent(createWikidotHtml({ platformScripts: false }));

      const result = buildHtml(content);

      // INJECTED_SCRIPT は </body> の直前
      expect(result).toContain("addEventListener('click'");
      const scriptPos = result.indexOf("addEventListener('click'");
      const bodyClosePos = result.indexOf("</body>");
      expect(scriptPos).toBeLessThan(bodyClosePos);
    });
  });

  // ----------------------------------------------------------
  // 絶対パスリンクの書き換え
  // ----------------------------------------------------------
  describe("絶対パスリンクの書き換え", () => {
    it("ドメインなし絶対パスリンクが /api/wiki-proxy/ 経由に書き換えられる", async () => {
      const html = createWikidotHtml({
        pageContent: '<a href="/scp-456">SCP-456</a>',
      });
      global.fetch = vi.fn().mockResolvedValue(createHtmlResponse(html));

      const app = createApp();
      const res = await app.request("/wiki-proxy/scp-173");
      const text = await res.text();

      expect(text).toContain('href="/api/wiki-proxy/scp-456"');
      expect(text).not.toContain('href="/scp-456"');
    });

    it("tale等のSCP記事以外のパスも書き換えられる", async () => {
      const html = createWikidotHtml({
        pageContent: '<a href="/hoge-fuga">ほげふが</a>',
      });
      global.fetch = vi.fn().mockResolvedValue(createHtmlResponse(html));

      const app = createApp();
      const res = await app.request("/wiki-proxy/scp-173");
      const text = await res.text();

      expect(text).toContain('href="/api/wiki-proxy/hoge-fuga"');
    });

    it("複数の絶対パスリンクが全て書き換えられる", async () => {
      const html = createWikidotHtml({
        pageContent: [
          '<a href="/scp-173">SCP-173</a>',
          '<a href="/scp-682">SCP-682</a>',
          '<a href="/taboo">Taboo</a>',
        ].join(""),
      });
      global.fetch = vi.fn().mockResolvedValue(createHtmlResponse(html));

      const app = createApp();
      const res = await app.request("/wiki-proxy/scp-173");
      const text = await res.text();

      expect(text).toContain('href="/api/wiki-proxy/scp-173"');
      expect(text).toContain('href="/api/wiki-proxy/scp-682"');
      expect(text).toContain('href="/api/wiki-proxy/taboo"');
    });
  });

  // ----------------------------------------------------------
  // プロキシパス済みリンクは二重変換しない
  // ----------------------------------------------------------
  describe("プロキシパス済みリンクは二重変換しない", () => {
    it("既に /wiki/ プレフィックス付きの記事リンクはプロキシ経由に変換される", async () => {
      const html = createWikidotHtml({
        pageContent: '<a href="/wiki/scp-456">SCP-456</a>',
      });
      global.fetch = vi.fn().mockResolvedValue(createHtmlResponse(html));

      const app = createApp();
      const res = await app.request("/wiki-proxy/scp-173");
      const text = await res.text();

      // /wiki/ 記事リンクは /api/wiki-proxy/ に変換される
      // NOTE: rewriteUrls で ABSOLUTE_PATH_HREF_RE が先に処理される。
      // /wiki/ は PROXY_PATH_PREFIXES に含まれるため二重変換されない。
      // その後 WIKI_ARTICLE_HREF_RE で /wiki/scp-456 → /api/wiki-proxy/scp-456
      expect(text).toContain('href="/api/wiki-proxy/scp-456"');
      expect(text).not.toContain('href="/wiki/wiki/');
      expect(text).not.toContain('href="/api/wiki-proxy/wiki/');
    });

    it("wdfilesプロキシパスは変換しない", async () => {
      const html = createWikidotHtml({
        pageContent: '<img src="/wdfiles-scp-jp/local--files/image.png" />',
      });
      global.fetch = vi.fn().mockResolvedValue(createHtmlResponse(html));

      const app = createApp();
      const res = await app.request("/wiki-proxy/scp-173");
      const text = await res.text();

      expect(text).not.toContain("/wiki/wdfiles-");
    });

    it("common--theme等のWikidotリソースパスは変換しない", async () => {
      const html = createWikidotHtml({
        pageContent: '<link href="/common--theme/base.css" />',
      });
      global.fetch = vi.fn().mockResolvedValue(createHtmlResponse(html));

      const app = createApp();
      const res = await app.request("/wiki-proxy/scp-173");
      const text = await res.text();

      expect(text).toContain('href="/common--theme/base.css"');
      expect(text).not.toContain('href="/api/wiki-proxy/common--theme/');
    });

    it("local--filesパスは変換しない", async () => {
      const html = createWikidotHtml({
        pageContent: '<a href="/local--files/component:theme/style.css">CSS</a>',
      });
      global.fetch = vi.fn().mockResolvedValue(createHtmlResponse(html));

      const app = createApp();
      const res = await app.request("/wiki-proxy/scp-173");
      const text = await res.text();

      expect(text).toContain('href="/local--files/');
      expect(text).not.toContain('href="/api/wiki-proxy/local--files/');
    });
  });

  // ----------------------------------------------------------
  // フルURL書き換え
  // ----------------------------------------------------------
  describe("フルURL書き換え", () => {
    it("http://scp-jp.wikidot.com/ のhrefリンクがプロキシ経由に書き換えられる", async () => {
      const html = createWikidotHtml({
        pageContent: '<a href="http://scp-jp.wikidot.com/scp-456">SCP-456</a>',
      });
      global.fetch = vi.fn().mockResolvedValue(createHtmlResponse(html));

      const app = createApp();
      const res = await app.request("/wiki-proxy/scp-173");
      const text = await res.text();

      expect(text).toContain('href="/api/wiki-proxy/scp-456"');
      expect(text).not.toContain("scp-jp.wikidot.com");
    });

    it("http://scp-jp.wikidot.com/ のリソースリンク（common--/local--）は /wiki/ のまま", async () => {
      const html = createWikidotHtml({
        pageContent: '<a href="http://scp-jp.wikidot.com/local--files/img.png">img</a>',
      });
      global.fetch = vi.fn().mockResolvedValue(createHtmlResponse(html));

      const app = createApp();
      const res = await app.request("/wiki-proxy/scp-173");
      const text = await res.text();

      expect(text).toContain('href="/wiki/local--files/img.png"');
    });

    it("wdfilesのURLがプロキシパスに書き換えられる", async () => {
      const html = createWikidotHtml({
        pageContent: '<img src="http://scp-jp.wdfiles.com/local--files/image.png" />',
      });
      global.fetch = vi.fn().mockResolvedValue(createHtmlResponse(html));

      const app = createApp();
      const res = await app.request("/wiki-proxy/scp-173");
      const text = await res.text();

      expect(text).toContain('src="/wdfiles-scp-jp/local--files/image.png"');
    });
  });

  // ----------------------------------------------------------
  // CloudFront URLのプロトコル変換
  // ----------------------------------------------------------
  describe("CloudFront URLのプロトコル変換", () => {
    it("http://のCloudFront URLがhttps://に変換される", async () => {
      const html = createWikidotHtml({
        pageContent:
          '<link rel="stylesheet" href="http://d3g0gp89917ko0.cloudfront.net/v--7690939296dc/common--theme/base/css/style.css" />',
      });
      global.fetch = vi.fn().mockResolvedValue(createHtmlResponse(html));

      const app = createApp();
      const res = await app.request("/wiki-proxy/scp-096");
      const text = await res.text();

      expect(text).toContain("https://d3g0gp89917ko0.cloudfront.net/");
      expect(text).not.toContain("http://d3g0gp89917ko0.cloudfront.net/");
    });

    it("複数のCloudFront URLが全て変換される", async () => {
      const html = createWikidotHtml({
        pageContent: [
          '<link href="http://d3g0gp89917ko0.cloudfront.net/v--abc/style.css" />',
          '<script src="http://d3g0gp89917ko0.cloudfront.net/v--abc/script.js"></script>',
        ].join(""),
      });
      global.fetch = vi.fn().mockResolvedValue(createHtmlResponse(html));

      const app = createApp();
      const res = await app.request("/wiki-proxy/scp-106");
      const text = await res.text();

      expect(text).not.toContain("http://d3g0gp89917ko0.cloudfront.net/");
      expect(text).toMatch(/https:\/\/d3g0gp89917ko0\.cloudfront\.net\//);
    });

    it("異なるCloudFrontディストリビューションIDも変換される", async () => {
      const html = createWikidotHtml({
        pageContent: '<link href="http://abc123xyz.cloudfront.net/v--def/style.css" />',
      });
      global.fetch = vi.fn().mockResolvedValue(createHtmlResponse(html));

      const app = createApp();
      const res = await app.request("/wiki-proxy/scp-173");
      const text = await res.text();

      expect(text).toContain("https://abc123xyz.cloudfront.net/");
      expect(text).not.toContain("http://abc123xyz.cloudfront.net/");
    });
  });

  // ----------------------------------------------------------
  // CSS注入
  // ----------------------------------------------------------
  describe("CSS注入", () => {
    it("記事可読性向上のためのline-heightとfont-sizeが注入される（!important付き）", async () => {
      const html = createWikidotHtml();
      global.fetch = vi.fn().mockResolvedValue(createHtmlResponse(html));

      const app = createApp();
      const res = await app.request("/wiki-proxy/scp-173");
      const text = await res.text();

      expect(text).toContain("line-height:1.8!important");
      expect(text).toContain("font-size:15px!important");
    });

    it("画像のレスポンシブスタイルが注入される（!important付き）", async () => {
      const html = createWikidotHtml();
      global.fetch = vi.fn().mockResolvedValue(createHtmlResponse(html));

      const app = createApp();
      const res = await app.request("/wiki-proxy/scp-173");
      const text = await res.text();

      expect(text).toContain("max-width:100%!important");
      expect(text).toContain("height:auto!important");
    });

    it("コンテンツ領域に左右16pxのパディングが設定される（!important付き）", async () => {
      const html = createWikidotHtml();
      global.fetch = vi.fn().mockResolvedValue(createHtmlResponse(html));

      const app = createApp();
      const res = await app.request("/wiki-proxy/scp-173");
      const text = await res.text();

      expect(text).toContain("padding:0 16px!important");
    });

    it("#main-contentのレイアウトリセットが!important付きで注入される", async () => {
      const html = createWikidotHtml();
      global.fetch = vi.fn().mockResolvedValue(createHtmlResponse(html));

      const app = createApp();
      const res = await app.request("/wiki-proxy/scp-173");
      const text = await res.text();

      expect(text).toContain(
        "#main-content{margin:0!important;padding:0!important;max-width:none!important}"
      );
    });
  });

  // ----------------------------------------------------------
  // リンクインターセプトJS注入
  // ----------------------------------------------------------
  describe("リンクインターセプトJS注入", () => {
    it("リンクインターセプト用のscriptが注入される", async () => {
      const html = createWikidotHtml();
      global.fetch = vi.fn().mockResolvedValue(createHtmlResponse(html));

      const app = createApp();
      const res = await app.request("/wiki-proxy/scp-173");
      const text = await res.text();

      expect(text).toContain("<script>");
      expect(text).toContain("addEventListener('click'");
      expect(text).toContain("/api/wiki-proxy/");
    });

    it("collapsible-block開閉用のscriptが注入される", async () => {
      const html = createWikidotHtml();
      global.fetch = vi.fn().mockResolvedValue(createHtmlResponse(html));

      const app = createApp();
      const res = await app.request("/wiki-proxy/scp-2000");
      const text = await res.text();

      expect(text).toContain("a.collapsible-block-link");
      expect(text).toContain(".collapsible-block-folded");
      expect(text).toContain(".collapsible-block-unfolded");
    });

    it("外部リンクをwindow.openで新しいタブに開くコードが含まれる", async () => {
      const html = createWikidotHtml();
      global.fetch = vi.fn().mockResolvedValue(createHtmlResponse(html));

      const app = createApp();
      const res = await app.request("/wiki-proxy/scp-173");
      const text = await res.text();

      expect(text).toContain("window.open(h,'_blank','noopener')");
    });

    it("colmod（coltop/colend）開閉用のscriptが注入される", async () => {
      const html = createWikidotHtml();
      global.fetch = vi.fn().mockResolvedValue(createHtmlResponse(html));

      const app = createApp();
      const res = await app.request("/wiki-proxy/scp-7992");
      const text = await res.text();

      expect(text).toContain(".colmod-link-top a");
      expect(text).toContain(".colmod-link-end a");
      expect(text).toContain("classList.replace('folded','unfolded')");
      expect(text).toContain("classList.replace('unfolded','folded')");
    });

    it("YUI TabView切り替え用のscriptが注入される", async () => {
      const html = createWikidotHtml();
      global.fetch = vi.fn().mockResolvedValue(createHtmlResponse(html));

      const app = createApp();
      const res = await app.request("/wiki-proxy/scp-7992");
      const text = await res.text();

      expect(text).toContain(".yui-nav a");
      expect(text).toContain(".yui-navset");
      expect(text).toContain(".yui-content>div");
      expect(text).toContain("classList.add('selected')");
    });
  });

  // ----------------------------------------------------------
  // WIKIDOTスタブ注入
  // ----------------------------------------------------------
  describe("WIKIDOTスタブ注入", () => {
    it("WIKIDOTグローバルオブジェクトのスタブが注入される", async () => {
      const html = createWikidotHtml();
      global.fetch = vi.fn().mockResolvedValue(createHtmlResponse(html));

      const app = createApp();
      const res = await app.request("/wiki-proxy/scp-173");
      const text = await res.text();

      expect(text).toContain("window.WIKIDOT={page:{listeners:{}},modules:{}}");
    });

    it("スタブが記事固有JSより前に配置される", async () => {
      const html = createWikidotHtml({
        bodyScripts: ["// カスタムJS\nvar custom = true;"],
      });
      global.fetch = vi.fn().mockResolvedValue(createHtmlResponse(html));

      const app = createApp();
      const res = await app.request("/wiki-proxy/scp-173");
      const text = await res.text();

      const stubPos = text.indexOf("window.WIKIDOT=");
      const customPos = text.indexOf("カスタムJS");
      expect(stubPos).toBeLessThan(customPos);
    });
  });

  // ----------------------------------------------------------
  // インラインstyle属性の除去
  // ----------------------------------------------------------
  describe("インラインstyle属性の除去", () => {
    it("style属性が除去される", async () => {
      const html = createWikidotHtml({
        pageContent: '<div style="text-align: right;">テスト</div>',
      });
      global.fetch = vi.fn().mockResolvedValue(createHtmlResponse(html));

      const app = createApp();
      const res = await app.request("/wiki-proxy/scp-173");
      const text = await res.text();

      expect(text).toContain("<div>テスト</div>");
      expect(text).not.toContain('style="text-align: right;"');
    });

    it("複数のstyle属性が全て除去される", async () => {
      const html = createWikidotHtml({
        pageContent: '<p style="color: red;">赤</p><span style="float: left;">左</span>',
      });
      global.fetch = vi.fn().mockResolvedValue(createHtmlResponse(html));

      const app = createApp();
      const res = await app.request("/wiki-proxy/scp-173");
      const text = await res.text();

      expect(text).toContain("<p>赤</p>");
      expect(text).toContain("<span>左</span>");
      expect(text).not.toContain('style="color: red;"');
      expect(text).not.toContain('style="float: left;"');
    });

    it("display:noneを含むstyle属性は保持される", async () => {
      const html = createWikidotHtml({
        pageContent:
          '<div style="display: none;"><div class="collapsible-block">コード</div></div>',
      });
      global.fetch = vi.fn().mockResolvedValue(createHtmlResponse(html));

      const app = createApp();
      const res = await app.request("/wiki-proxy/scp-173");
      const text = await res.text();

      expect(text).toContain('style="display: none;"');
    });

    it("display:none（スペースなし）を含むstyle属性も保持される", async () => {
      const html = createWikidotHtml({
        pageContent: '<div style="display:none"><span>隠し要素</span></div>',
      });
      global.fetch = vi.fn().mockResolvedValue(createHtmlResponse(html));

      const app = createApp();
      const res = await app.request("/wiki-proxy/scp-173");
      const text = await res.text();

      expect(text).toContain('style="display:none"');
    });

    it("display:noneと他のプロパティが混在するstyle属性も保持される", async () => {
      const html = createWikidotHtml({
        pageContent: '<div style="margin: 0; display: none; color: red;">隠し</div>',
      });
      global.fetch = vi.fn().mockResolvedValue(createHtmlResponse(html));

      const app = createApp();
      const res = await app.request("/wiki-proxy/scp-173");
      const text = await res.text();

      expect(text).toContain('style="margin: 0; display: none; color: red;"');
    });

    it("display:block等のnone以外のdisplay値は除去される", async () => {
      const html = createWikidotHtml({
        pageContent: '<div style="display: block;">表示要素</div>',
      });
      global.fetch = vi.fn().mockResolvedValue(createHtmlResponse(html));

      const app = createApp();
      const res = await app.request("/wiki-proxy/scp-173");
      const text = await res.text();

      expect(text).not.toContain('style="display: block;"');
    });

    it("他の属性は保持される", async () => {
      const html = createWikidotHtml({
        pageContent: '<div class="test" style="margin: 0;" id="main">内容</div>',
      });
      global.fetch = vi.fn().mockResolvedValue(createHtmlResponse(html));

      const app = createApp();
      const res = await app.request("/wiki-proxy/scp-173");
      const text = await res.text();

      expect(text).toContain('class="test"');
      expect(text).toContain('id="main"');
      expect(text).not.toContain('style="margin: 0;"');
    });
  });

  // ----------------------------------------------------------
  // コンポーネントコードビューア非表示CSS
  // ----------------------------------------------------------
  describe("コンポーネントコードビューア非表示CSS", () => {
    it("コンポーネントコードビューアを非表示にするCSSが注入される", async () => {
      const html = createWikidotHtml();
      global.fetch = vi.fn().mockResolvedValue(createHtmlResponse(html));

      const app = createApp();
      const res = await app.request("/wiki-proxy/scp-173");
      const text = await res.text();

      expect(text).toContain(
        ".collapsible-block:has(>.collapsible-block-unfolded>.collapsible-block-content>.code){display:none!important}"
      );
    });
  });

  // ----------------------------------------------------------
  // block-left/block-right CSSオーバーライド
  // ----------------------------------------------------------
  describe("block-left/block-right CSSオーバーライド", () => {
    it("block-left/block-rightのfloat無効化CSSが注入される", async () => {
      const html = createWikidotHtml();
      global.fetch = vi.fn().mockResolvedValue(createHtmlResponse(html));

      const app = createApp();
      const res = await app.request("/wiki-proxy/scp-173");
      const text = await res.text();

      expect(text).toContain(".block-left");
      expect(text).toContain(".block-right");
      expect(text).toContain("float:none!important");
    });
  });

  // ----------------------------------------------------------
  // パスの大文字小文字正規化
  // ----------------------------------------------------------
  describe("パスの大文字小文字正規化", () => {
    it("大文字のarticle IDが小文字に正規化されてfetchされる", async () => {
      const html = createWikidotHtml({
        pageTitle: "SCP-2000",
        pageContent: "<p>SCP-2000</p>",
      });
      global.fetch = vi.fn().mockResolvedValue(createHtmlResponse(html));

      const app = createApp();
      const res = await app.request("/wiki-proxy/SCP-2000");

      expect(res.status).toBe(200);
      // 通常ページURL（printer--friendlyではない）で小文字にfetchされる
      expect(global.fetch).toHaveBeenCalledWith("http://scp-jp.wikidot.com/scp-2000");
    });

    it("混在ケース（Scp-173）も小文字に正規化される", async () => {
      const html = createWikidotHtml();
      global.fetch = vi.fn().mockResolvedValue(createHtmlResponse(html));

      const app = createApp();
      await app.request("/wiki-proxy/Scp-173");

      expect(global.fetch).toHaveBeenCalledWith("http://scp-jp.wikidot.com/scp-173");
    });

    it("既に小文字のパスはそのままfetchされる", async () => {
      const html = createWikidotHtml();
      global.fetch = vi.fn().mockResolvedValue(createHtmlResponse(html));

      const app = createApp();
      await app.request("/wiki-proxy/scp-173");

      expect(global.fetch).toHaveBeenCalledWith("http://scp-jp.wikidot.com/scp-173");
    });
  });

  // ----------------------------------------------------------
  // 通常ページ取得（printer--friendlyではない）
  // ----------------------------------------------------------
  describe("通常ページ取得", () => {
    it("printer--friendlyではなく通常ページURLでfetchされる", async () => {
      const html = createWikidotHtml();
      global.fetch = vi.fn().mockResolvedValue(createHtmlResponse(html));

      const app = createApp();
      await app.request("/wiki-proxy/scp-173");

      // printer--friendly/ がURLに含まれないことを確認
      const calledUrl = (global.fetch as ReturnType<typeof vi.fn>).mock.calls[0][0] as string;
      expect(calledUrl).not.toContain("printer--friendly");
      expect(calledUrl).toBe("http://scp-jp.wikidot.com/scp-173");
    });
  });

  // ----------------------------------------------------------
  // 記事固有CSS/JS保持
  // ----------------------------------------------------------
  describe("記事固有CSS/JS保持", () => {
    it("head内の記事固有CSSが出力HTMLに含まれる", async () => {
      const html = createWikidotHtml({
        headStyles: ["#page-content { background: #1a1a1a; color: #fff; }"],
      });
      global.fetch = vi.fn().mockResolvedValue(createHtmlResponse(html));

      const app = createApp();
      const res = await app.request("/wiki-proxy/scp-173");
      const text = await res.text();

      expect(text).toContain("background: #1a1a1a");
      expect(text).toContain("color: #fff");
    });

    it("記事固有のインラインJSが出力HTMLに含まれる", async () => {
      const html = createWikidotHtml({
        bodyScripts: [
          'document.querySelector(".reveal").addEventListener("click", function() { /* reveal */ });',
        ],
      });
      global.fetch = vi.fn().mockResolvedValue(createHtmlResponse(html));

      const app = createApp();
      const res = await app.request("/wiki-proxy/scp-173");
      const text = await res.text();

      expect(text).toContain('document.querySelector(".reveal")');
    });

    it("プラットフォームスクリプトは出力HTMLに含まれない", async () => {
      const html = createWikidotHtml({ platformScripts: true });
      global.fetch = vi.fn().mockResolvedValue(createHtmlResponse(html));

      const app = createApp();
      const res = await app.request("/wiki-proxy/scp-173");
      const text = await res.text();

      // WIKIDOT.combined.jsが除去されている
      expect(text).not.toContain("WIKIDOT.combined.js");
      // WIKIDOT.page = ... の初期化コードが除去されている
      expect(text).not.toContain("WIKIDOT.page = ");
    });
  });

  // ----------------------------------------------------------
  // エラーハンドリング
  // ----------------------------------------------------------
  describe("エラーハンドリング", () => {
    it("パスが指定されない場合、400エラーを返す", async () => {
      const app = createApp();
      const res = await app.request("/wiki-proxy/");

      expect(res.status).toBe(400);
    });

    it("fetchがエラーの場合、502を返す", async () => {
      global.fetch = vi.fn().mockRejectedValue(new Error("Network error"));

      const app = createApp();
      const res = await app.request("/wiki-proxy/scp-173");

      expect(res.status).toBe(502);
    });
  });

  // ----------------------------------------------------------
  // basePath経由のルーティング（Next.js API Route相当）
  // ----------------------------------------------------------
  describe("basePath経由のルーティング（Next.js API Route相当）", () => {
    function createAppWithBasePath() {
      return new Hono()
        .basePath("/api")
        .route("/", new Hono().route("/wiki-proxy", wikiProxyRoutes));
    }

    it("basePath付きでもコンテンツが返される", async () => {
      const html = createWikidotHtml({
        pageTitle: "SCP-173",
        pageContent: "<p>SCP-173 content</p>",
      });
      global.fetch = vi.fn().mockResolvedValue(createHtmlResponse(html));

      const app = createAppWithBasePath();
      const res = await app.request("/api/wiki-proxy/scp-173");
      const text = await res.text();

      expect(res.status).toBe(200);
      expect(text).toContain("SCP-173");
      expect(text).toContain("<style>");
      expect(text).toContain("<script>");

      // 通常ページURLでfetchされる
      expect(global.fetch).toHaveBeenCalledWith("http://scp-jp.wikidot.com/scp-173");
    });

    it("basePath付きでも絶対パスリンクが正しく書き換えられる", async () => {
      const html = createWikidotHtml({
        pageContent: '<a href="/scp-682">SCP-682</a>',
      });
      global.fetch = vi.fn().mockResolvedValue(createHtmlResponse(html));

      const app = createAppWithBasePath();
      const res = await app.request("/api/wiki-proxy/scp-173");
      const text = await res.text();

      expect(text).toContain('href="/api/wiki-proxy/scp-682"');
    });

    it("basePath付きでパスが空の場合、400エラーを返す", async () => {
      const app = createAppWithBasePath();
      const res = await app.request("/api/wiki-proxy/");

      expect(res.status).toBe(400);
    });
  });

  // ----------------------------------------------------------
  // rewriteUrls 単体テスト
  // ----------------------------------------------------------
  describe("rewriteUrls 単体テスト", () => {
    it("フルURL書き換えとCloudFront変換を同時に処理する", () => {
      const html = [
        '<a href="http://scp-jp.wikidot.com/scp-999">link</a>',
        '<link href="http://d3g0gp89917ko0.cloudfront.net/v--abc/style.css">',
      ].join("");

      const result = rewriteUrls(html);

      expect(result).toContain('href="/api/wiki-proxy/scp-999"');
      expect(result).toContain("https://d3g0gp89917ko0.cloudfront.net/");
    });
  });
});
